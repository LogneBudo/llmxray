<script setup lang="ts">
import { ref, computed } from 'vue'
import { useComparisonStore } from '@/stores/comparison-store'
import { useSessionStore } from '@/stores/session-store'
import { startGeneration } from '@/services/generate-service'
import ModelSelector from '@/components/comparison/ModelSelector.vue'
import ComparisonGrid from '@/components/comparison/ComparisonGrid.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const comparisonStore = useComparisonStore()
const sessionStore = useSessionStore()

const selectedModels = ref<string[]>([])
const prompt = ref('')
const isRunning = ref(false)

const activeRun = computed(() => comparisonStore.activeRun)

async function runComparison() {
  if (selectedModels.value.length === 0 || !prompt.value.trim()) return

  isRunning.value = true
  const runId = comparisonStore.createRun(prompt.value.trim(), selectedModels.value)

  // Fire all generations in parallel
  const promises = selectedModels.value.map(async (model) => {
    try {
      const result = await startGeneration({ model, prompt: prompt.value.trim() })
      comparisonStore.updateExecution(runId, model, {
        sessionId: result.sessionId,
        status: 'streaming',
      })

      // Watch for completion
      const checkInterval = setInterval(() => {
        const session = sessionStore.sessionById(result.sessionId)
        if (session && (session.status === 'completed' || session.status === 'error')) {
          comparisonStore.updateExecution(runId, model, {
            status: session.status,
            outputText: session.outputText,
            metrics: session.metrics,
          })
          clearInterval(checkInterval)
          comparisonStore.finalizeRun(runId)
        }
      }, 500)
    } catch (err) {
      comparisonStore.updateExecution(runId, model, {
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
    <ModelSelector v-model:selected-models="selectedModels" />

    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <textarea
        v-model="prompt"
        class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
        :disabled="isRunning"
        rows="3"
        placeholder="Enter prompt to compare across models..."
      />
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-muted">
          {{ selectedModels.length }} model{{ selectedModels.length !== 1 ? 's' : '' }} selected
        </span>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="isRunning || selectedModels.length === 0 || !prompt.trim()"
          @click="runComparison"
        >
          {{ isRunning ? 'Running...' : 'Compare' }}
        </button>
      </div>
    </div>

    <div v-if="activeRun" class="space-y-4">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-medium text-text-secondary">Results</h3>
        <StatusBadge :status="activeRun.status" />
      </div>
      <ComparisonGrid :executions="activeRun.executions" />
    </div>
  </div>
</template>
