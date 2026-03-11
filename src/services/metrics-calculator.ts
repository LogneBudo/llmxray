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

  const tokensPerSecond =
    evalDurationMs > 0 ? (completionTokenCount / evalDurationMs) * 1000 : 0
  const promptTokensPerSecond =
    promptEvalDurationMs > 0 ? (promptTokenCount / promptEvalDurationMs) * 1000 : 0

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
    completionTokenCount,
    totalTokenCount: promptTokenCount + completionTokenCount,
    tokenLatencies,
  }
}
