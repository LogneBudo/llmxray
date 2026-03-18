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

// Token Tax (Language Compare mode)
const hasLanguageData = computed(() =>
  props.executions.some(e => e.language && e.status === 'completed')
)

const tokenTaxEntries = computed(() => {
  const completed = props.executions
    .filter(e => e.language && e.status === 'completed' && e.sessionId)
    .map(e => ({
      slotId: e.slotId,
      label: e.label || e.model,
      language: e.language!,
      promptTokens: metricsStore.getMetrics(e.sessionId)?.promptTokenCount ?? 0,
    }))

  const minTokens = Math.min(...completed.map(e => e.promptTokens).filter(t => t > 0)) || 1
  const maxTokens = Math.max(...completed.map(e => e.promptTokens)) || 1

  return completed.map(e => ({
    ...e,
    ratio: e.promptTokens / minTokens,
    barWidth: (e.promptTokens / maxTokens) * 100,
    taxColor: e.promptTokens / minTokens <= 1.1 ? 'bg-success'
      : e.promptTokens / minTokens <= 2 ? 'bg-warning'
      : 'bg-error',
  }))
})
</script>

<template>
  <div v-if="entries.length >= 2" class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
    <h4 class="text-xs font-medium text-text-secondary">{{ $t('comparison.metrics.performanceComparison') }}</h4>

    <!-- TTFT (lower is better) -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] text-text-muted">{{ $t('comparison.metrics.timeToFirstToken') }}</span>
        <span class="text-[10px] text-text-muted">{{ $t('comparison.metrics.lowerBetter') }}</span>
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
        <span class="text-[11px] text-text-muted">{{ $t('comparison.metrics.tokensPerSec') }}</span>
        <span class="text-[10px] text-text-muted">{{ $t('comparison.metrics.higherBetter') }}</span>
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
        <span class="text-[11px] text-text-muted">{{ $t('comparison.metrics.totalTokens') }}</span>
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

    <!-- Token Tax (Language Compare mode) -->
    <div v-if="hasLanguageData" class="space-y-2">
      <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide">
        {{ $t('comparison.language.tokenTaxTitle') }}
      </h4>
      <!-- Prompt Token bars -->
      <div class="space-y-1.5">
        <div v-for="entry in tokenTaxEntries" :key="entry.slotId" class="flex items-center gap-2">
          <span class="w-28 truncate text-end text-xs text-text-secondary">{{ entry.label }}</span>
          <div class="flex-1 h-4 rounded-full bg-surface-overlay overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="entry.taxColor"
              :style="{ width: entry.barWidth + '%' }"
            />
          </div>
          <span class="w-20 text-xs text-text-secondary">
            {{ entry.promptTokens }} tokens
            <span v-if="entry.ratio > 1" class="font-medium" :class="entry.taxColor.replace('bg-', 'text-')">
              ({{ entry.ratio.toFixed(1) }}x)
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
