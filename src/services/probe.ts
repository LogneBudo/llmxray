import { isOpenApiSpec } from './openapi-parser'

// --- Basic probe ---

export interface ProbeResult {
  ok: boolean
  status: number
  data: unknown
  error?: string
  rawText?: string
}

export async function probeApi(url: string): Promise<ProbeResult> {
  const res = await fetch(`/api-probe?url=${encodeURIComponent(url)}`)
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: res.ok, status: res.status, data: null, rawText: text, error: 'Response is not valid JSON' }
  }
}

// --- Advanced probe ---

export interface ProbeRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface AuthHint {
  type: 'bearer' | 'apikey' | 'basic' | 'unknown'
  message: string
}

export interface ProbeAdvancedResult {
  ok: boolean
  status: number
  data: unknown
  headers: Record<string, string>
  authHint?: AuthHint
  error?: string
  rawText?: string
}

export async function probeApiAdvanced(
  url: string,
  options?: ProbeRequestOptions,
): Promise<ProbeAdvancedResult> {
  const res = await fetch('/api-probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      method: options?.method ?? 'GET',
      headers: options?.headers,
      body: options?.body,
    }),
  })

  const envelope = (await res.json()) as {
    status: number
    headers: Record<string, string>
    body: string
    error?: string
  }

  if (envelope.error) {
    return {
      ok: false,
      status: envelope.status ?? 502,
      data: null,
      headers: envelope.headers ?? {},
      error: envelope.error,
    }
  }

  let data: unknown = null
  let rawText: string | undefined
  let parseError: string | undefined
  try {
    data = JSON.parse(envelope.body)
  } catch {
    rawText = envelope.body
    parseError = 'Response is not valid JSON'
  }

  const ok = envelope.status >= 200 && envelope.status < 300

  let authHint: AuthHint | undefined
  if (envelope.status === 401 || envelope.status === 403) {
    authHint = detectAuth(envelope.headers, envelope.body)
  }

  return {
    ok,
    status: envelope.status,
    data,
    headers: envelope.headers,
    authHint,
    error: parseError ?? (!ok ? `HTTP ${envelope.status}` : undefined),
    rawText,
  }
}

function detectAuth(headers: Record<string, string>, body: string): AuthHint {
  const wwwAuth = (headers['www-authenticate'] ?? '').toLowerCase()
  const bodyLower = body.toLowerCase()

  if (wwwAuth.includes('bearer') || bodyLower.includes('bearer')) {
    return { type: 'bearer', message: 'Bearer token required' }
  }
  if (wwwAuth.includes('basic')) {
    return { type: 'basic', message: 'Basic authentication required' }
  }
  if (bodyLower.includes('api key') || bodyLower.includes('apikey') || bodyLower.includes('api_key')) {
    return { type: 'apikey', message: 'API key required' }
  }
  return { type: 'unknown', message: 'Authentication required' }
}

// --- OpenAPI spec discovery ---

export interface DiscoveryResult {
  specUrl: string | null
  spec: object | null
  endpointCount: number
}

const WELL_KNOWN_PATHS = [
  '/openapi.json',
  '/swagger.json',
  '/api-docs',
  '/v1/openapi.json',
  '/v2/openapi.json',
  '/v3/openapi.json',
  '/.well-known/openapi',
  '/docs/openapi.json',
  '/api/v3/openapi.json',
  '/api/openapi.json',
]

export async function discoverOpenApiSpec(baseUrl: string): Promise<DiscoveryResult> {
  let origin: string
  try {
    origin = new URL(baseUrl).origin
  } catch {
    return { specUrl: null, spec: null, endpointCount: 0 }
  }

  const urls = WELL_KNOWN_PATHS.map((p) => `${origin}${p}`)

  try {
    const res = await fetch('/api-probe-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    })
    const { results } = (await res.json()) as {
      results: Array<{ url: string; status: number; body: string; error?: string }>
    }

    for (const r of results) {
      if (r.status !== 200 || !r.body) continue
      try {
        const parsed = JSON.parse(r.body)
        if (isOpenApiSpec(parsed)) {
          const paths = parsed.paths ? Object.keys(parsed.paths) : []
          let count = 0
          for (const p of paths) {
            const methods = parsed.paths[p]
            if (methods && typeof methods === 'object') {
              count += ['get', 'post', 'put', 'delete', 'patch'].filter((m) => m in methods).length
            }
          }
          return { specUrl: r.url, spec: parsed, endpointCount: count }
        }
      } catch {
        // Not JSON or not a spec, skip
      }
    }
  } catch {
    // Multi-probe failed, not critical
  }

  return { specUrl: null, spec: null, endpointCount: 0 }
}
