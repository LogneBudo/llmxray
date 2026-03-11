import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SessionMetrics, AggregateMetrics } from '@/types/metrics'

export const useMetricsStore = defineStore('metrics', () => {
  const metricsBySession = ref<Map<string, SessionMetrics>>(new Map())
  const aggregate = ref<AggregateMetrics>({
    totalSessions: 0,
    avgTtftMs: 0,
    avgTps: 0,
    avgTotalDurationMs: 0,
    totalTokensGenerated: 0,
    totalPromptsEvaluated: 0,
    modelsUsed: [],
  })

  const metricsHistory = computed<SessionMetrics[]>(() => {
    return [...metricsBySession.value.values()].sort(
      (a, b) => a.startedAt - b.startedAt,
    )
  })

  function getMetrics(sessionId: string): SessionMetrics | null {
    return metricsBySession.value.get(sessionId) ?? null
  }

  function recordMetrics(sessionId: string, metrics: SessionMetrics) {
    metricsBySession.value.set(sessionId, metrics)
  }

  function recalculateAggregate() {
    const all = [...metricsBySession.value.values()]
    if (all.length === 0) return

    const models = new Set<string>()
    let totalTtft = 0
    let totalTps = 0
    let totalDuration = 0
    let totalTokens = 0
    let totalPromptTokens = 0

    for (const m of all) {
      models.add(m.model)
      totalTtft += m.ttftMs
      totalTps += m.tokensPerSecond
      totalDuration += m.totalDurationMs
      totalTokens += m.completionTokenCount
      totalPromptTokens += m.promptTokenCount
    }

    aggregate.value = {
      totalSessions: all.length,
      avgTtftMs: totalTtft / all.length,
      avgTps: totalTps / all.length,
      avgTotalDurationMs: totalDuration / all.length,
      totalTokensGenerated: totalTokens,
      totalPromptsEvaluated: totalPromptTokens,
      modelsUsed: [...models],
    }
  }

  return {
    metricsBySession,
    aggregate,
    metricsHistory,
    getMetrics,
    recordMetrics,
    recalculateAggregate,
  }
})
