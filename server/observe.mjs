/**
 * The observe port: an Ollama look-alike that forwards everything to the real
 * daemon and records each model turn that passes through. Point any client at
 * it instead of :11434 and the Live page sees the traffic.
 *
 * Nothing is written anywhere unless `keepText` is on, and then only to a file
 * under the user's home directory. Metrics live in memory for the session.
 */
import http from 'node:http'
import { URL } from 'node:url'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import {
  classifyPath,
  identifyClient,
  anatomy,
  prefixBreak,
  breakSnippet,
  parseResponse,
  rates,
  createTurnLog,
} from './observe-core.mjs'

const MAX_RECORDED_RESPONSE = 16 * 1024 * 1024
const TEXT_DIR = join(os.homedir(), '.llmxray', 'observe')

export function createObserver({ ollamaUrl, port = 11435, host = '0.0.0.0', keepText = false, capacity = 500 } = {}) {
  const target = new URL(ollamaUrl ?? 'http://localhost:11434')
  const log = createTurnLog(capacity)
  const state = { keepText: Boolean(keepText), port, host, listening: false, error: null, ollamaUrl: target.origin, startedAt: Date.now() }
  /** Last known load facts per model, refreshed from /api/ps after a turn. */
  const fitByModel = new Map()
  let psTimer = null

  async function refreshFit() {
    try {
      const res = await fetch(new URL('/api/ps', target))
      if (!res.ok) return
      const data = await res.json()
      for (const m of data.models ?? []) {
        const size = m.size ?? 0
        const vram = m.size_vram ?? 0
        fitByModel.set(m.name, {
          contextLength: m.context_length ?? null,
          size,
          sizeVram: vram,
          cpuShare: size > 0 ? Math.max(0, (size - vram) / size) : null,
          runner: m.runner ?? null,
        })
        if (m.model && m.model !== m.name) fitByModel.set(m.model, fitByModel.get(m.name))
      }
    } catch {
      /* daemon unreachable: fit stays unknown */
    }
  }

  function scheduleFit() {
    clearTimeout(psTimer)
    psTimer = setTimeout(async () => {
      await refreshFit()
      // Debounced, so several quick turns share one refresh: attach the load
      // facts to EVERY recorded turn still missing them, not just the last one.
      for (const turn of log.all()) {
        if (turn.fit) continue
        const fit = fitByModel.get(turn.model)
        if (!fit) continue
        turn.fit = fit
        for (const fn of listeners) fn({ type: 'update', turn })
      }
    }, 400)
  }

  const listeners = new Set()
  log.subscribe((turn) => {
    for (const fn of listeners) fn({ type: 'turn', turn })
  })

  async function persistText(turn, body, canonical, snippet) {
    try {
      await mkdir(TEXT_DIR, { recursive: true })
      const day = new Date(turn.at).toISOString().slice(0, 10)
      const line = JSON.stringify({ id: turn.id, at: turn.at, client: turn.client.label, model: turn.model, protocol: turn.protocol, request: body, canonical, snippet })
      await appendFile(join(TEXT_DIR, `${day}.jsonl`), line + '\n')
    } catch {
      /* a full disk must never break the proxy */
    }
  }

  /** In-memory text for the session when keepText is on; keyed by turn id. */
  const textById = new Map()

  function record({ cls, headers, bodyText, responseText, status, startedAt, path }) {
    let body = null
    try {
      body = JSON.parse(bodyText)
    } catch {
      body = null
    }
    const client = identifyClient(headers, body)
    const model = body?.model ?? 'unknown'
    const shape = anatomy(body, cls.protocol)
    const parsed = parseResponse(cls.protocol, responseText)
    const derived = rates(parsed)
    const key = `${client.id}|${model}`
    const prev = log.previousCanonical(key)
    const brk = prefixBreak(prev, shape.canonical, parsed?.promptTokens ?? null)
    log.rememberCanonical(key, shape.canonical)

    const mode = cls.kind === 'chat' ? (shape.toolsOffered > 0 ? 'agent' : 'chat') : cls.kind
    const turn = {
      id: randomUUID(),
      seq: log.nextSeq(),
      at: startedAt,
      durationMs: Date.now() - startedAt,
      path,
      protocol: cls.protocol,
      mode,
      client,
      model,
      stream: body?.stream !== false,
      status,
      error: parsed?.error ?? (status >= 400 ? `HTTP ${status}` : null),
      contextExceeded: parsed?.contextExceeded ?? null,
      prompt: {
        tokens: parsed?.promptTokens ?? null,
        cached: parsed?.cachedTokens ?? null,
        evaluated: derived.evaluated,
        prefillMs: parsed?.prefillMs ?? null,
        prefillTps: derived.prefillTps,
        contextRequested: body?.options?.num_ctx ?? null,
      },
      gen: {
        tokens: parsed?.evalTokens ?? null,
        ms: parsed?.evalMs ?? null,
        tps: derived.genTps,
        doneReason: parsed?.doneReason ?? null,
      },
      toolCalls: parsed?.toolCalls ?? [],
      toolsOffered: shape.toolsOffered,
      toolNames: shape.toolNames,
      anatomy: {
        systemChars: shape.systemChars,
        toolsChars: shape.toolsChars,
        historyChars: shape.historyChars,
        messageChars: shape.messageChars,
        totalChars: shape.totalChars,
        messages: shape.messages,
      },
      prefix: brk,
      // Filled by the /api/ps refresh that FOLLOWS this turn, never from an
      // earlier snapshot: the context may have been changed between turns.
      fit: null,
      textKept: state.keepText,
    }

    if (state.keepText) {
      const snippet = brk && !brk.identical ? breakSnippet(shape.canonical, brk.breakChar) : null
      textById.set(turn.id, { request: body, canonical: shape.canonical, snippet })
      if (textById.size > capacity) textById.delete(textById.keys().next().value)
      void persistText(turn, body, shape.canonical, snippet)
    }

    log.push(turn)
    scheduleFit()
    return turn
  }

  const server = http.createServer((req, res) => {
    const cls = classifyPath(req.method, req.url ?? '/')
    const startedAt = Date.now()
    const upstreamHeaders = { ...req.headers, host: target.host }

    const forward = (bodyBuffer) => {
      const options = {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 80,
        method: req.method,
        path: req.url,
        headers: upstreamHeaders,
      }
      const upstream = http.request(options, (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers)
        if (!cls) {
          up.pipe(res)
          return
        }
        const chunks = []
        let collected = 0
        up.on('data', (chunk) => {
          res.write(chunk)
          if (collected < MAX_RECORDED_RESPONSE) {
            chunks.push(chunk)
            collected += chunk.length
          }
        })
        up.on('end', () => {
          res.end()
          const responseText = Buffer.concat(chunks).toString('utf8')
          try {
            record({ cls, headers: req.headers, bodyText: bodyBuffer.toString('utf8'), responseText, status: up.statusCode ?? 0, startedAt, path: req.url })
          } catch {
            /* recording must never affect the client */
          }
        })
        up.on('error', () => res.destroy())
      })
      upstream.on('error', (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'application/json' })
        }
        res.end(JSON.stringify({ error: `LLMxRay could not reach Ollama at ${target.origin}: ${err.message}` }))
      })
      req.on('aborted', () => upstream.destroy())
      if (bodyBuffer) upstream.end(bodyBuffer)
      else req.pipe(upstream)
    }

    if (!cls) {
      forward(null)
      return
    }
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => forward(Buffer.concat(chunks)))
  })

  function listenOnce() {
    return new Promise((resolve, reject) => {
      const onError = (err) => reject(err)
      server.once('error', onError)
      server.listen(port, host, () => {
        server.off('error', onError)
        state.port = server.address().port
        state.listening = true
        state.error = null
        resolve(state.port)
      })
    })
  }

  /**
   * Open the port, retrying while it is still held by a process that is on its
   * way out (a dev server restart, a previous LLMxRay). Any other error is
   * final.
   */
  async function listen({ retries = 10, delayMs = 1000 } = {}) {
    if (state.listening) return state.port
    for (let attempt = 0; ; attempt++) {
      try {
        return await listenOnce()
      } catch (err) {
        state.error = err.code === 'EADDRINUSE' ? `port ${port} is already in use` : err.message
        if (err.code !== 'EADDRINUSE' || attempt >= retries) throw err
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
  }

  function close() {
    clearTimeout(psTimer)
    return new Promise((resolve) => server.close(() => resolve()))
  }

  return {
    state,
    log,
    listen,
    close,
    refreshFit,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    setKeepText(v) {
      state.keepText = Boolean(v)
      if (!state.keepText) textById.clear()
    },
    textFor(id) {
      return textById.get(id) ?? null
    },
    clear() {
      log.clear()
      textById.clear()
    },
    textDir: TEXT_DIR,
  }
}

/** Read a JSON body from a raw Node request. */
async function readJson(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/**
 * Routes under /__observe for the Live page. Framework-agnostic so the same
 * handler mounts on Express (npx / Docker) and on Vite's connect server (dev).
 * `req.url` is expected relative to the mount point.
 */
export function createObserveHandler(observer) {
  return async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://local')
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const method = req.method ?? 'GET'

    try {
      if (method === 'GET' && path === '/status') {
        return sendJson(res, 200, { ...observer.state, turns: observer.log.size, textDir: observer.textDir })
      }
      if (method === 'GET' && path === '/turns') {
        const since = Number(url.searchParams.get('since') ?? 0)
        return sendJson(res, 200, { turns: observer.log.since(since) })
      }
      if (method === 'GET' && path.startsWith('/turns/') && path.endsWith('/text')) {
        const id = path.slice('/turns/'.length, -'/text'.length)
        const text = observer.textFor(id)
        return text ? sendJson(res, 200, text) : sendJson(res, 404, { error: 'No text kept for this turn' })
      }
      if (method === 'GET' && path === '/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        res.write(`event: status\ndata: ${JSON.stringify({ ...observer.state, turns: observer.log.size })}\n\n`)
        const unsubscribe = observer.subscribe((evt) => {
          res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt.turn)}\n\n`)
        })
        const ping = setInterval(() => res.write(': ping\n\n'), 15_000)
        req.on('close', () => {
          clearInterval(ping)
          unsubscribe()
        })
        return
      }
      if (method === 'POST' && path === '/settings') {
        const body = await readJson(req)
        if (typeof body.keepText === 'boolean') observer.setKeepText(body.keepText)
        return sendJson(res, 200, observer.state)
      }
      if (method === 'POST' && path === '/listen') {
        try {
          await observer.listen({ retries: 2, delayMs: 500 })
        } catch {
          /* state.error carries the reason */
        }
        return sendJson(res, observer.state.listening ? 200 : 409, observer.state)
      }
      if (method === 'POST' && path === '/clear') {
        observer.clear()
        return sendJson(res, 200, { ok: true })
      }
      return sendJson(res, 404, { error: 'Not found' })
    } catch (e) {
      return sendJson(res, 500, { error: e.message })
    }
  }
}
