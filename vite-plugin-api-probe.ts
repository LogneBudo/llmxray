import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

/** Read the full body from a Node IncomingMessage stream */
async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString()
}

/** Extract key response headers we care about */
function pickHeaders(response: Response): Record<string, string> {
  const picked: Record<string, string> = {}
  const interesting = [
    'content-type',
    'www-authenticate',
    'server',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'retry-after',
    'allow',
  ]
  for (const key of interesting) {
    const val = response.headers.get(key)
    if (val) picked[key] = val
  }
  return picked
}

/**
 * Vite plugin that adds API probe proxy endpoints:
 * - /api-probe — single URL probe (GET backward compat + POST with full control)
 * - /api-probe-multi — parallel URL probing with 2s timeout each
 */
export function apiProbePlugin(): Plugin {
  return {
    name: 'api-probe-proxy',
    configureServer(server) {
      // --- Multi-URL probe ---
      server.middlewares.use('/api-probe-multi', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          const payload = JSON.parse(await readBody(req))
          const urls: string[] = payload.urls ?? []
          const results = await Promise.allSettled(
            urls.map(async (url: string) => {
              const controller = new AbortController()
              const timer = setTimeout(() => controller.abort(), 2000)
              try {
                const r = await fetch(url, { signal: controller.signal })
                const body = await r.text()
                return { url, status: r.status, body }
              } finally {
                clearTimeout(timer)
              }
            }),
          )
          const out = results.map((r, i) =>
            r.status === 'fulfilled'
              ? r.value
              : { url: urls[i], status: 0, body: '', error: (r.reason as Error).message },
          )
          res.statusCode = 200
          res.end(JSON.stringify({ results: out }))
        } catch (e: any) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      // --- Single URL probe ---
      server.middlewares.use('/api-probe', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        let target: string | null = null
        let method = 'GET'
        let headers: Record<string, string> = {}
        let body: string | undefined

        if (req.method === 'POST') {
          try {
            const payload = JSON.parse(await readBody(req))
            target = payload.url ?? null
            method = payload.method ?? 'GET'
            headers = payload.headers ?? {}
            body = payload.body
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid JSON body' }))
            return
          }
        } else {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          target = url.searchParams.get('url')
        }

        if (!target) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing url parameter' }))
          return
        }

        try {
          const response = await fetch(target, {
            method,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            body: method === 'POST' || method === 'PUT' ? body : undefined,
          })
          const responseBody = await response.text()
          const responseHeaders = pickHeaders(response)

          res.statusCode = 200
          res.end(
            JSON.stringify({
              status: response.status,
              headers: responseHeaders,
              body: responseBody,
            }),
          )
        } catch (e: any) {
          res.statusCode = 200
          res.end(
            JSON.stringify({
              status: 502,
              headers: {},
              body: '',
              error: e.message,
            }),
          )
        }
      })
    },
  }
}
