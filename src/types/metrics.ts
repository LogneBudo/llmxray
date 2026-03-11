export interface SessionMetrics {
  sessionId: string
  model: string
  startedAt: number
  completedAt?: number
  ttftMs: number
  totalDurationMs: number
  loadDurationMs: number
  promptEvalDurationMs: number
  evalDurationMs: number
  tokensPerSecond: number
  promptTokensPerSecond: number
  promptTokenCount: number
  completionTokenCount: number
  totalTokenCount: number
  tokenLatencies: number[]
}

export interface AggregateMetrics {
  totalSessions: number
  avgTtftMs: number
  avgTps: number
  avgTotalDurationMs: number
  totalTokensGenerated: number
  totalPromptsEvaluated: number
  modelsUsed: string[]
}
