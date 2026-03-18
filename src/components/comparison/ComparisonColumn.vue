<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComparisonExecution, ComparisonSlot } from '@/types/comparison'
import { useMetricsStore } from '@/stores/metrics-store'
import { formatDuration, formatTps } from '@/utils/format'
import { LANGUAGE_NAMES } from '@/utils/slot-labels'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TokenStreamDisplay from '@/components/token-stream/TokenStreamDisplay.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  execution: ComparisonExecution
  slotConfig?: ComparisonSlot
  sharedPrompt?: string
}>()

const metricsStore = useMetricsStore()
const showPrompt = ref(false)

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
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-text-primary">{{ displayName }}</span>
          <span v-if="execution.language" class="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            {{ LANGUAGE_NAMES[execution.language] ?? execution.language }}
          </span>
        </div>
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
      <!-- Prompt override display (only for machine-translated prompts) -->
      <div v-if="slotConfig?.wasTranslated && execution.effectivePrompt" class="mb-2 rounded-lg bg-surface p-2">
        <button class="flex items-center gap-1 text-[10px] text-text-muted" @click="showPrompt = !showPrompt">
          <ChevronDown class="h-3 w-3 transition-transform" :class="showPrompt ? 'rotate-180' : ''" />
          {{ $t('comparison.language.promptText') }}
        </button>
        <p v-if="showPrompt" class="mt-1 text-xs text-text-secondary" :dir="['ar', 'he'].includes(execution.language ?? '') ? 'rtl' : 'ltr'">
          {{ execution.effectivePrompt }}
        </p>
      </div>

      <TokenStreamDisplay
        v-if="execution.sessionId"
        :session-id="execution.sessionId"
      />

      <div v-if="metrics" class="grid gap-2" :class="execution.language ? 'grid-cols-4' : 'grid-cols-3'">
        <MetricCard :label="$t('comparison.metrics.ttft')" :value="formatDuration(metrics.ttftMs)" />
        <MetricCard :label="$t('comparison.metrics.speed')" :value="formatTps(metrics.tokensPerSecond)" />
        <MetricCard :label="$t('comparison.column.tokens')" :value="metrics.completionTokenCount" />
        <MetricCard v-if="execution.language" :label="$t('comparison.language.promptTokens')" :value="metrics.promptTokenCount" />
      </div>
    </div>
  </div>
</template>
