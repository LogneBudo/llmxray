<script setup lang="ts">
import { computed } from 'vue'
import type { SessionMetrics } from '@/types/metrics'
import { formatDuration, formatTps, formatNumber, formatPercent } from '@/utils/format'
import MetricCard from './MetricCard.vue'
import LatencyChart from './LatencyChart.vue'
import TokenCountBar from './TokenCountBar.vue'

const props = defineProps<{
  metrics: SessionMetrics | null
}>()

const cards = computed(() => {
  const m = props.metrics
  if (!m) return []
  const base = [
    { label: 'Time to First Token', value: formatDuration(m.ttftMs), unit: '' },
    { label: 'Tokens/Second', value: formatTps(m.tokensPerSecond), unit: '' },
    { label: 'Total Duration', value: formatDuration(m.totalDurationMs), unit: '' },
    { label: 'Prompt Tokens', value: formatNumber(m.promptTokenCount), unit: 'tok' },
    { label: 'Completion Tokens', value: formatNumber(m.completionTokenCount), unit: 'tok' },
    { label: 'Model Load', value: formatDuration(m.loadDurationMs), unit: '' },
  ]

  // Ollama 0.33.3+ reports how much of the prompt came from the KV cache.
  // Undefined means the daemon never said, which is not the same as zero —
  // in that case the card is omitted rather than showing a confident 0%.
  if (m.cachedPromptTokenCount !== undefined) {
    base.push({
      label: 'Cached Prompt',
      value: formatNumber(m.cachedPromptTokenCount),
      unit: `tok · ${formatPercent(m.promptCacheHitRate ?? 0)}`,
    })
  }
  return base
})
</script>

<template>
  <div v-if="metrics" class="space-y-4">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        v-for="card in cards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :unit="card.unit"
      />
    </div>
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <LatencyChart :token-latencies="metrics.tokenLatencies" />
      <TokenCountBar
        :prompt-tokens="metrics.promptTokenCount"
        :completion-tokens="metrics.completionTokenCount"
        :cached-prompt-tokens="metrics.cachedPromptTokenCount"
      />
    </div>
  </div>
  <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
    Metrics will appear after generation completes.
  </div>
</template>
