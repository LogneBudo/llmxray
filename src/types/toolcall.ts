export type ToolCallStatus = 'pending' | 'executing' | 'completed' | 'failed'

export interface ToolCallEntry {
  id: string
  sessionId: string
  index: number
  functionName: string
  arguments: Record<string, unknown>
  result?: unknown
  status: ToolCallStatus
  startedAt: number
  completedAt?: number
  durationMs?: number
  tokenIndexStart: number
  tokenIndexEnd?: number
  error?: string
}
