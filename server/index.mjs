import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { collectSystemInfo } from './system-info.mjs'
import { mountProbeRoutes } from './api-probe.mjs'
import { createObserver, createObserveHandler } from './observe.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

export async function startServer(options = {}) {
  const ollamaUrl = options.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
  const port = options.port || process.env.PORT || 5174
  const observeEnabled = options.observe !== false && process.env.OBSERVE !== '0'
  const observePort = Number(options.observePort || process.env.OBSERVE_PORT || 11435)

  if (!existsSync(DIST_DIR)) {
    console.error('Error: dist/ directory not found. Run "npm run build" first.')
    process.exit(1)
  }

  const app = express()
  app.use(express.json())

  // Proxy /api/* to Ollama
  app.use('/api', createProxyMiddleware({
    target: ollamaUrl,
    changeOrigin: true,
    pathRewrite: { '^/api': '/api' },
  }))

  // Proxy /v1/* to Ollama (OpenAI-compat endpoint)
  app.use('/v1', createProxyMiddleware({
    target: ollamaUrl,
    changeOrigin: true,
    pathRewrite: { '^/v1': '/v1' },
  }))

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

  // API probe endpoints
  mountProbeRoutes(app)

  // Live page: the observe port (an Ollama look-alike that records what passes
  // through) and the routes the page reads it from.
  const observer = createObserver({ ollamaUrl, port: observePort })
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

  app.listen(port, () => {
    console.log()
    console.log(`  LLMxRay v${pkg.version}`)
    console.log()
    console.log(`  App:     http://localhost:${port}`)
    console.log(`  Ollama:  ${ollamaUrl}`)
    if (observer.state.listening) {
      console.log(`  Observe: http://localhost:${observer.state.port}  (point other tools here to see them on the Live page)`)
    } else if (observeEnabled) {
      console.log(`  Observe: off (${observeError}; use --observe-port to pick another)`)
    }
    console.log()
  })
}

// Run directly: node server/index.mjs
if (process.argv[1] && process.argv[1].endsWith('index.mjs')) {
  startServer()
}
