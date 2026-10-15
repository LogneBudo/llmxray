/**
 * Protocol Observatory probes: the browser cannot call Ollama's bare endpoints
 * cross-origin, so the server fetches on its behalf. Only Ollama and this
 * machine may be probed: a relay that fetched any URL would let a page or a LAN
 * peer read the user's internal network through LLMxRay.
 */
const INTERESTING_HEADERS = [
  'content-type', 'www-authenticate', 'server',
  'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
  'retry-after', 'allow',
]

function pickHeaders(response) {
  const picked = {}
  for (const key of INTERESTING_HEADERS) {
    const val = response.headers.get(key)
    if (val) picked[key] = val
  }
  return picked
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/** True when the URL points at Ollama or at this machine. Anything else is refused. */
export function probeAllowed(target, allowedOrigins = []) {
  let u
  try {
    u = new URL(String(target))
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  if (allowedOrigins.includes(u.origin)) return true
  return LOCAL_HOSTS.has(u.hostname)
}

export function mountProbeRoutes(app, { allowedOrigins = [] } = {}) {
  const refuse = (res, target) =>
    res.status(403).json({ error: `LLMxRay only probes Ollama and this machine, not ${String(target).slice(0, 200)}` })

  // Single URL probe
  app.post('/api-probe', async (req, res) => {
    const { url: target, method = 'GET', headers = {}, body } = req.body ?? {}
    if (!target) return res.status(400).json({ error: 'Missing url parameter' })
    if (!probeAllowed(target, allowedOrigins)) return refuse(res, target)

    try {
      const response = await fetch(target, {
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: method === 'POST' || method === 'PUT' ? body : undefined,
      })
      const responseBody = await response.text()
      res.json({ status: response.status, headers: pickHeaders(response), body: responseBody })
    } catch (e) {
      res.json({ status: 502, headers: {}, body: '', error: e.message })
    }
  })

  app.get('/api-probe', async (req, res) => {
    const target = req.query.url
    if (!target) return res.status(400).json({ error: 'Missing url parameter' })
    if (!probeAllowed(target, allowedOrigins)) return refuse(res, target)

    try {
      const response = await fetch(target)
      const responseBody = await response.text()
      res.json({ status: response.status, headers: pickHeaders(response), body: responseBody })
    } catch (e) {
      res.json({ status: 502, headers: {}, body: '', error: e.message })
    }
  })

  // Multi-URL probe
  app.post('/api-probe-multi', async (req, res) => {
    const urls = (req.body?.urls ?? []).filter((u) => probeAllowed(u, allowedOrigins))
    const results = await Promise.allSettled(
      urls.map(async (url) => {
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
        : { url: urls[i], status: 0, body: '', error: r.reason?.message },
    )
    res.json({ results: out })
  })
}
