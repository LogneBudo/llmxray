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

export function mountProbeRoutes(app) {
  // Single URL probe
  app.post('/api-probe', async (req, res) => {
    const { url: target, method = 'GET', headers = {}, body } = req.body ?? {}
    if (!target) return res.status(400).json({ error: 'Missing url parameter' })

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
    const urls = req.body?.urls ?? []
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
