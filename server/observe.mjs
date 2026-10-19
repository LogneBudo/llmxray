/**
 * The observe port: an Ollama look-alike that forwards everything to the real
 * daemon and records each model turn that passes through. Point any client at
 * it instead of :11434 and the Live page sees the traffic.
 *
 * Each turn's record (counts, timings, client, model; never the prompt text) is
 * appended to a dated file under ~/.llmxray/observe, so a restart picks up where
 * it left off. The prompt text is written beside it only while `keepText` is on.
 * Files older than `retentionDays` are deleted at start; Clear deletes them all.
 * Nothing leaves this machine.
 */
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import { appendFile, mkdir } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
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
const DATA_DIR = process.env.LLMXRAY_DATA_DIR
  ? join(process.env.LLMXRAY_DATA_DIR, 'observe')
  : join(os.homedir(), '.llmxray', 'observe')
const DAY_MS = 86_400_000
/** turns-2026-10-19.jsonl holds records; 2026-10-19.jsonl holds kept text. */
const TURNS_FILE = /^turns-(\d{4}-\d{2}-\d{2})\.jsonl$/
const TEXT_FILE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/

/** Every line of a JSONL file that parses; a torn last line from a crash is skipped. */
function readJsonl(file) {
  const out = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      /* torn or foreign line */
    }
  }
  return out
}

export function createObserver({
  ollamaUrl,
  port = 11435,
  host = '127.0.0.1',
  keepText = false,
  capacity = 500,
  dataDir = DATA_DIR,
  retentionDays = 30,
} = {}) {
  const target = new URL(ollamaUrl ?? 'http://localhost:11434')
  const log = createTurnLog(capacity)
  const state = {
    keepText: Boolean(keepText),
    port,
    host,
    listening: false,
    error: null,
    ollamaUrl: target.origin,
    startedAt: Date.now(),
    retentionDays,
    restored: 0,
  }
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
        void persistTurn(turn)
        for (const fn of listeners) fn({ type: 'update', turn })
      }
    }, 400)
  }

  const listeners = new Set()
  log.subscribe((turn) => {
    for (const fn of listeners) fn({ type: 'turn', turn })
  })

  // Writes go one after another, so a record and its later update land in order.
  let writes = Promise.resolve()
  function append(file, line) {
    writes = writes
      .then(async () => {
        await mkdir(dataDir, { recursive: true })
        await appendFile(join(dataDir, file), line + '\n')
      })
      .catch(() => {
        /* a full disk must never break the proxy */
      })
    return writes
  }

  const dayOf = (at) => new Date(at).toISOString().slice(0, 10)

  /** The record again after each change (the load facts arrive later); on reading, the last line per id wins. */
  function persistTurn(turn) {
    return append(`turns-${dayOf(turn.at)}.jsonl`, JSON.stringify(turn))
  }

  function persistText(turn, body, canonical, snippet, answer) {
    const line = JSON.stringify({ id: turn.id, at: turn.at, client: turn.client.label, model: turn.model, protocol: turn.protocol, request: body, canonical, snippet, answer })
    return append(`${dayOf(turn.at)}.jsonl`, line)
  }

  /** In-memory text for kept turns, keyed by turn id; refilled from disk at start. */
  const textById = new Map()

  function files() {
    try {
      return readdirSync(dataDir)
    } catch {
      return []
    }
  }

  /** Deletes record and text files older than the retention, by the date in their name. */
  function prune(now = Date.now()) {
    const oldest = dayOf(now - retentionDays * DAY_MS)
    for (const name of files()) {
      const day = (TURNS_FILE.exec(name) ?? TEXT_FILE.exec(name))?.[1]
      if (day && day < oldest) rmSync(join(dataDir, name), { force: true })
    }
  }

  /** Puts the newest kept turns back, with their text when it was kept. Runs once, before listening. */
  function restore() {
    const byId = new Map()
    const recordFiles = files().filter((n) => TURNS_FILE.test(n)).sort()
    for (const name of recordFiles) for (const t of readJsonl(join(dataDir, name))) if (t?.id) byId.set(t.id, t)
    const turns = [...byId.values()].sort((a, b) => a.seq - b.seq || a.at - b.at).slice(-capacity)
    if (!turns.length) return
    const wanted = new Map(turns.filter((t) => t.textKept).map((t) => [t.id, t]))
    for (const day of [...new Set([...wanted.values()].map((t) => dayOf(t.at)))]) {
      const file = join(dataDir, `${day}.jsonl`)
      if (!existsSync(file)) continue
      for (const x of readJsonl(file)) {
        if (!wanted.has(x.id)) continue
        textById.set(x.id, { request: x.request, canonical: x.canonical, snippet: x.snippet, answer: x.answer })
      }
    }
    log.restore(turns)
    // The prefix diff carries on across the restart for clients whose text was kept.
    for (const t of turns) {
      const text = textById.get(t.id)
      if (text?.canonical) log.rememberCanonical(`${t.client.id}|${t.model}`, text.canonical)
    }
    state.restored = turns.length
  }

  prune()
  restore()
  // A server left running for weeks still drops files as they pass the retention.
  const pruneTimer = setInterval(() => prune(), DAY_MS)
  pruneTimer.unref?.()

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
      /** What the request asked the daemon to do with the model afterwards; 0 unloads it for everyone. */
      keepAlive: body?.keep_alive ?? null,
      /** The daemon's own total for this request (load + prompt + generation), when it said. */
      totalMs: parsed?.totalMs ?? null,
      /** Time the request spent waiting before the daemon worked on it: ours minus the daemon's. An estimate. */
      queueMs: parsed?.totalMs != null ? Math.max(0, Date.now() - startedAt - parsed.totalMs) : null,
      status,
      error: parsed?.error ?? (status === 499 ? 'cancelled by the client before the answer finished' : status >= 400 ? `HTTP ${status}` : null),
      contextExceeded: parsed?.contextExceeded ?? null,
      /** Time the daemon spent loading the model for this turn; a reload explains an empty cache. */
      loadMs: parsed?.loadMs ?? null,
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
      // The answer completes the round: what was sent and what came back, for the Runs page.
      const answer = parsed?.answer ?? null
      textById.set(turn.id, { request: body, canonical: shape.canonical, snippet, answer })
      if (textById.size > capacity) textById.delete(textById.keys().next().value)
      void persistText(turn, body, shape.canonical, snippet, answer)
    }

    log.push(turn)
    void persistTurn(turn)
    scheduleFit()
    return turn
  }

  const server = http.createServer((req, res) => {
    // ?client=name on the URL is ours, not Ollama's: lift it into the header and drop it.
    const reqUrl = new URL(req.url ?? '/', 'http://local')
    const clientParam = reqUrl.searchParams.get('client')
    if (clientParam) {
      reqUrl.searchParams.delete('client')
      req.url = reqUrl.pathname + (reqUrl.searchParams.size ? `?${reqUrl.searchParams}` : '')
      if (!req.headers['x-llmxray-client']) req.headers['x-llmxray-client'] = clientParam
    }
    const cls = classifyPath(req.method, req.url ?? '/')
    const startedAt = Date.now()
    const upstreamHeaders = { ...req.headers, host: target.host }
    delete upstreamHeaders['x-llmxray-client']

    const forward = (bodyBuffer) => {
      const secure = target.protocol === 'https:'
      const options = {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (secure ? 443 : 80),
        method: req.method,
        path: req.url,
        headers: upstreamHeaders,
      }
      const failUpstream = (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'application/json' })
        }
        res.end(JSON.stringify({ error: `LLMxRay could not reach Ollama at ${target.origin}: ${err.message}` }))
      }
      const chunks = []
      let collected = 0
      let finished = false
      let cancelled = false
      const recordTurn = (status) => {
        if (!cls || finished) return
        finished = true
        const responseText = Buffer.concat(chunks).toString('utf8')
        try {
          record({ cls, headers: req.headers, bodyText: bodyBuffer.toString('utf8'), responseText, status, startedAt, path: req.url })
        } catch {
          /* recording must never affect the client */
        }
      }
      let upstream
      try {
        // https targets go through the https module; http.request refuses them outright.
        upstream = (secure ? https : http).request(options, (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers)
          if (!cls) {
            up.pipe(res)
            return
          }
          up.on('data', (chunk) => {
            res.write(chunk)
            if (collected < MAX_RECORDED_RESPONSE) {
              chunks.push(chunk)
              collected += chunk.length
            }
          })
          up.on('end', () => {
            res.end()
            recordTurn(up.statusCode ?? 0)
          })
          up.on('close', () => {
            // The client went away mid-stream: the turn is recorded as cancelled, with what
            // the daemon had produced so far, never as a clean stop.
            if (cancelled) recordTurn(499)
          })
          up.on('error', () => res.destroy())
        })
      } catch (err) {
        failUpstream(err)
        return
      }
      upstream.on('error', failUpstream)
      // 'aborted' only fires for an incomplete request body. A client that disconnects while
      // the answer streams shows up as 'close' on the response before it is finished.
      res.on('close', () => {
        if (res.writableFinished) return
        cancelled = true
        upstream.destroy()
      })
      req.on('aborted', () => {
        cancelled = true
        upstream.destroy()
      })
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
    clearInterval(pruneTimer)
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
    /** Forgets every turn: in memory, and every record and text file on disk. */
    async clear() {
      log.clear()
      textById.clear()
      await writes
      for (const name of files()) if (TURNS_FILE.test(name) || TEXT_FILE.test(name)) rmSync(join(dataDir, name), { force: true })
    },
    /** Resolves once every pending write has reached the disk. */
    flush() {
      return writes
    },
    prune,
    textDir: dataDir,
  }
}

