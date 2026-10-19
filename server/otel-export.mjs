/**
 * Sends each turn the observe port records to an OpenTelemetry collector, as one span
 * per model call and one trace per run, in OTLP/HTTP protobuf. Nothing is sent until an
 * address is set, on the Live page or through the standard OTEL_EXPORTER_OTLP_* settings.
 *
 * Attribute names follow the OpenTelemetry GenAI conventions (gen_ai.*), so trace viewers
 * read the model and token counts as their own; what only LLMxRay knows goes under llmxray.*.
 * The prompt text goes along only when Keep text is on AND "include text" is switched on.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { encodeTraces } from './otlp-proto.mjs'
import os from 'node:os'

/** Same rule as the Runs page: a pause longer than this starts a new run. */
export const RUN_GAP_MS = 2 * 60_000
const FLUSH_MS = 1000
/** The load facts arrive about 400 ms after a turn; a turn waits this long for them at most. */
const FIT_WAIT_MS = 1500

const BASE_DIR = process.env.LLMXRAY_DATA_DIR ?? join(os.homedir(), '.llmxray')
export const CONFIG_FILE = join(BASE_DIR, 'export.json')

const OPERATION = { chat: 'chat', agent: 'chat', completion: 'text_completion', embedding: 'embeddings' }
// OTLP span kinds and status codes.
const KIND_INTERNAL = 1
const KIND_CLIENT = 3
const STATUS_ERROR = 2

const hex = (bytes) => randomBytes(bytes).toString('hex')
const nanos = (ms) => String(BigInt(Math.round(ms)) * 1_000_000n)

/** An OTLP attribute, typed the way the JSON encoding wants it; null and undefined are left out. */
function attr(key, value) {
  if (value == null) return null
  if (typeof value === 'boolean') return { key, value: { boolValue: value } }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { key, value: { intValue: String(value) } } : { key, value: { doubleValue: value } }
  }
  if (Array.isArray(value)) return { key, value: { arrayValue: { values: value.map((v) => ({ stringValue: String(v) })) } } }
  return { key, value: { stringValue: String(value) } }
}
const attrs = (pairs) => pairs.map(([k, v]) => attr(k, v)).filter(Boolean)

/** The observer keeps a turn's tool calls as names; a full call object is read too. */
const toolName = (c) => (typeof c === 'string' ? c : c?.name ?? c?.function?.name ?? '?')

/** "Name: value" lines, as typed on the Live page, into a header map. */
export function parseHeaderLines(text) {
  const out = {}
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const name = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()
    if (name && value) out[name] = value
  }
  return out
}

