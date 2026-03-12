/**
 * Convert selected JSON dot-paths into a `return { ... }` statement.
 *
 * Input:  ['data.amount', 'data.currency']
 * Output: 'return { amount: json.data.amount, currency: json.data.currency }'
 *
 * Ported from visual-tool-builder-lab/src/services/path-to-code.ts
 */

import type { ToolMapping, ReturnSchema } from '@/types/tool-optimizer'

export function selectedPathsToReturnCode(paths: string[], varName = 'json'): string {
  if (paths.length === 0) return `return ${varName}`

  const keys = paths.map(p => extractLeafName(p))

  const seen = new Map<string, number>()
  for (const k of keys) {
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }

  const entries = paths.map((p, i) => {
    let key = keys[i]!
    if ((seen.get(key) ?? 0) > 1) {
      key = disambiguate(p)
    }
    return `    ${key}: ${varName}.${p}`
  })

  if (entries.length === 1) {
    return `return {${entries[0]!.trim().replace(/^/, ' ').replace(/$/, ' ')}}`
  }

  return `return {\n${entries.join(',\n')}\n  }`
}

function extractLeafName(path: string): string {
  const cleaned = path.replace(/\[\d+\]/g, '')
  const segments = cleaned.split('.')
  return segments[segments.length - 1] ?? path
}

function disambiguate(path: string): string {
  const cleaned = path.replace(/\[\d+\]/g, '')
  const segments = cleaned.split('.')
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]}_${segments[segments.length - 1]}`
  }
  return segments[segments.length - 1] ?? path
}

/**
 * Convert selected JSON paths into structured ToolMapping objects.
 */
export function generateMappings(paths: string[]): ToolMapping[] {
  if (paths.length === 0) return []

  const keys = paths.map(p => extractLeafName(p))

  const seen = new Map<string, number>()
  for (const k of keys) {
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }

  return paths.map((p, i) => {
    let key = keys[i]!
    if ((seen.get(key) ?? 0) > 1) {
      key = disambiguate(p)
    }
    return { jsonPath: p, returnKey: key }
  })
}

/**
 * Generate a JSON Schema for the tool's return value by inspecting
 * the actual response data at each mapping's JSON path.
 */
export function generateReturnSchema(
  mappings: ToolMapping[],
  probeData: unknown,
): ReturnSchema {
  const properties: Record<string, { type: string }> = {}
  const required: string[] = []

  for (const mapping of mappings) {
    const value = resolveJsonPath(probeData, mapping.jsonPath)
    properties[mapping.returnKey] = { type: inferJsonSchemaType(value) }
    required.push(mapping.returnKey)
  }

  return { type: 'object', properties, required }
}

function resolveJsonPath(data: unknown, path: string): unknown {
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = data
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}

function inferJsonSchemaType(value: unknown): string {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

// --- Advanced code generation ---

export interface GenerateOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  secretHeaders?: string[]
}

export interface GenerateResult {
  body: string
  addedParams: Array<{ name: string; type: string }>
}

/**
 * Generate a complete function body from a probe URL and selected paths.
 * Supports custom headers, HTTP methods, and request bodies.
 * Auth headers are parameterized (not hardcoded).
 */
export function generateProbeBody(
  url: string,
  paths: string[],
  options?: GenerateOptions,
): GenerateResult {
  const returnStatement = selectedPathsToReturnCode(paths)
  const addedParams: Array<{ name: string; type: string }> = []

  const method = options?.method ?? 'GET'
  const headers = options?.headers ?? {}
  const reqBody = options?.body

  const secretSet = new Set(options?.secretHeaders ?? [])
  const codeHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (secretSet.has(key)) {
      const envName = key.replace(/-/g, '_').toUpperCase()
      codeHeaders[key] = `__ENV_${envName}__`
      continue
    }

    const keyLower = key.toLowerCase()
    if (keyLower === 'authorization') {
      if (value.toLowerCase().startsWith('bearer ')) {
        addedParams.push({ name: 'apiKey', type: 'string' })
        codeHeaders[key] = '__BEARER_PARAM__'
      } else {
        addedParams.push({ name: 'apiKey', type: 'string' })
        codeHeaders[key] = '__AUTH_PARAM__'
      }
    } else if (keyLower.startsWith('x-api') || keyLower.includes('api-key') || keyLower.includes('apikey')) {
      addedParams.push({ name: 'apiKey', type: 'string' })
      codeHeaders[key] = '__APIKEY_PARAM__'
    } else {
      codeHeaders[key] = value
    }
  }

  const hasHeaders = Object.keys(codeHeaders).length > 0
  const hasBody = reqBody && (method === 'POST' || method === 'PUT')
  const needsOptions = method !== 'GET' || hasHeaders || hasBody

  let fetchCall: string
  if (!needsOptions) {
    fetchCall = `const res = await fetch("${url}")`
  } else {
    const optParts: string[] = []

    if (method !== 'GET') {
      optParts.push(`    method: "${method}"`)
    }

    if (hasHeaders) {
      const headerEntries = Object.entries(codeHeaders).map(([k, v]) => {
        if (v === '__BEARER_PARAM__') return `      "${k}": "Bearer " + apiKey`
        if (v === '__AUTH_PARAM__') return `      "${k}": apiKey`
        if (v === '__APIKEY_PARAM__') return `      "${k}": apiKey`
        if (v.startsWith('__ENV_') && v.endsWith('__')) {
          const envName = v.slice(6, -2)
          return `      "${k}": process.env.${envName}`
        }
        return `      "${k}": "${v}"`
      })
      optParts.push(`    headers: {\n${headerEntries.join(',\n')}\n    }`)
    }

    if (hasBody) {
      const escaped = reqBody!.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
      optParts.push(`    body: "${escaped}"`)
    }

    fetchCall = `const res = await fetch("${url}", {\n${optParts.join(',\n')}\n  })`
  }

  const indentedFetch = fetchCall.replace(/\n/g, '\n  ')
  const indentedReturn = returnStatement.replace(/\n/g, '\n  ')

  const body = [
    '{',
    '  try {',
    `    ${indentedFetch}`,
    '    const json = await res.json()',
    `    ${indentedReturn}`,
    '  } catch (e) {',
    '    return { error: true, message: e instanceof Error ? e.message : String(e) }',
    '  }',
    '}',
  ].join('\n')

  return { body, addedParams }
}
