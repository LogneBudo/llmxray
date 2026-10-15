// @vitest-environment node
/**
 * The release gate: the SHIPPED server (server/index.mjs, what `npx llmxray` and the Docker
 * image run) against a fake Ollama. Every test here exercises startServer for real; the Vite
 * dev server has its own proxy and proved nothing about this file for seven months.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { startServer } from './index.mjs'

let fake // the stand-in Ollama
let seen = [] // what the fake received: { method, url, body }
let app // the shipped server

function fakeOllama() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        seen.push({ method: req.method, url: req.url, body })
        if (req.url === '/api/tags') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ models: [{ name: 'fake:latest', size: 1 }] }))
        } else if (req.url === '/api/chat') {
          res.writeHead(200, { 'content-type': 'application/x-ndjson' })
          res.write(JSON.stringify({ model: 'fake:latest', message: { role: 'assistant', content: 'hi' }, done: false }) + '\n')
          res.end(JSON.stringify({ model: 'fake:latest', message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 12, prompt_eval_cached_count: 10, eval_count: 1 }) + '\n')
        } else if (req.url === '/v1/models') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ data: [{ id: 'fake:latest' }] }))
        } else {
          res.writeHead(404)
          res.end('404 page not found')
        }
      })
    })
    s.listen(0, '127.0.0.1', () => resolve(s))
  })
}

async function call(path, init) {
  const res = await fetch(`http://127.0.0.1:${app.port}${path}`, init)
  return { status: res.status, text: await res.text() }
}

beforeAll(async () => {
  fake = await fakeOllama()
  app = await startServer({ port: 0, observePort: 0, ollamaUrl: `http://127.0.0.1:${fake.address().port}`, quiet: true })
})

afterAll(async () => {
  await app.close()
  fake.close()
})

describe('the shipped server reaches Ollama', () => {
  it('forwards GET /api/tags with its full path', async () => {
    seen = []
    const r = await call('/api/tags')
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text).models[0].name).toBe('fake:latest')
    expect(seen.map((s) => s.url)).toEqual(['/api/tags'])
  })

  it('forwards a JSON POST /api/chat with its body intact and streams the answer back', async () => {
    seen = []
    const body = JSON.stringify({ model: 'fake:latest', messages: [{ role: 'user', content: 'hello' }], stream: true })
    const r = await call('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    expect(r.status).toBe(200)
    expect(seen[0].url).toBe('/api/chat')
    expect(seen[0].body).toBe(body)
    expect(r.text.split('\n').filter(Boolean)).toHaveLength(2)
  })

  it('forwards /v1 (OpenAI-compatible) with its full path', async () => {
    seen = []
    const r = await call('/v1/models')
    expect(r.status).toBe(200)
    expect(seen[0].url).toBe('/v1/models')
  })

  it('probes Ollama and this machine, and refuses any other URL', async () => {
    const ok = await call(`/api-probe?url=${encodeURIComponent(`http://127.0.0.1:${fake.address().port}/api/tags`)}`)
    expect(ok.status).toBe(200)
    expect(JSON.parse(ok.text).status).toBe(200)
    const no = await call(`/api-probe?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data/')}`)
    expect(no.status).toBe(403)
    expect(no.text).toMatch(/only probes Ollama and this machine/)
    const multi = await call('/api-probe-multi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ urls: ['http://10.0.0.1/admin', `http://127.0.0.1:${fake.address().port}/api/tags`] }) })
    expect(JSON.parse(multi.text).results).toHaveLength(1)
  })

  it('does not proxy the app routes that merely start with /api', async () => {
    seen = []
    const r = await call('/api-probe/health')
    expect(seen).toHaveLength(0)
    expect(r.status).not.toBe(404)
  })
})

describe('the Live routes still take JSON bodies', () => {
  it('switches keepText on through POST /__observe/settings', async () => {
    const r = await call('/__observe/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keepText: true }) })
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text).keepText).toBe(true)
    await call('/__observe/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keepText: false }) })
  })
})

describe('the observe port', () => {
  it('records a chat that goes through it, with the cache figures from the daemon', async () => {
    const body = JSON.stringify({ model: 'fake:latest', messages: [{ role: 'user', content: 'hello' }], stream: true })
    const r = await fetch(`http://127.0.0.1:${app.observePort}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'gate-test/1' }, body })
    expect(r.status).toBe(200)
    await r.text()
    const turns = JSON.parse((await call('/__observe/turns?since=0')).text).turns
    const mine = turns.find((t) => t.client.userAgent === 'gate-test/1')
    expect(mine).toBeTruthy()
    expect(mine.prompt.tokens).toBe(12)
    expect(mine.prompt.cached).toBe(10)
  })

  it('lets a client name itself with a header or ?client=, and keeps that name off the wire to Ollama', async () => {
    seen = []
    const body = JSON.stringify({ model: 'fake:latest', messages: [{ role: 'user', content: 'hello' }], stream: false })
    await (await fetch(`http://127.0.0.1:${app.observePort}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-llmxray-client': 'my-agent' }, body })).text()
    await (await fetch(`http://127.0.0.1:${app.observePort}/api/chat?client=other-agent`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).text()
    const turns = JSON.parse((await call('/__observe/turns?since=0')).text).turns
    expect(turns.find((t) => t.client.label === 'my-agent')?.client.id).toBe('tag:my-agent')
    expect(turns.find((t) => t.client.label === 'other-agent')?.client.id).toBe('tag:other-agent')
    expect(seen.map((s) => s.url)).toEqual(['/api/chat', '/api/chat'])
  })

  it('ignores a settings POST that is not JSON, the kind a cross-site page can send', async () => {
    const r = await call('/__observe/settings', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{"keepText":true}' })
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text).keepText).toBe(false)
  })

  it('records a client that disconnects mid-stream as cancelled, not as a clean stop', async () => {
    const slow = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/x-ndjson' })
      res.write(JSON.stringify({ message: { content: 'a' }, done: false }) + '\n')
      // never ends: the client will hang up
      req.on('close', () => res.destroy())
    })
    await new Promise((r) => slow.listen(0, '127.0.0.1', r))
    const slowApp = await startServer({ port: 0, observePort: 0, ollamaUrl: `http://127.0.0.1:${slow.address().port}`, quiet: true })
    const ac = new AbortController()
    const p = fetch(`http://127.0.0.1:${slowApp.observePort}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'cancel-test/1' },
      body: JSON.stringify({ model: 'fake:latest', messages: [{ role: 'user', content: 'x' }] }),
      signal: ac.signal,
    })
    setTimeout(() => ac.abort(), 200)
    await p.catch(() => {})
    await new Promise((r) => setTimeout(r, 300))
    const turns = JSON.parse((await (await fetch(`http://127.0.0.1:${slowApp.port}/__observe/turns?since=0`)).text())).turns
    const mine = turns.find((t) => t.client.userAgent === 'cancel-test/1')
    expect(mine).toBeTruthy()
    expect(mine.status).toBe(499)
    expect(mine.error).toMatch(/cancelled/)
    await slowApp.close()
    slow.close()
  })

  it('answers 502 with a sentence, and stays alive, when the daemon is https on a dead port', async () => {
    const deadApp = await startServer({ port: 0, observePort: 0, ollamaUrl: 'https://127.0.0.1:1', quiet: true })
    const r = await fetch(`http://127.0.0.1:${deadApp.observePort}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"model":"x","messages":[]}' })
    expect(r.status).toBe(502)
    expect((await r.text())).toMatch(/could not reach Ollama/)
    const again = await fetch(`http://127.0.0.1:${deadApp.port}/__observe/status`)
    expect(again.status).toBe(200)
    await deadApp.close()
  })
})