/** OTEL_EXPORTER_OTLP_HEADERS is "name=value,name=value", values URL-encoded. */
export function parseEnvHeaders(text) {
  const out = {}
  for (const part of String(text ?? '').split(',')) {
    const i = part.indexOf('=')
    if (i <= 0) continue
    out[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

/** Where spans are POSTed: the collector address plus /v1/traces, unless it already ends so. */
export function tracesUrl(address) {
  const base = String(address ?? '').trim().replace(/\/+$/, '')
  if (!base) return null
  return /\/v1\/traces$/.test(base) ? base : `${base}/v1/traces`
}

/** The span of one model call. `text` is passed only when it may be sent. */
export function turnSpan(turn, { traceId, parentSpanId, text = null }) {
  const operation = OPERATION[turn.mode] ?? 'chat'
  const promptTokens = turn.prompt?.tokens ?? null
  const cached = turn.prompt?.cached ?? null
  const cut = turn.gen?.doneReason === 'truncated' || turn.contextExceeded === true
  const pairs = [
    ['gen_ai.operation.name', operation],
    ['gen_ai.provider.name', 'ollama'],
    ['gen_ai.system', 'ollama'],
    ['gen_ai.request.model', turn.model],
    ['gen_ai.response.model', turn.model],
    ['gen_ai.usage.input_tokens', promptTokens],
    ['gen_ai.usage.output_tokens', turn.gen?.tokens ?? null],
    ['gen_ai.response.finish_reasons', turn.gen?.doneReason ? [turn.gen.doneReason] : null],
    ['llmxray.client', turn.client?.label],
    ['llmxray.protocol', turn.protocol],
    ['llmxray.turn', turn.seq],
    ['llmxray.cached_tokens', cached],
    ['llmxray.cached_share', promptTokens && cached != null ? Math.round((cached / promptTokens) * 1000) / 1000 : null],
    ['llmxray.prefill_ms', turn.prompt?.prefillMs ?? null],
    ['llmxray.load_ms', turn.loadMs ?? null],
    ['llmxray.queue_ms', turn.queueMs ?? null],
    ['llmxray.context_requested', turn.prompt?.contextRequested ?? null],
    ['llmxray.context_loaded', turn.fit?.contextLength ?? null],
    ['llmxray.prompt_cut', cut],
    ['llmxray.cpu_share', turn.fit?.cpuShare != null ? Math.round(turn.fit.cpuShare * 1000) / 1000 : null],
    ['llmxray.tools_offered', turn.toolsOffered ?? null],
    ['llmxray.tool_calls', turn.toolCalls?.length ? turn.toolCalls.map(toolName) : null],
    ['error.type', turn.error ? String(turn.error).slice(0, 200) : null],
  ]
  if (text) {
    const req = text.request ?? {}
    const input = req.messages ?? (req.prompt != null ? [{ role: 'user', content: req.prompt }] : [])
    pairs.push(['gen_ai.input.messages', JSON.stringify(input)])
    if (text.answer) {
      pairs.push(['gen_ai.output.messages', JSON.stringify([{ role: 'assistant', content: text.answer.content ?? '', tool_calls: text.answer.toolCalls ?? [] }])])
    }
  }
  return {
    traceId,
    spanId: hex(8),
    ...(parentSpanId ? { parentSpanId } : {}),
    name: `${operation} ${turn.model}`,
    kind: KIND_CLIENT,
    startTimeUnixNano: nanos(turn.at),
    endTimeUnixNano: nanos(turn.at + (turn.durationMs ?? 0)),
    attributes: attrs(pairs),
    status: turn.error ? { code: STATUS_ERROR, message: String(turn.error).slice(0, 200) } : {},
  }
}

/** The time between two calls of a run: the tools the model asked for, or the agent's own work. */
export function gapSpan(prev, next, { traceId, parentSpanId }) {
  const names = (prev.toolCalls ?? []).map(toolName).filter((n) => n !== '?')
  return {
    traceId,
    spanId: hex(8),
    parentSpanId,
    name: names.length ? `tools ${names.join(', ')}` : 'agent',
    kind: KIND_INTERNAL,
    startTimeUnixNano: nanos(prev.at + (prev.durationMs ?? 0)),
    endTimeUnixNano: nanos(next.at),
    attributes: attrs([
      ['llmxray.client', next.client?.label],
      ['llmxray.gap', names.length ? 'tools' : 'agent'],
    ]),
    status: {},
  }
}

export function payload(spans, version) {
  return {
    resourceSpans: [
      {
        resource: { attributes: attrs([['service.name', 'llmxray'], ['service.version', version], ['telemetry.sdk.name', 'llmxray']]) },
        scopeSpans: [{ scope: { name: 'llmxray', version }, spans }],
      },
    ],
  }
}

/** The settings from the environment, the standard OTel ones, when nothing was saved on the Live page. */
function fromEnv(env) {
  const full = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  const base = env.OTEL_EXPORTER_OTLP_ENDPOINT
  const address = full || base || ''
  if (!address) return null
  const headers = parseEnvHeaders(env.OTEL_EXPORTER_OTLP_TRACES_HEADERS ?? env.OTEL_EXPORTER_OTLP_HEADERS)
  return { address, headers, includeText: false, enabled: true, source: 'env' }
}

/**
 * The exporter. `observer` is the observe port's (createObserver), `fetchImpl` lets tests
 * stand in for the network, `configFile` is where the Live page's settings are kept.
 */
export function createOtelExporter({ observer, version = '0.0.0', configFile = CONFIG_FILE, env = process.env, fetchImpl = fetch } = {}) {
  let config = { address: '', headers: {}, includeText: false, enabled: false, source: 'none' }
  try {
    if (existsSync(configFile)) config = { ...config, ...JSON.parse(readFileSync(configFile, 'utf8')), source: 'file' }
    else config = { ...config, ...(fromEnv(env) ?? {}) }
  } catch {
    /* an unreadable file leaves export off */
  }

  const status = { sent: 0, runs: 0, failed: 0, lastSentAt: null, lastError: null, failing: false }
  let queue = []
  const runs = new Map() // client id -> { traceId, rootSpanId, first, last, calls, timer }
  const waiting = new Map() // turn id -> timer, until its load facts arrive
  let flushTimer = null

  const active = () => config.enabled && Boolean(tracesUrl(config.address))

  async function post(spans) {
    const url = tracesUrl(config.address)
    const res = await fetchImpl(url, {
      method: 'POST',
      // Protobuf, the OTLP/HTTP default: every collector takes it, and some (Phoenix) only it.
      headers: { 'content-type': 'application/x-protobuf', ...config.headers },
      body: encodeTraces(payload(spans, version)),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`)
    }
  }

  // Sends go one after another; flush() resolves once everything queued so far has been tried.
  let sending = Promise.resolve()
  function flush() {
    clearTimeout(flushTimer)
    flushTimer = null
    sending = sending.then(sendQueued)
    return sending
  }

  async function sendQueued() {
    if (!queue.length) return
    const spans = queue
    queue = []
    try {
      await post(spans)
      status.sent += spans.filter((s) => s.kind === KIND_CLIENT).length
      status.lastSentAt = Date.now()
      status.failing = false
      status.lastError = null
    } catch (err) {
      // Nothing is held back for later: the next turn simply tries again.
      status.failed += spans.filter((s) => s.kind === KIND_CLIENT).length
      status.failing = true
      status.lastError = err.cause?.code ?? err.cause?.message ?? err.message
    }
  }

  function enqueue(span) {
    queue.push(span)
    if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS)
  }

  function closeRun(clientId) {
    const run = runs.get(clientId)
    if (!run) return
    clearTimeout(run.timer)
    runs.delete(clientId)
    if (!active()) return
    enqueue({
      traceId: run.traceId,
      spanId: run.rootSpanId,
      name: `run ${run.first.client?.label ?? 'client'}`,
      kind: KIND_INTERNAL,
      startTimeUnixNano: nanos(run.first.at),
      endTimeUnixNano: nanos(run.last.at + (run.last.durationMs ?? 0)),
      attributes: attrs([
        ['llmxray.client', run.first.client?.label],
        ['llmxray.run.calls', run.calls],
        ['gen_ai.provider.name', 'ollama'],
      ]),
      status: {},
    })
    status.runs += 1
  }

  function exportTurn(turn) {
    waiting.delete(turn.id)
    if (!active()) return
    const key = turn.client?.id ?? 'unknown'
    let run = runs.get(key)
    if (run && turn.at - (run.last.at + (run.last.durationMs ?? 0)) > RUN_GAP_MS) {
      closeRun(key)
      run = null
    }
    if (!run) {
      run = { traceId: hex(16), rootSpanId: hex(8), first: turn, last: null, calls: 0, timer: null }
      runs.set(key, run)
    } else {
      enqueue(gapSpan(run.last, turn, { traceId: run.traceId, parentSpanId: run.rootSpanId }))
    }
    const kept = config.includeText && turn.textKept ? observer?.textFor?.(turn.id) : null
    enqueue(turnSpan(turn, { traceId: run.traceId, parentSpanId: run.rootSpanId, text: kept }))
    run.last = turn
    run.calls += 1
    clearTimeout(run.timer)
    run.timer = setTimeout(() => closeRun(key), RUN_GAP_MS)
    run.timer.unref?.()
  }

  const unsubscribe = observer?.subscribe?.((evt) => {
    if (!active()) return
    const turn = evt.turn
    if (evt.type === 'turn') {
      // Wait for the load facts, which follow the turn, so the span carries them.
      const timer = setTimeout(() => exportTurn(turn), FIT_WAIT_MS)
      timer.unref?.()
      waiting.set(turn.id, { timer, turn })
    } else if (evt.type === 'update' && waiting.has(turn.id)) {
      clearTimeout(waiting.get(turn.id).timer)
      exportTurn(turn)
    }
  })

  function save() {
    mkdirSync(dirname(configFile), { recursive: true })
    const { address, headers, includeText, enabled } = config
    writeFileSync(configFile, JSON.stringify({ address, headers, includeText, enabled }, null, 2) + '\n', { mode: 0o600 })
    config.source = 'file'
  }

  return {
    /** What the Live page shows: the settings (headers by name only) and how sending goes. */
    view() {
      return {
        address: config.address,
        headerNames: Object.keys(config.headers ?? {}),
        includeText: config.includeText,
        enabled: config.enabled,
        source: config.source,
        url: tracesUrl(config.address),
        state: !active() ? 'off' : status.failing ? 'failing' : 'sending',
        ...status,
        // Runs still open count too: their spans are out, only the run's own span waits for its end.
        runs: status.runs + runs.size,
      }
    },
    /** Applies a change from the Live page and keeps it in the config file. */
    async update(change = {}) {
      // A new address, or stopping, ends the open runs where their calls went, first.
      const moving = typeof change.address === 'string' && tracesUrl(change.address) !== tracesUrl(config.address)
      if (active() && (moving || change.enabled === false)) {
        for (const key of [...runs.keys()]) closeRun(key)
        await flush()
      }
      if (typeof change.address === 'string') config.address = change.address.trim()
      if (typeof change.headers === 'string') config.headers = parseHeaderLines(change.headers)
      if (typeof change.includeText === 'boolean') config.includeText = change.includeText
      if (typeof change.enabled === 'boolean') config.enabled = change.enabled
      if (!active()) {
        for (const key of [...runs.keys()]) closeRun(key)
        queue = []
        status.failing = false
        status.lastError = null
      }
      save()
      return this.view()
    },
    /** One span, sent now, so the person sees it arrive in their viewer. */
    async test() {
      const url = tracesUrl(config.address)
      if (!url) return { ok: false, error: 'no address' }
      const now = Date.now()
      const span = {
        traceId: hex(16),
        spanId: hex(8),
        name: 'llmxray test span',
        kind: KIND_INTERNAL,
        startTimeUnixNano: nanos(now - 5),
        endTimeUnixNano: nanos(now),
        attributes: attrs([['llmxray.test', true]]),
        status: {},
      }
      try {
        await post([span])
        return { ok: true, url }
      } catch (err) {
        return { ok: false, url, error: err.cause?.code ?? err.cause?.message ?? err.message }
      }
    },
    flush,
    async close() {
      unsubscribe?.()
      // A turn still waiting for its load facts leaves now, with what it has.
      for (const { timer, turn } of [...waiting.values()]) {
        clearTimeout(timer)
        exportTurn(turn)
      }
      for (const key of [...runs.keys()]) closeRun(key)
      clearTimeout(flushTimer)
      await flush()
    },
  }
}
