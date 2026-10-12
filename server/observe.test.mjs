// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createObserver, createObserveHandler } from './observe.mjs'

/**
 * A stand-in Ollama: streams NDJSON for /api/chat, answers /api/ps and /api/tags,
 * and echoes the root banner. The observer must be transparent to the client
 * and still record the turn.
 */
function fakeOllama() {
  const seen = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString()
      seen.push({ method: req.method, url: req.url, body, ua: req.headers['user-agent'] })
      if (req.url === '/') return res.end('Ollama is running')
      if (req.url === '/api/tags') {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ models: [{ name: 'tiny:latest' }] }))
      }
      if (req.url === '/api/ps') {
        res.setHeader('content-type', 'application/json')
        return res.end(
          JSON.stringify({ models: [{ name: 'tiny:latest', model: 'tiny:latest', size: 1000, size_vram: 590, context_length: 32768, runner: 'llamacpp' }] }),
        )
      }
      if (req.url === '/api/chat') {
        res.setHeader('content-type', 'application/x-ndjson')
        res.write(JSON.stringify({ model: 'tiny:latest', message: { role: 'assistant', content: 'Hello' }, done: false }) + '\n')
        setTimeout(() => {
          res.end(
            JSON.stringify({
              model: 'tiny:latest',
              message: { role: 'assistant', content: '' },
              done: true,
              done_reason: 'stop',
              prompt_eval_count: 100,
              prompt_eval_cached_count: 60,
              prompt_eval_duration: 20_000_000,
              eval_count: 2,
              eval_duration: 50_000_000,
            }) + '\n',
          )
        }, 10)
        return
      }
      res.statusCode = 404
      res.end('{"error":"nope"}')
    })
  })
  return { server, seen }
}

async function text(url, init) {
  const r = await fetch(url, init)
  return { status: r.status, body: await r.text(), headers: r.headers }
}

