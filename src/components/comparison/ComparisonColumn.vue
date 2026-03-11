<script setup lang="ts">
import { computed } from 'vue'
import type { ComparisonExecution } from '@/types/comparison'
import { useMetricsStore } from '@/stores/metrics-store'
import { formatDuration, formatTps } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TokenStreamDisplay from '@/components/token-stream/TokenStreamDisplay.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'

const props = defineProps<{
  execution: ComparisonExecution
}>()

const metricsStore = useMetricsStore()

const metrics = computed(() => {
  if (!props.execution.sessionId) return null
  return metricsStore.getMetrics(props.execution.sessionId)
})
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised overflow-hidden">
    <div class="flex items-center justify-between border-b border-border-default px-4 py-3">
      <span class="text-sm font-semibold text-text-primary">{{ execution.model }}</span>
      <StatusBadge :status="execution.status" />
    </div>

    <div class="p-4 space-y-3">
      <TokenStreamDisplay
        v-if="execution.sessionId"
        :session-id="execution.sessionId"
      />

      <div v-if="metrics" class="grid grid-cols-3 gap-2">
        <MetricCard label="TTFT" :value="formatDuration(metrics.ttftMs)" />
        <MetricCard label="Speed" :value="formatTps(metrics.tokensPerSecond)" />
        <MetricCard label="Tokens" :value="metrics.completionTokenCount" />
      </div>
    </div>
  </div>
</template>
