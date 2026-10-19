// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createObserver, createObserveHandler } from './observe.mjs'
import { createOtelExporter, parseHeaderLines, parseEnvHeaders, tracesUrl } from './otel-export.mjs'
import { decodeTraces } from './otlp-proto.mjs'

/** An Ollama stand-in: one streamed chat answer, a tool call when asked, and /api/ps. */
function fakeOllama() {
  return http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      if (req.url === '/api/ps') {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ models: [{ name: 'tiny:latest', model: 'tiny:latest', size: 1000, size_vram: 1000, context_length: 8192 }] }))
      }
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      const wantsTool = JSON.stringify(body).includes('use a tool')
      res.setHeader('content-type', 'application/x-ndjson')
      res.end(
        JSON.stringify({
          model: 'tiny:latest',
          message: { role: 'assistant', content: wantsTool ? '' : 'Hi there', ...(wantsTool ? { tool_calls: [{ function: { name: 'read_file', arguments: {} } }] } : {}) },
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 120,
          prompt_eval_cached_count: 100,
          prompt_eval_duration: 10_000_000,
          eval_count: 3,
          eval_duration: 30_000_000,
        }) + '\n',
      )
    })
  })
}

/** A collector that keeps every OTLP request it is sent, headers included. */
function fakeCollector() {
  const received = []
  let failWith = 0
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      if (failWith) {
        res.statusCode = failWith
        return res.end('collector says no')
      }
      received.push({ url: req.url, headers: req.headers, body: decodeTraces(Buffer.concat(chunks)) })
      res.end('{}')
    })
  })
  return {
    server,
    received,
    fail(code) {
      failWith = code
    },
    spans: () => received.flatMap((r) => r.body.resourceSpans.flatMap((rs) => rs.scopeSpans.flatMap((s) => s.spans))),
  }
}

