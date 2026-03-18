import { historyDB, type HistoryEntry } from './history-db'
import type { BenchmarkResult } from '@/types/benchmark'
import type { ComparisonRun } from '@/types/comparison'
import type { SessionMetrics } from '@/types/metrics'
import { LANGUAGE_NAMES } from '@/utils/slot-labels'

/**
 * Record a completed benchmark run in the history database.
 */
export function recordBenchmark(result: BenchmarkResult): void {
  const accuracy = (result.accuracy * 100).toFixed(1)
  const suites = result.benchmarkIds.join(', ')
  const duration = result.completedAt
    ? Math.round((result.completedAt - result.startedAt) / 1000)
    : 0

  const entry: HistoryEntry = {
    type: 'benchmark',
    timestamp: result.startedAt,
    model: result.modelName,
    tags: [],
    benchmarkSuites: result.benchmarkIds,
    accuracy: result.accuracy,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    durationMs: duration * 1000,
    sourceId: result.id,
    sourceDb: 'llmxray-benchmarks',
    summary: `Benchmark: ${result.modelName} — ${accuracy}% on ${suites} (${result.correctCount}/${result.totalQuestions})`,
  }

  historyDB.entries.add(entry).catch(() => { /* best-effort */ })
}

/**
 * Record a completed comparison run in the history database.
 */
export function recordComparison(run: ComparisonRun): void {
  const models = [...new Set(run.executions.map(e => e.model))]
  const hasLanguages = run.executions.some(e => e.language)
  const languages = run.executions.filter(e => e.language).map(e => e.language!)

  // Calculate token tax ratio if language data exists
  let tokenTaxRatio: number | undefined
  let primaryLanguage: string | undefined
  if (hasLanguages) {
    const promptTokens = run.executions
      .filter(e => e.metrics?.promptTokenCount)
      .map(e => ({ lang: e.language ?? '?', tokens: e.metrics!.promptTokenCount }))
    if (promptTokens.length >= 2) {
      const min = Math.min(...promptTokens.map(t => t.tokens))
      const max = Math.max(...promptTokens.map(t => t.tokens))
      tokenTaxRatio = min > 0 ? max / min : undefined
      const highest = promptTokens.find(t => t.tokens === max)
      primaryLanguage = highest?.lang
    }
  }

  let summary: string
  if (hasLanguages) {
    const langNames = languages.map(l => LANGUAGE_NAMES[l] ?? l).join(' vs ')
    const ratioStr = tokenTaxRatio ? ` · Tax: ${tokenTaxRatio.toFixed(1)}x` : ''
    summary = `Language Compare: ${langNames} — ${models[0]}${ratioStr}`
  } else {
    summary = `Comparison: ${models.join(' vs ')} — ${run.executions.length} slots`
  }

  const entry: HistoryEntry = {
    type: 'comparison',
    timestamp: run.createdAt,
    model: models[0] ?? '',
    language: primaryLanguage,
    languages,
    tags: [],
    tokenTaxRatio,
    slotCount: run.executions.length,
    sourceId: run.id,
    sourceDb: 'llmxray-comparisons',
    summary,
  }

  historyDB.entries.add(entry).catch(() => { /* best-effort */ })
}

/**
 * Record a chat conversation in the history database.
 */
export function recordChat(
  conversationId: string,
  model: string,
  name: string,
  messageCount: number,
  totalTokens?: number,
): void {
  const entry: HistoryEntry = {
    type: 'chat',
    timestamp: Date.now(),
    model,
    tags: [],
    conversationId,
    messageCount,
    totalTokens,
    sourceId: conversationId,
    sourceDb: 'llmxray-conversations',
    summary: `Chat: "${name || 'Untitled'}" — ${model} · ${messageCount} messages`,
  }

  historyDB.entries.add(entry).catch(() => { /* best-effort */ })
}

/**
 * Record a training pair in the history database.
 */
export function recordTrainingPair(
  pairId: string,
  model: string,
  phase: string,
  toolName?: string,
  accepted?: boolean,
): void {
  const entry: HistoryEntry = {
    type: 'training',
    timestamp: Date.now(),
    model,
    tags: [],
    phase,
    accepted,
    sourceId: pairId,
    sourceDb: 'llmxray-canvas-ai',
    summary: `Training: ${phase} phase${toolName ? ` — ${toolName}` : ''} · ${accepted ? 'accepted' : 'pending'}`,
  }

  historyDB.entries.add(entry).catch(() => { /* best-effort */ })
}

/**
 * Record a session with metrics in the history database.
 */
export function recordSession(
  sessionId: string,
  model: string,
  metrics: SessionMetrics,
): void {
  const entry: HistoryEntry = {
    type: 'session',
    timestamp: metrics.startedAt,
    model,
    tags: [],
    promptTokens: metrics.promptTokenCount,
    completionTokens: metrics.completionTokenCount,
    totalTokens: metrics.totalTokenCount,
    ttftMs: metrics.ttftMs,
    tokensPerSecond: metrics.tokensPerSecond,
    durationMs: metrics.totalDurationMs,
    sourceId: sessionId,
    sourceDb: 'llmxray-conversations',
    summary: `Session: ${model} · ${metrics.completionTokenCount} tokens · ${metrics.tokensPerSecond.toFixed(1)} tok/s`,
  }

  historyDB.entries.add(entry).catch(() => { /* best-effort */ })
}
