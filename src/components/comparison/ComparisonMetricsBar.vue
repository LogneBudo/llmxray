<script setup lang="ts">
import { computed } from 'vue'
import type { ComparisonExecution } from '@/types/comparison'
import { useMetricsStore } from '@/stores/metrics-store'

const props = defineProps<{
  executions: ComparisonExecution[]
}>()

const metricsStore = useMetricsStore()

interface MetricEntry {
  label: string
  slotId: string
  ttftMs: number
  tokensPerSecond: number
  totalTokens: number
}

const entries = computed<MetricEntry[]>(() => {
  return props.executions
    .filter((e) => e.status === 'completed' && e.sessionId)
    .map((e) => {
      const m = metricsStore.getMetrics(e.sessionId)
      return {
        label: e.label || e.model,
        slotId: e.slotId,
        ttftMs: m?.ttftMs ?? 0,
        tokensPerSecond: m?.tokensPerSecond ?? 0,
        totalTokens: m?.completionTokenCount ?? 0,
      }
    })
})

const maxTtft = computed(() => Math.max(...entries.value.map((e) => e.ttftMs), 1))
const maxTps = computed(() => Math.max(...entries.value.map((e) => e.tokensPerSecond), 1))
const maxTokens = computed(() => Math.max(...entries.value.map((e) => e.totalTokens), 1))

const bestTtft = computed(() => {
  if (entries.value.length === 0) return ''
  return entries.value.reduce((a, b) => (a.ttftMs < b.ttftMs && a.ttftMs > 0 ? a : b)).slotId
})

const bestTps = computed(() => {
  if (entries.value.length === 0) return ''
  return entries.value.reduce((a, b) => (a.tokensPerSecond > b.tokensPerSecond ? a : b)).slotId
})

const COLORS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-error']

function barColor(idx: number): string {
  return COLORS[idx % COLORS.length] ?? 'bg-accent'
}
</script>

<template>
  <div v-if="entries.length >= 2" class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
    <h4 class="text-xs font-medium text-text-secondary">Performance Comparison</h4>

    <!-- TTFT (lower is better) -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-muted">Time to First Token</span>
        <span class="text-[10px] text-text-muted">lower is better</span>
      </div>
      <div v-for="(entry, idx) in entries" :key="entry.slotId + '-ttft'" class="flex items-center gap-2">
        <span class="text-[10px] text-text-secondary w-28 truncate shrink-0">{{ entry.label }}</span>
        <div class="flex-1 h-3 bg-surface rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="[barColor(idx), entry.slotId === bestTtft ? 'opacity-100' : 'opacity-50']"
            :style="{ width: `${(entry.ttftMs / maxTtft) * 100}%` }"
          />
        </div>
        <span class="text-[10px] text-text-muted w-14 text-right shrink-0">{{ entry.ttftMs.toFixed(0) }}ms</span>
      </div>
    </div>

    <!-- Tokens/sec (higher is better) -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-muted">Tokens/sec</span>
        <span class="text-[10px] text-text-muted">higher is better</span>
      </div>
      <div v-for="(entry, idx) in entries" :key="entry.slotId + '-tps'" class="flex items-center gap-2">
        <span class="text-[10px] text-text-secondary w-28 truncate shrink-0">{{ entry.label }}</span>
        <div class="flex-1 h-3 bg-surface rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="[barColor(idx), entry.slotId === bestTps ? 'opacity-100' : 'opacity-50']"
            :style="{ width: `${(entry.tokensPerSecond / maxTps) * 100}%` }"
          />
        </div>
        <span class="text-[10px] text-text-muted w-14 text-right shrink-0">{{ entry.tokensPerSecond.toFixed(1) }}</span>
      </div>
    </div>

    <!-- Total tokens -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-muted">Total Tokens</span>
      </div>
      <div v-for="(entry, idx) in entries" :key="entry.slotId + '-tokens'" class="flex items-center gap-2">
        <span class="text-[10px] text-text-secondary w-28 truncate shrink-0">{{ entry.label }}</span>
        <div class="flex-1 h-3 bg-surface rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor(idx)"
            :style="{ width: `${(entry.totalTokens / maxTokens) * 100}%` }"
          />
        </div>
        <span class="text-[10px] text-text-muted w-14 text-right shrink-0">{{ entry.totalTokens }}</span>
      </div>
    </div>
  </div>
</template>
