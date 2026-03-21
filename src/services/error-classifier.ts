export type ErrorCategory =
  | 'connection'
  | 'timeout'
  | 'model_not_found'
  | 'context_exceeded'
  | 'oom'
  | 'cancelled'
  | 'tool_error'
  | 'unknown'

export interface ClassifiedError {
  category: ErrorCategory
  label: string
  original: string
}

const PATTERNS: [RegExp, ErrorCategory, string][] = [
  [/connection refused|ECONNREFUSED|fetch failed|network error|Failed to fetch/i, 'connection', 'Connection refused'],
  [/timed?\s*out|ETIMEDOUT|deadline exceeded/i, 'timeout', 'Timeout'],
  [/model.*not found|no such model|unknown model|pull.*first/i, 'model_not_found', 'Model not found'],
  [/context length|context window|too long|maximum context|num_ctx/i, 'context_exceeded', 'Context exceeded'],
  [/out of memory|OOM|CUDA.*memory|not enough memory|VRAM/i, 'oom', 'Out of memory'],
  [/cancel|abort/i, 'cancelled', 'Cancelled'],
  [/tool.*no implementation|tool.*failed|tool.*error/i, 'tool_error', 'Tool error'],
]

export function classifyError(error: string): ClassifiedError {
  for (const [pattern, category, label] of PATTERNS) {
    if (pattern.test(error)) {
      return { category, label, original: error }
    }
  }
  return { category: 'unknown', label: 'Unknown error', original: error }
}

export const ERROR_COLORS: Record<ErrorCategory, string> = {
  connection: '#ef4444',
  timeout: '#f97316',
  model_not_found: '#eab308',
  context_exceeded: '#a855f7',
  oom: '#dc2626',
  cancelled: '#6b7280',
  tool_error: '#f472b6',
  unknown: '#94a3b8',
}
