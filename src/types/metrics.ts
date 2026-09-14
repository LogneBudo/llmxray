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
  /**
   * Prefill throughput over the tokens actually evaluated — cached prompt
   * tokens are excluded, because since Ollama 0.33.3 `prompt_eval_duration`
   * times only those. 0 when the whole prompt came from cache.
   */
  promptTokensPerSecond: number
  promptTokenCount: number
  /**
   * Prompt tokens served from the KV cache. Undefined — not 0 — when the
   * daemon never reported the field (before Ollama 0.33.3, or a runner that
   * omits it), so "unknown" stays distinguishable from "nothing was cached".
   */
  cachedPromptTokenCount?: number
  /** Share of the prompt served from cache, 0..1. Undefined when unreported. */
  promptCacheHitRate?: number
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