const attrOf = (span, key) => {
  const a = span.attributes.find((x) => x.key === key)
  if (!a) return undefined
  const v = a.value
  return v.stringValue ?? (v.intValue != null ? Number(v.intValue) : v.doubleValue ?? v.boolValue ?? v.arrayValue?.values.map((x) => x.stringValue))
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

describe('OpenTelemetry export', () => {
  const ollama = fakeOllama()
  const collector = fakeCollector()
  let ollamaUrl, collectorUrl
  const dirs = []
  const freshDir = () => {
    const d = mkdtempSync(join(tmpdir(), 'llmxray-otel-'))
    dirs.push(d)
    return d
  }

  beforeAll(async () => {
    await new Promise((r) => ollama.listen(0, '127.0.0.1', r))
    await new Promise((r) => collector.server.listen(0, '127.0.0.1', r))
    ollamaUrl = `http://127.0.0.1:${ollama.address().port}`
    collectorUrl = `http://127.0.0.1:${collector.server.address().port}`
  })
  afterAll(async () => {
    await new Promise((r) => ollama.close(r))
    await new Promise((r) => collector.server.close(r))
    for (const d of dirs) rmSync(d, { recursive: true, force: true })
  })

  /** An observer and an exporter on their own folder, with no OTEL_* settings around. */
  async function setUp({ keepText = false, env = {} } = {}) {
    const dir = freshDir()
    const observer = createObserver({ ollamaUrl, port: 0, host: '127.0.0.1', dataDir: join(dir, 'observe'), keepText })
    await observer.listen()
    const exporter = createOtelExporter({ observer, version: '9.9.9', configFile: join(dir, 'export.json'), env })
    const chat = async (content, client = 'otel-test') => {
      await fetch(`http://127.0.0.1:${observer.state.port}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-llmxray-client': client },
        body: JSON.stringify({ model: 'tiny:latest', messages: [{ role: 'user', content }] }),
      })
      await wait(700) // the load facts follow the turn, then the span leaves
    }
    const done = async () => {
      await exporter.close()
      await observer.close()
    }
    return { dir, observer, exporter, chat, done }
  }

  it('sends nothing while no address is set', async () => {
    collector.received.length = 0
    const { exporter, chat, done } = await setUp()
    await chat('hello')
    await exporter.flush()
    expect(exporter.view().state).toBe('off')
    expect(collector.received).toHaveLength(0)
    await done()
  })

  it('sends each call as a GenAI span, the gap between calls as its own span, and the run as one trace', async () => {
    collector.received.length = 0
    const { exporter, chat, done } = await setUp()
    await exporter.update({ address: collectorUrl, enabled: true })
    await chat('please use a tool')
    await chat('thanks')
    await done() // closing ends the run, so its root span leaves too

    expect(collector.received[0].url).toBe('/v1/traces')
    // Protobuf, the OTLP/HTTP default every collector takes (Phoenix takes nothing else).
    expect(collector.received[0].headers['content-type']).toBe('application/x-protobuf')
    const spans = collector.spans()
    const calls = spans.filter((s) => s.kind === 3)
    const root = spans.find((s) => s.name === 'run otel-test')
    const gap = spans.find((s) => s.name === 'tools read_file')
    expect(calls).toHaveLength(2)
    expect(root).toBeDefined()
    expect(gap).toBeDefined()
    // One trace: every span shares it, and the calls and the gap hang under the run.
    expect(new Set(spans.map((s) => s.traceId)).size).toBe(1)
    for (const s of [...calls, gap]) expect(s.parentSpanId).toBe(root.spanId)
    expect(attrOf(root, 'llmxray.run.calls')).toBe(2)

    const first = calls[0]
    expect(first.name).toBe('chat tiny:latest')
    expect(attrOf(first, 'gen_ai.operation.name')).toBe('chat')
    expect(attrOf(first, 'gen_ai.provider.name')).toBe('ollama')
    expect(attrOf(first, 'gen_ai.request.model')).toBe('tiny:latest')
    expect(attrOf(first, 'gen_ai.usage.input_tokens')).toBe(120)
    expect(attrOf(first, 'gen_ai.usage.output_tokens')).toBe(3)
    expect(attrOf(first, 'llmxray.cached_tokens')).toBe(100)
    expect(attrOf(first, 'llmxray.client')).toBe('otel-test')
    expect(attrOf(first, 'llmxray.tool_calls')).toEqual(['read_file'])
    // The load facts reached the span: they arrive after the turn itself.
    expect(attrOf(first, 'llmxray.context_loaded')).toBe(8192)
    expect(attrOf(first, 'llmxray.cpu_share')).toBe(0)
    // The gap runs from the end of the first call to the start of the second.
    expect(BigInt(gap.startTimeUnixNano)).toBe(BigInt(first.endTimeUnixNano))
    expect(BigInt(gap.endTimeUnixNano)).toBe(BigInt(calls[1].startTimeUnixNano))
    const resource = collector.received[0].body.resourceSpans[0].resource
    expect(attrOf(resource, 'service.name')).toBe('llmxray')
    expect(attrOf(resource, 'service.version')).toBe('9.9.9')
  })

  it('keeps the prompt text out unless Keep text and Include text are both on', async () => {
    collector.received.length = 0
    const { exporter, chat, done } = await setUp({ keepText: true })
    await exporter.update({ address: collectorUrl, enabled: true })
    await chat('secret words')
    await exporter.flush()
    const without = collector.spans().find((s) => s.kind === 3)
    expect(JSON.stringify(without)).not.toContain('secret words')

    await exporter.update({ includeText: true })
    await chat('shared words')
    await exporter.flush()
    const withText = collector.spans().filter((s) => s.kind === 3).at(-1)
    expect(attrOf(withText, 'gen_ai.input.messages')).toContain('shared words')
    expect(JSON.parse(attrOf(withText, 'gen_ai.output.messages'))[0].content).toBe('Hi there')
    await done()
  })

  it('never sends text when Keep text is off, whatever Include text says', async () => {
    collector.received.length = 0
    const { exporter, chat, done } = await setUp({ keepText: false })
    await exporter.update({ address: collectorUrl, enabled: true, includeText: true })
    await chat('not kept, not sent')
    await done()
    expect(JSON.stringify(collector.received)).not.toContain('not kept, not sent')
  })

  it('sends the headers it was given, and shows only their names back', async () => {
    collector.received.length = 0
    const { dir, exporter, chat, done } = await setUp()
    const view = await exporter.update({ address: collectorUrl, enabled: true, headers: 'Authorization: Basic c2VjcmV0\nX-Team: lab' })
    expect(view.headerNames).toEqual(['Authorization', 'X-Team'])
    expect(JSON.stringify(view)).not.toContain('c2VjcmV0')
    await chat('with a key')
    await exporter.flush()
    expect(collector.received.at(-1).headers.authorization).toBe('Basic c2VjcmV0')
    // Kept in the config file on this machine, for the next start.
    expect(JSON.parse(readFileSync(join(dir, 'export.json'), 'utf8')).headers['X-Team']).toBe('lab')
    await done()
  })

  it('says why when the collector refuses, keeps working, and recovers on the next turn', async () => {
    collector.received.length = 0
    const { observer, exporter, chat, done } = await setUp()
    await exporter.update({ address: collectorUrl, enabled: true })
    collector.fail(401)
    await chat('refused')
    await exporter.flush()
    expect(exporter.view()).toMatchObject({ state: 'failing', failed: 1 })
    expect(exporter.view().lastError).toMatch(/401.*collector says no/)
    expect(observer.log.size).toBe(1)
    collector.fail(0)
    await chat('accepted')
    await exporter.flush()
    expect(exporter.view()).toMatchObject({ state: 'sending', sent: 1, lastError: null })
    await done()
  })

  it('says the collector cannot be reached when nothing listens there', async () => {
    const { exporter, chat, done } = await setUp()
    // A port that was just free: nothing listens there now.
    const probe = http.createServer()
    await new Promise((r) => probe.listen(0, '127.0.0.1', r))
    const freePort = probe.address().port
    await new Promise((r) => probe.close(r))
    await exporter.update({ address: `http://127.0.0.1:${freePort}`, enabled: true })
    await chat('into the void')
    await exporter.flush()
    expect(exporter.view().state).toBe('failing')
    expect(exporter.view().lastError).toMatch(/ECONNREFUSED|fetch failed|connect/i)
    await done()
  })

  it('ends the open run at the old address before switching to a new one, so no trace is split', async () => {
    const second = fakeCollector()
    await new Promise((r) => second.server.listen(0, '127.0.0.1', r))
    collector.received.length = 0
    const { exporter, chat, done } = await setUp()
    await exporter.update({ address: collectorUrl, enabled: true })
    await chat('first viewer')
    await exporter.update({ address: `http://127.0.0.1:${second.server.address().port}` })
    const first = collector.spans()
    expect(first.map((s) => s.name)).toEqual(expect.arrayContaining(['chat tiny:latest', 'run otel-test']))
    const root = first.find((s) => s.name === 'run otel-test')
    expect(first.find((s) => s.kind === 3).parentSpanId).toBe(root.spanId)
    await chat('second viewer')
    await done()
    // The next turn starts a new run, and its spans all reach the new address.
    expect(second.spans().every((s) => s.traceId !== root.traceId)).toBe(true)
    expect(second.spans().map((s) => s.name)).toEqual(expect.arrayContaining(['chat tiny:latest', 'run otel-test']))
    await new Promise((r) => second.server.close(r))
  })

  it('takes the standard OTEL_EXPORTER_OTLP_* settings when nothing was saved on the Live page', async () => {
    const { exporter, done } = await setUp({ env: { OTEL_EXPORTER_OTLP_ENDPOINT: collectorUrl, OTEL_EXPORTER_OTLP_HEADERS: 'x-key=a%3Db' } })
    expect(exporter.view()).toMatchObject({ enabled: true, source: 'env', url: `${collectorUrl}/v1/traces`, headerNames: ['x-key'], includeText: false })
    await done()
  })

  it('prefers what was saved on the Live page over the environment', async () => {
    const dir = freshDir()
    writeFileSync(join(dir, 'export.json'), JSON.stringify({ address: 'http://saved:4318', headers: {}, includeText: false, enabled: false }))
    const exporter = createOtelExporter({ observer: null, configFile: join(dir, 'export.json'), env: { OTEL_EXPORTER_OTLP_ENDPOINT: 'http://env:4318' } })
    expect(exporter.view()).toMatchObject({ address: 'http://saved:4318', enabled: false, state: 'off', source: 'file' })
  })

  it('sends a test span on request, through a JSON-only route', async () => {
    collector.received.length = 0
    const { observer, exporter, done } = await setUp()
    await exporter.update({ address: collectorUrl, enabled: false })
    const handler = createObserveHandler(observer, { exporter })
    const api = http.createServer((req, res) => handler(req, res))
    await new Promise((r) => api.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${api.address().port}`
    const refused = await fetch(`${base}/export/test`, { method: 'POST', headers: { 'content-type': 'text/plain' } })
    expect(refused.status).toBe(415)
    const ok = await (await fetch(`${base}/export/test`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()
    expect(ok).toMatchObject({ ok: true, url: `${collectorUrl}/v1/traces` })
    expect(collector.spans().map((s) => s.name)).toEqual(['llmxray test span'])
    const view = await (await fetch(`${base}/export`)).json()
    expect(view.address).toBe(collectorUrl)
    await new Promise((r) => api.close(r))
    await done()
  })
})

describe('export settings parsing', () => {
  it('builds the traces address the way OTLP/HTTP expects', () => {
    expect(tracesUrl('http://localhost:4318')).toBe('http://localhost:4318/v1/traces')
    expect(tracesUrl('http://localhost:4318/')).toBe('http://localhost:4318/v1/traces')
    expect(tracesUrl('https://cloud.langfuse.com/api/public/otel')).toBe('https://cloud.langfuse.com/api/public/otel/v1/traces')
    expect(tracesUrl('http://c:4318/v1/traces')).toBe('http://c:4318/v1/traces')
    expect(tracesUrl('  ')).toBeNull()
  })

  it('reads headers typed one per line, and the env form', () => {
    expect(parseHeaderLines('Authorization: Basic abc==\n\nbad line\nX-A: 1')).toEqual({ Authorization: 'Basic abc==', 'X-A': '1' })
    expect(parseEnvHeaders('a=1,b=x%20y')).toEqual({ a: '1', b: 'x y' })
  })
})
