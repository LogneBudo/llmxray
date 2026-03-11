import { computed } from 'vue'
import type { Ref } from 'vue'
import { useMetricsStore } from '@/stores/metrics-store'

export function useMetrics(sessionId?: Ref<string | null>) {
  const metricsStore = useMetricsStore()

  const currentMetrics = computed(() => {
    if (!sessionId?.value) return null
    return metricsStore.getMetrics(sessionId.value)
  })

  const aggregate = computed(() => metricsStore.aggregate)
  const history = computed(() => metricsStore.metricsHistory)

  return {
    currentMetrics,
    aggregate,
    history,
  }
}
