<script setup lang="ts">
import { computed } from 'vue'
import type { ComparisonExecution, ComparisonSlot } from '@/types/comparison'
import { useMetricsStore } from '@/stores/metrics-store'
import { formatDuration, formatTps } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TokenStreamDisplay from '@/components/token-stream/TokenStreamDisplay.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'

const props = defineProps<{
  execution: ComparisonExecution
  slotConfig?: ComparisonSlot
}>()

const metricsStore = useMetricsStore()

const metrics = computed(() => {
  if (!props.execution.sessionId) return null
  return metricsStore.getMetrics(props.execution.sessionId)
})

const displayName = computed(() => props.execution.label || props.execution.model)

const settingsPills = computed(() => {
  if (!props.slotConfig) return []
  const pills: string[] = []
  const opts = props.slotConfig.options
  if (opts.temperature != null) pills.push(`temp ${opts.temperature.toFixed(1)}`)
  if (opts.top_p != null) pills.push(`top_p ${opts.top_p}`)
  if (opts.seed != null) pills.push(`seed ${opts.seed}`)
  if (props.slotConfig.system) pills.push('sys prompt')
  return pills
})
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised overflow-hidden">
    <div class="border-b border-border-default px-4 py-3 space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-text-primary">{{ displayName }}</span>
        <StatusBadge :status="execution.status" />
      </div>
      <div v-if="settingsPills.length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="pill in settingsPills"
          :key="pill"
          class="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-muted"
        >
          {{ pill }}
        </span>
      </div>
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