describe('observe port', () => {
  const fake = fakeOllama()
  let fakePort
  let observer
  let observeUrl
  let ui
  let uiUrl

  beforeAll(async () => {
    await new Promise((r) => fake.server.listen(0, '127.0.0.1', r))
    fakePort = fake.server.address().port
    observer = createObserver({ ollamaUrl: `http://127.0.0.1:${fakePort}`, port: 0, host: '127.0.0.1' })
    const p = await observer.listen()
    observeUrl = `http://127.0.0.1:${p}`
    const handler = createObserveHandler(observer)
    ui = http.createServer((req, res) => {
      req.url = req.url.replace(/^\/__observe/, '') || '/'
      handler(req, res)
    })
    await new Promise((r) => ui.listen(0, '127.0.0.1', r))
    uiUrl = `http://127.0.0.1:${ui.address().port}/__observe`
  })

  afterAll(async () => {
    await observer.close()
    await new Promise((r) => ui.close(r))
    await new Promise((r) => fake.server.close(r))
  })

  it('looks like Ollama to a client: root banner and tags pass straight through', async () => {
    expect((await text(`${observeUrl}/`)).body).toBe('Ollama is running')
    const tags = await text(`${observeUrl}/api/tags`)
    expect(tags.status).toBe(200)
    expect(JSON.parse(tags.body).models[0].name).toBe('tiny:latest')
    expect(observer.log.size).toBe(0)
  })

  it('streams a chat untouched and records the turn with the daemon counts', async () => {
    const body = JSON.stringify({
      model: 'tiny:latest',
      messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'hi' }],
      tools: [{ type: 'function', function: { name: 'read_file' } }],
    })
    const r = await text(`${observeUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'GitHubCopilotChat/0.41.0' },
      body,
    })
    expect(r.status).toBe(200)
    const lines = r.body.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1]).done).toBe(true)
    expect(fake.seen.at(-1).body).toBe(body)

    const turns = JSON.parse((await text(`${uiUrl}/turns`)).body).turns
    expect(turns).toHaveLength(1)
    const t = turns[0]
    expect(t.client.label).toBe('VS Code Copilot')
    expect(t.mode).toBe('agent')
    expect(t.model).toBe('tiny:latest')
    expect(t.prompt).toMatchObject({ tokens: 100, cached: 60, evaluated: 40, prefillMs: 20, prefillTps: 2000 })
    expect(t.gen.tokens).toBe(2)
    expect(t.toolsOffered).toBe(1)
    expect(t.prefix).toBeNull()
    expect(t.textKept).toBe(false)
  })

  it('attaches the load facts from /api/ps to every turn, and diffs the next turn against the previous one', async () => {
    // A second turn inside the debounce window must not rob the first of its load facts.
    await text(`${observeUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'curl/8.0' },
      body: JSON.stringify({ model: 'tiny:latest', messages: [{ role: 'user', content: 'quick' }] }),
    })
    await new Promise((r) => setTimeout(r, 600))
    const all = JSON.parse((await text(`${uiUrl}/turns`)).body).turns
    expect(all).toHaveLength(2)
    for (const t of all) expect(t.fit).toMatchObject({ contextLength: 32768, cpuShare: 0.41, runner: 'llamacpp' })
    const [first] = all

    await text(`${observeUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'GitHubCopilotChat/0.41.0' },
      body: JSON.stringify({
        model: 'tiny:latest',
        messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'hi there' }],
        tools: [{ type: 'function', function: { name: 'read_file' } }],
      }),
    })
    const turns = JSON.parse((await text(`${uiUrl}/turns?since=${first.seq + 1}`)).body).turns
    expect(turns).toHaveLength(1)
    const second = turns[0]
    expect(second.prefix.identical).toBe(false)
    expect(second.prefix.breakChar).toBeGreaterThan(0)
    expect(second.prefix.breakTokensEst).toBeGreaterThan(0)
  })

  it('keeps prompt text only when asked, and serves it per turn', async () => {
    expect((await text(`${uiUrl}/turns/anything/text`)).status).toBe(404)
    await text(`${uiUrl}/settings`, { method: 'POST', body: JSON.stringify({ keepText: true }) })
    expect(JSON.parse((await text(`${uiUrl}/status`)).body).keepText).toBe(true)
    await text(`${observeUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'curl/8.0' },
      body: JSON.stringify({ model: 'tiny:latest', messages: [{ role: 'user', content: 'secret words' }] }),
    })
    const last = JSON.parse((await text(`${uiUrl}/turns`)).body).turns.at(-1)
    expect(last.textKept).toBe(true)
    const kept = JSON.parse((await text(`${uiUrl}/turns/${last.id}/text`)).body)
    expect(kept.request.messages[0].content).toBe('secret words')
    await text(`${uiUrl}/settings`, { method: 'POST', body: JSON.stringify({ keepText: false }) })
    expect((await text(`${uiUrl}/turns/${last.id}/text`)).status).toBe(404)
  })

  it('keeps retrying a port that is still held by a process on its way out', async () => {
    const squatter = http.createServer()
    await new Promise((r) => squatter.listen(0, '127.0.0.1', r))
    const port = squatter.address().port
    const late = createObserver({ ollamaUrl: `http://127.0.0.1:${fakePort}`, port, host: '127.0.0.1' })
    setTimeout(() => squatter.close(), 250)
    const got = await late.listen({ retries: 10, delayMs: 100 })
    expect(got).toBe(port)
    expect(late.state).toMatchObject({ listening: true, error: null })
    await late.close()
  })

  it('gives up with the reason when the port stays taken, and can be asked again later', async () => {
    const squatter = http.createServer()
    await new Promise((r) => squatter.listen(0, '127.0.0.1', r))
    const port = squatter.address().port
    const late = createObserver({ ollamaUrl: `http://127.0.0.1:${fakePort}`, port, host: '127.0.0.1' })
    await expect(late.listen({ retries: 1, delayMs: 20 })).rejects.toMatchObject({ code: 'EADDRINUSE' })
    expect(late.state.listening).toBe(false)
    expect(late.state.error).toMatch(/already in use/)

    const handler = createObserveHandler(late)
    const api = http.createServer((req, res) => handler(req, res))
    await new Promise((r) => api.listen(0, '127.0.0.1', r))
    const apiUrl = `http://127.0.0.1:${api.address().port}`
    expect((await text(`${apiUrl}/listen`, { method: 'POST' })).status).toBe(409)
    await new Promise((r) => squatter.close(r))
    const retry = await text(`${apiUrl}/listen`, { method: 'POST' })
    expect(retry.status).toBe(200)
    expect(JSON.parse(retry.body).listening).toBe(true)
    await late.close()
    await new Promise((r) => api.close(r))
  })

  it('answers 502 with a readable message when Ollama is unreachable', async () => {
    const lonely = createObserver({ ollamaUrl: 'http://127.0.0.1:1', port: 0, host: '127.0.0.1' })
    const p = await lonely.listen()
    const r = await text(`http://127.0.0.1:${p}/api/tags`)
    expect(r.status).toBe(502)
    expect(JSON.parse(r.body).error).toMatch(/could not reach Ollama/)
    await lonely.close()
  })

  it('clears on request', async () => {
    await text(`${uiUrl}/clear`, { method: 'POST' })
    expect(JSON.parse((await text(`${uiUrl}/turns`)).body).turns).toHaveLength(0)
  })
})