/** Read a JSON body from a raw Node request. */
async function readJson(req) {
  // Only a JSON body counts. A cross-site form or text/plain POST, which browsers send
  // without a preflight, must not be able to flip settings or clear the log.
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) return {}
  // Behind Express the body parser has already read the stream; take its result.
  if (req.body && typeof req.body === 'object') return req.body
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
export function createObserveHandler(observer, { exporter = null } = {}) {
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
      if (exporter && method === 'GET' && path === '/export') {
        return sendJson(res, 200, exporter.view())
      }
      if (exporter && method === 'POST' && path === '/export') {
        return sendJson(res, 200, await exporter.update(await readJson(req)))
      }
      if (exporter && method === 'POST' && path === '/export/test') {
        // JSON only, like every POST here, so a cross-site page cannot make the server send.
        if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) return sendJson(res, 415, { error: 'JSON only' })
        return sendJson(res, 200, await exporter.test())
      }
      if (method === 'POST' && path === '/clear') {
        // Clear deletes files on disk: JSON only, so a cross-site page cannot send it.
        if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) return sendJson(res, 415, { error: 'JSON only' })
        await observer.clear()
        return sendJson(res, 200, { ok: true })
      }
      return sendJson(res, 404, { error: 'Not found' })
    } catch (e) {
      return sendJson(res, 500, { error: e.message })
    }
  }
}
