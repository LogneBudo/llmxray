<script setup lang="ts">
import { computed } from 'vue'
import { useReasoningStore } from '@/stores/reasoning-store'
import ReasoningStepComponent from './ReasoningStep.vue'

const props = defineProps<{
  sessionId: string
}>()

const reasoningStore = useReasoningStore()

const steps = computed(() => reasoningStore.getSteps(props.sessionId))

const stepTypeCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const step of steps.value) {
    counts[step.type] = (counts[step.type] ?? 0) + 1
  }
  return counts
})
</script>

<template>
  <div class="space-y-4">
    <!-- Summary -->
    <div class="flex items-center gap-4 rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="text-sm text-text-secondary">
        <span class="font-semibold text-text-primary">{{ steps.length }}</span> reasoning steps detected
      </div>
      <div class="flex gap-2">
        <span
          v-for="(count, type) in stepTypeCounts"
          :key="type"
          class="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs text-text-secondary"
        >
          {{ type }}: {{ count }}
        </span>
      </div>
    </div>

    <!-- Steps -->
    <div v-if="steps.length > 0" class="space-y-0">
      <ReasoningStepComponent
        v-for="step in steps"
        :key="step.id"
        :step="step"
      />
    </div>

    <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
      <p>No reasoning steps detected.</p>
      <p class="mt-1">Use a model with chain-of-thought support (e.g., DeepSeek-R1) or structured reasoning patterns.</p>
    </div>
  </div>
</template>
