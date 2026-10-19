import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import express from 'express'
import { collectSystemInfo } from './system-info.mjs'
import { mountProbeRoutes } from './api-probe.mjs'
import { createObserver, createObserveHandler } from './observe.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

// Streams /api/* and /v1/* to Ollama as they came, the body unread and the path whole; only
// the Host header changes, to the daemon's own. Anything else goes on to the app's routes.
function proxyToOllama(ollamaUrl) {
  const target = new URL(ollamaUrl)
  const secure = target.protocol === 'https:'
  return (req, res, next) => {
    if (!/^\/(api|v1)\//.test(req.originalUrl)) return next()
    const fail = (err) => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: `LLMxRay could not reach Ollama at ${ollamaUrl}: ${err.message}` }))
    }
    let upstream
    try {
      // https targets go through the https module; http.request refuses them outright.
      upstream = (secure ? https : http).request({
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (secure ? 443 : 80),
        method: req.method,
        path: req.originalUrl,
        headers: { ...req.headers, host: target.host },
      }, (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers)
        up.pipe(res)
        up.on('error', () => res.destroy())
      })
    } catch (err) {
      fail(err)
      return
    }
    upstream.on('error', fail)
    // A client that leaves mid-answer stops the daemon's work too.
    res.on('close', () => {
      if (!res.writableFinished) upstream.destroy()
    })
    req.pipe(upstream)
  }
}

export async function startServer(options = {}) {
  const ollamaUrl = options.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
  // 0 is a real value here (any free port, used by the release gate), so ?? not ||.
  const port = Number(options.port ?? process.env.PORT ?? 5174)
  const observeEnabled = options.observe !== false && process.env.OBSERVE !== '0'
  const observePort = Number(options.observePort ?? process.env.OBSERVE_PORT ?? 11435)
  // Both ports answer only this machine unless asked: the Live log holds other tools' prompts,
  // and the proxy reaches Ollama's admin routes. --host 0.0.0.0 opens them to the network.
  const host = options.host ?? process.env.HOST ?? '127.0.0.1'

  if (!existsSync(DIST_DIR)) {
    console.error('Error: dist/ directory not found. Run "npm run build" first.')
    process.exit(1)
  }

  const app = express()

  // Proxy /api/* and /v1/* to Ollama, untouched. This sits BEFORE any body parser and is
  // mounted without a path prefix: Express strips a mount prefix before the proxy sees the
  // URL, and a parsed body never reaches the upstream. Both broke every npx/Docker install
  // from v0.2.0 to v0.7.7; see server/index.test.mjs, which runs this file for real.
  app.use(proxyToOllama(ollamaUrl))

  app.use(express.json())

  // System info endpoint
  let cachedInfo = null
  let cacheTime = 0
  app.get('/__system-info', (_req, res) => {
    const now = Date.now()
    if (!cachedInfo || now - cacheTime > 30_000) {
      cachedInfo = collectSystemInfo()
      cacheTime = now
    }
    res.json(cachedInfo)
  })

  // API probe endpoints: they fetch on the user's behalf, so only Ollama and this machine.
  mountProbeRoutes(app, { allowedOrigins: [new URL(ollamaUrl).origin] })

  // Live page: the observe port (an Ollama look-alike that records what passes
  // through) and the routes the page reads it from.
  const observer = createObserver({ ollamaUrl, port: observePort, host })
  const observeHandler = createObserveHandler(observer)
  app.use('/__observe', (req, res) => observeHandler(req, res))
  let observeError = null
  if (observeEnabled) {
    try {
      await observer.listen()
    } catch {
      observeError = observer.state.error
    }
  }

  // Serve static files
  app.use(express.static(DIST_DIR))

  // SPA fallback: serve index.html for client-side routes
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })

  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s))
    s.once('error', (err) => {
      if (err.code === 'EADDRINUSE') reject(new Error(`port ${port} is already in use; pick another with --port`))
      else reject(err)
    })
  })
  const boundPort = server.address().port
  if (!options.quiet) {
    console.log()
    console.log(`  LLMxRay v${pkg.version}`)
    console.log()
    console.log(`  App:     http://localhost:${boundPort}${host === '127.0.0.1' ? '' : `  (listening on ${host})`}`)
    console.log(`  Ollama:  ${ollamaUrl}`)
    if (observer.state.listening) {
      console.log(`  Observe: http://localhost:${observer.state.port}  (point other tools here to see them on the Live page${host === '127.0.0.1' ? '; --host 0.0.0.0 for other machines' : ''})`)
    } else if (observeEnabled) {
      console.log(`  Observe: off (${observeError}; use --observe-port to pick another)`)
    }
    console.log()
  }
  return {
    port: boundPort,
    observePort: observer.state.listening ? observer.state.port : null,
    close: () => new Promise((r) => { observer.close?.(); server.close(() => r()) }),
  }
}

// Run directly: node server/index.mjs
if (process.argv[1] && process.argv[1].endsWith('index.mjs')) {
  startServer()
}
