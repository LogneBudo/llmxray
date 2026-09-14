import type { OllamaGenerateChunk, OllamaChatChunk } from '@/types/ollama'
import type { SessionMetrics } from '@/types/metrics'

const NS_TO_MS = 1_000_000

export function calculateMetrics(
  sessionId: string,
  model: string,
  startedAt: number,
  finalChunk: OllamaGenerateChunk | OllamaChatChunk,
  tokenLatencies: number[],
): SessionMetrics {
  const totalDurationMs = (finalChunk.total_duration ?? 0) / NS_TO_MS
  const loadDurationMs = (finalChunk.load_duration ?? 0) / NS_TO_MS
  const promptEvalDurationMs = (finalChunk.prompt_eval_duration ?? 0) / NS_TO_MS
  const evalDurationMs = (finalChunk.eval_duration ?? 0) / NS_TO_MS

  const promptTokenCount = finalChunk.prompt_eval_count ?? 0
  const completionTokenCount = finalChunk.eval_count ?? 0

  // Ollama 0.33.3 split the prompt into cached and uncached halves:
  // `prompt_eval_count` stays the TOTAL while `prompt_eval_duration` times
  // only the uncached tokens. Dividing the total by that duration reports a
  // prefill rate inflated by the cache hit ratio (a 37-of-38 cache hit read
  // 38x too fast), so the rate is taken over the uncached tokens alone.
  // Left undefined when the daemon does not report the field, so an older
  // daemon reads as "unknown" rather than as a confident zero.
  const reportedCached = finalChunk.prompt_eval_cached_count
  const cachedPromptTokenCount =
    reportedCached === undefined ? undefined : Math.min(reportedCached, promptTokenCount)
  const evaluatedPromptTokenCount = promptTokenCount - (cachedPromptTokenCount ?? 0)

  const tokensPerSecond =
    evalDurationMs > 0 ? (completionTokenCount / evalDurationMs) * 1000 : 0
  const promptTokensPerSecond =
    promptEvalDurationMs > 0 && evaluatedPromptTokenCount > 0
      ? (evaluatedPromptTokenCount / promptEvalDurationMs) * 1000
      : 0

  const ttftMs = tokenLatencies.length > 0 ? tokenLatencies[0]! : 0

  return {
    sessionId,
    model,
    startedAt,
    completedAt: Date.now(),
    ttftMs,
    totalDurationMs,
    loadDurationMs,
    promptEvalDurationMs,
    evalDurationMs,
    tokensPerSecond,
    promptTokensPerSecond,
    promptTokenCount,
    cachedPromptTokenCount,
    promptCacheHitRate:
      cachedPromptTokenCount !== undefined && promptTokenCount > 0
        ? cachedPromptTokenCount / promptTokenCount
        : undefined,
    completionTokenCount,
    totalTokenCount: promptTokenCount + completionTokenCount,
    tokenLatencies,
  }
}
