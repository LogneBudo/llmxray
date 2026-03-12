import type {
  WorkshopTool,
  ToolExecutionResult,
  ToolActionBlock,
  HttpRequestConfig,
  ExtractFieldConfig,
  TemplateConfig,
  ReturnValueConfig,
} from '@/types/tool-workshop'

/**
 * Execute a workshop tool with the given arguments.
 */
export async function executeTool(
  tool: WorkshopTool,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const start = performance.now()
  try {
    let result: unknown
    if (tool.implementation.mode === 'code') {
      result = await executeCode(tool.implementation.code, args)
    } else {
      result = await executeBlocks(tool.implementation.blocks, args)
    }
    return {
      success: true,
      result,
      durationMs: performance.now() - start,
    }
  } catch (err) {
    return {
      success: false,
      result: null,
      durationMs: performance.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// --- Code Mode Execution ---

async function executeCode(
  code: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!code.trim()) throw new Error('Tool has no implementation code')

  // Create an async function from the user's code
  // The function receives `args` (tool arguments) and `fetch` (for HTTP requests)
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...params: string[]
  ) => (...funcArgs: unknown[]) => Promise<unknown>

  const fn = new AsyncFunction('args', 'fetch', 'getGoogleToken', code)
  return await fn(args, fetch.bind(globalThis), getGoogleTokenHelper)
}

// --- Visual Block Execution ---

async function executeBlocks(
  blocks: ToolActionBlock[],
  args: Record<string, unknown>,
): Promise<unknown> {
  if (blocks.length === 0) throw new Error('Tool has no action blocks')

  // Context holds variables that blocks can read/write
  const ctx = new Map<string, unknown>()
  // Seed context with tool arguments
  for (const [k, v] of Object.entries(args)) {
    ctx.set(k, v)
  }

  const sorted = [...blocks].sort((a, b) => a.order - b.order)
  let finalResult: unknown = null

  for (const block of sorted) {
    switch (block.type) {
      case 'http_request':
        await executeHttpRequest(block.config as HttpRequestConfig, ctx)
        break
      case 'extract_field':
        executeExtractField(block.config as ExtractFieldConfig, ctx)
        break
      case 'template':
        executeTemplate(block.config as TemplateConfig, ctx)
        break
      case 'return_value':
        finalResult = resolveReturnValue(block.config as ReturnValueConfig, ctx)
        break
    }
  }

  return finalResult
}

// --- Block Handlers ---

async function executeHttpRequest(config: HttpRequestConfig, ctx: Map<string, unknown>) {
  const url = interpolate(config.url, ctx)
  const body = config.body ? interpolate(config.body, ctx) : undefined
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(config.headers)) {
    headers[k] = interpolate(v, ctx)
  }

  const res = await fetch(url, {
    method: config.method,
    headers,
    body: config.method !== 'GET' ? body : undefined,
  })

  let data: unknown
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  ctx.set(config.outputVariable || 'response', data)
}

function executeExtractField(config: ExtractFieldConfig, ctx: Map<string, unknown>) {
  const input = ctx.get(config.input)
  if (input == null) {
    ctx.set(config.outputVariable || 'value', null)
    return
  }

  // Navigate the field path (e.g., "data.temperature.value")
  const parts = config.fieldPath.split('.')
  let current: unknown = input
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      current = null
      break
    }
    current = (current as Record<string, unknown>)[part]
  }

  ctx.set(config.outputVariable || 'value', current)
}

function executeTemplate(config: TemplateConfig, ctx: Map<string, unknown>) {
  const result = interpolate(config.template, ctx)
  ctx.set(config.outputVariable || 'text', result)
}

function resolveReturnValue(config: ReturnValueConfig, ctx: Map<string, unknown>): unknown {
  const expr = config.expression.trim()
  // If it matches a variable name, return that variable
  if (ctx.has(expr)) return ctx.get(expr)
  // Otherwise treat as a template string
  return interpolate(expr, ctx)
}

// --- Helpers ---

/**
 * Lazy-loaded helper that tool code can call to get a Google access token.
 * Uses dynamic import to avoid loading google-auth unless a tool actually needs it.
 */
async function getGoogleTokenHelper(): Promise<string> {
  const { getAccessToken, isConnected } = await import('./google-auth')
  if (!isConnected()) {
    throw new Error('Google account not connected. Go to Settings to connect your Google account.')
  }
  return getAccessToken()
}

/**
 * Replace {{varName}} placeholders with values from context.
 */
function interpolate(template: string, ctx: Map<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
    // Support dotted paths like {{response.data}}
    const parts = key.split('.')
    let value: unknown = ctx.get(parts[0] ?? '')
    for (let i = 1; i < parts.length; i++) {
      if (value == null || typeof value !== 'object') return ''
      value = (value as Record<string, unknown>)[parts[i] ?? '']
    }
    if (value == null) return ''
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
  })
}
