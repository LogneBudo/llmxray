<script setup lang="ts">
import { ref, computed } from 'vue'
import { useComparisonStore } from '@/stores/comparison-store'
import { useSessionStore } from '@/stores/session-store'
import { startGeneration } from '@/services/generate-service'
import ComparisonSlotConfigurator from '@/components/comparison/ComparisonSlotConfigurator.vue'
import ComparisonGrid from '@/components/comparison/ComparisonGrid.vue'
import ComparisonDiffView from '@/components/comparison/ComparisonDiffView.vue'
import ComparisonMetricsBar from '@/components/comparison/ComparisonMetricsBar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { ComparisonSlot } from '@/types/comparison'

const comparisonStore = useComparisonStore()
const sessionStore = useSessionStore()

const slots = ref<ComparisonSlot[]>([])
const prompt = ref('')
const isRunning = ref(false)
const viewMode = ref<'grid' | 'diff'>('grid')

const activeRun = computed(() => comparisonStore.activeRun)
const canRun = computed(() => slots.value.length > 0 && prompt.value.trim().length > 0 && !isRunning.value)
const hasCompletedResults = computed(() =>
  activeRun.value?.executions.some((e) => e.status === 'completed') ?? false,
)

async function runComparison() {
  if (!canRun.value) return

  isRunning.value = true
  viewMode.value = 'grid'
  const runId = comparisonStore.createRun(prompt.value.trim(), slots.value)

  const promises = slots.value.map(async (slot) => {
    try {
      const result = await startGeneration({
        model: slot.model,
        prompt: prompt.value.trim(),
        system: slot.system || undefined,
        options: slot.options,
      })
      comparisonStore.updateExecution(runId, slot.slotId, {
        sessionId: result.sessionId,
        status: 'streaming',
      })

      const checkInterval = setInterval(() => {
        const session = sessionStore.sessionById(result.sessionId)
        if (session && (session.status === 'completed' || session.status === 'error')) {
          comparisonStore.updateExecution(runId, slot.slotId, {
            status: session.status,
            outputText: session.outputText,
            metrics: session.metrics,
          })
          clearInterval(checkInterval)
          comparisonStore.finalizeRun(runId)
        }
      }, 500)
    } catch {
      comparisonStore.updateExecution(runId, slot.slotId, {
        status: 'error',
      })
    }
  })

  await Promise.allSettled(promises)
  isRunning.value = false
}
</script>

<template>
  <div class="space-y-6">
    <ComparisonSlotConfigurator v-model:slots="slots" />

    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <textarea
        v-model="prompt"
        class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
        :disabled="isRunning"
        rows="3"
        :placeholder="$t('comparison.prompt.placeholder')"
      />
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-muted">
          {{ $t('comparison.configurator.slotsConfigured', { count: slots.length }) }}
        </span>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="!canRun"
          @click="runComparison"
        >
          {{ isRunning ? $t('comparison.prompt.running') : $t('comparison.prompt.compare') }}
        </button>
      </div>
    </div>

    <div v-if="activeRun" class="space-y-4">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-medium text-text-secondary">{{ $t('comparison.results.title') }}</h3>
        <StatusBadge :status="activeRun.status" />
        <div v-if="hasCompletedResults" class="ms-auto flex gap-1 rounded-lg border border-border-default p-0.5">
          <button
            class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
            :class="viewMode === 'grid' ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-secondary'"
            @click="viewMode = 'grid'"
          >
            {{ $t('comparison.results.grid') }}
          </button>
          <button
            class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
            :class="viewMode === 'diff' ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-secondary'"
            @click="viewMode = 'diff'"
          >
            {{ $t('comparison.results.diff') }}
          </button>
        </div>
      </div>

      <ComparisonGrid
        v-if="viewMode === 'grid'"
        :executions="activeRun.executions"
        :slots="activeRun.slots"
      />
      <ComparisonDiffView
        v-else
        :executions="activeRun.executions"
      />

      <ComparisonMetricsBar
        v-if="hasCompletedResults"
        :executions="activeRun.executions"
      />
    </div>
  </div>
</template>
