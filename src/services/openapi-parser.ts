/**
 * Lightweight OpenAPI 3.x / Swagger 2.x parser.
 * Extracts endpoints, parameters, and response schemas for the endpoint picker.
 */

export interface ApiInfo {
  title: string
  version: string
  description?: string
  baseUrl?: string
}

export interface EndpointParam {
  name: string
  in: 'query' | 'path' | 'header' | 'body'
  type: string
  required: boolean
  description?: string
}

export interface Endpoint {
  path: string
  method: string
  operationId?: string
  summary?: string
  description?: string
  parameters: EndpointParam[]
  responseFields?: string[]
}

export interface ParsedSpec {
  info: ApiInfo
  endpoints: Endpoint[]
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const

export function parseOpenApiSpec(spec: unknown): ParsedSpec | null {
  if (!spec || typeof spec !== 'object') return null

  const s = spec as Record<string, any>

  const isV3 = typeof s.openapi === 'string' && s.openapi.startsWith('3')
  const isV2 = typeof s.swagger === 'string' && s.swagger.startsWith('2')
  if (!isV3 && !isV2) return null

  const info: ApiInfo = {
    title: s.info?.title ?? 'Unknown API',
    version: s.info?.version ?? '?',
    description: s.info?.description,
    baseUrl: isV3 ? s.servers?.[0]?.url : buildV2BaseUrl(s),
  }

  const endpoints: Endpoint[] = []
  const paths = s.paths ?? {}
  const defs = isV3 ? s.components?.schemas : s.definitions

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue
    const pathObj = pathItem as Record<string, any>
    const pathParams: any[] = pathObj.parameters ?? []

    for (const method of HTTP_METHODS) {
      const operation = pathObj[method]
      if (!operation) continue

      const opParams: any[] = operation.parameters ?? []
      const allParams = [...pathParams, ...opParams]

      const parameters: EndpointParam[] = allParams.map((p: any) => ({
        name: p.name ?? 'unknown',
        in: p.in ?? 'query',
        type: isV3
          ? openApiTypeToTs(p.schema?.type, p.schema?.format)
          : openApiTypeToTs(p.type, p.format),
        required: p.required ?? false,
        description: p.description,
      }))

      let responseFields: string[] | undefined
      const resp200 = operation.responses?.['200'] ?? operation.responses?.['201']
      if (resp200) {
        const schema = isV3
          ? resp200.content?.['application/json']?.schema
          : resp200.schema

        if (schema) {
          responseFields = extractSchemaFields(schema, defs)
        }
      }

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        parameters,
        responseFields,
      })
    }
  }

  return { info, endpoints }
}

function buildV2BaseUrl(s: Record<string, any>): string | undefined {
  if (!s.host) return undefined
  const scheme = s.schemes?.[0] ?? 'https'
  const basePath = s.basePath ?? ''
  return `${scheme}://${s.host}${basePath}`
}

function openApiTypeToTs(type?: string, format?: string): string {
  if (!type) return 'any'
  switch (type) {
    case 'string':
      return format === 'date-time' ? 'string' : 'string'
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'any[]'
    case 'object':
      return 'object'
    default:
      return 'any'
  }
}

function extractSchemaFields(schema: any, defs?: Record<string, any>): string[] {
  let resolved = schema

  if (schema.$ref && defs) {
    const segments = schema.$ref.split('/')
    const refName = segments[segments.length - 1]
    if (refName && defs[refName]) {
      resolved = defs[refName]
    }
  }

  if (resolved.properties) {
    return Object.keys(resolved.properties)
  }

  if (resolved.type === 'array' && resolved.items) {
    const itemRef = resolved.items.$ref
    const items =
      itemRef && defs
        ? (defs[itemRef.split('/').pop()!] ?? resolved.items)
        : resolved.items
    if (items.properties) {
      return Object.keys(items.properties).map((k) => `[].${k}`)
    }
  }

  return []
}

export function isOpenApiSpec(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, any>
  return typeof s.openapi === 'string' || typeof s.swagger === 'string'
}
