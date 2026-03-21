import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMetricsStore } from './metrics-store'
import { findPricing, calculateCost } from '@/data/model-pricing'
import type { ModelUsageSummary, DailyUsageSummary } from '@/types/cost'

export const useCostStore = defineStore('cost', () => {
  const metricsStore = useMetricsStore()

  const modelUsage = computed<ModelUsageSummary[]>(() => {
    const byModel = new Map<string, ModelUsageSummary>()

    for (const m of metricsStore.metricsBySession.values()) {
      const existing = byModel.get(m.model)
      if (existing) {
        existing.promptTokens += m.promptTokenCount
        existing.completionTokens += m.completionTokenCount
        existing.totalTokens += m.totalTokenCount
        existing.sessionCount++
      } else {
        const pricing = findPricing(m.model)
        byModel.set(m.model, {
          model: m.model,
          promptTokens: m.promptTokenCount,
          completionTokens: m.completionTokenCount,
          totalTokens: m.totalTokenCount,
          sessionCount: 1,
          estimatedCost: 0,
          pricing,
        })
      }
    }

    const result = [...byModel.values()]
    for (const entry of result) {
      entry.estimatedCost = calculateCost(entry.promptTokens, entry.completionTokens, entry.pricing)
    }
    return result.sort((a, b) => b.totalTokens - a.totalTokens)
  })

  const dailyUsage = computed<DailyUsageSummary[]>(() => {
    const byDay = new Map<string, DailyUsageSummary>()

    for (const m of metricsStore.metricsBySession.values()) {
      const date = new Date(m.startedAt).toISOString().slice(0, 10)
      const existing = byDay.get(date)
      const pricing = findPricing(m.model)
      const cost = calculateCost(m.promptTokenCount, m.completionTokenCount, pricing)

      if (existing) {
        existing.promptTokens += m.promptTokenCount
        existing.completionTokens += m.completionTokenCount
        existing.totalTokens += m.totalTokenCount
        existing.sessionCount++
        existing.estimatedCost += cost
      } else {
        byDay.set(date, {
          date,
          promptTokens: m.promptTokenCount,
          completionTokens: m.completionTokenCount,
          totalTokens: m.totalTokenCount,
          sessionCount: 1,
          estimatedCost: cost,
        })
      }
    }

    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  })

  const totalEstimatedCost = computed(() =>
    modelUsage.value.reduce((sum, m) => sum + m.estimatedCost, 0),
  )

  const totalTokens = computed(() =>
    modelUsage.value.reduce((sum, m) => sum + m.totalTokens, 0),
  )

  const totalSessions = computed(() =>
    modelUsage.value.reduce((sum, m) => sum + m.sessionCount, 0),
  )

  const avgCostPerSession = computed(() =>
    totalSessions.value > 0 ? totalEstimatedCost.value / totalSessions.value : 0,
  )

  return {
    modelUsage,
    dailyUsage,
    totalEstimatedCost,
    totalTokens,
    totalSessions,
    avgCostPerSession,
  }
})
