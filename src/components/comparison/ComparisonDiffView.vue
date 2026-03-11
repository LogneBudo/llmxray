<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { diffWords } from 'diff'
import type { ComparisonExecution } from '@/types/comparison'

const props = defineProps<{
  executions: ComparisonExecution[]
}>()

const completedExecs = computed(() =>
  props.executions.filter((e) => e.status === 'completed' && e.outputText),
)

// For 2 results, auto-select. For 3-4, let user pick a pair.
const leftIdx = ref(0)
const rightIdx = ref(1)

watch(completedExecs, (execs) => {
  if (execs.length >= 2) {
    leftIdx.value = 0
    rightIdx.value = 1
  }
}, { immediate: true })

const diffResult = computed(() => {
  const left = completedExecs.value[leftIdx.value]
  const right = completedExecs.value[rightIdx.value]
  if (!left || !right) return []

  // Strip think tags for diff
  const cleanLeft = left.outputText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const cleanRight = right.outputText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  return diffWords(cleanLeft, cleanRight)
})

const leftLabel = computed(() => completedExecs.value[leftIdx.value]?.label || completedExecs.value[leftIdx.value]?.model || '')
const rightLabel = computed(() => completedExecs.value[rightIdx.value]?.label || completedExecs.value[rightIdx.value]?.model || '')
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
    <div v-if="completedExecs.length < 2" class="text-sm text-text-muted text-center py-4">
      Need at least 2 completed results to show a diff.
    </div>

    <template v-else>
      <!-- Pair selector (only if more than 2 results) -->
      <div v-if="completedExecs.length > 2" class="flex items-center gap-3 text-sm">
        <span class="text-text-muted text-xs">Compare:</span>
        <select
          v-model.number="leftIdx"
          class="rounded-md border border-border-default bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
        >
          <option v-for="(exec, i) in completedExecs" :key="exec.slotId" :value="i" :disabled="i === rightIdx">
            {{ exec.label || exec.model }}
          </option>
        </select>
        <span class="text-text-muted text-xs">vs</span>
        <select
          v-model.number="rightIdx"
          class="rounded-md border border-border-default bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
        >
          <option v-for="(exec, i) in completedExecs" :key="exec.slotId" :value="i" :disabled="i === leftIdx">
            {{ exec.label || exec.model }}
          </option>
        </select>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-[11px]">
        <div class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm bg-success/30" />
          <span class="text-text-muted">{{ leftLabel }} only</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm bg-error/30" />
          <span class="text-text-muted">{{ rightLabel }} only</span>
        </div>
      </div>

      <!-- Diff output -->
      <div class="rounded-md border border-border-default bg-surface p-3 text-sm leading-relaxed max-h-96 overflow-y-auto">
        <span
          v-for="(part, i) in diffResult"
          :key="i"
          :class="{
            'bg-success/20 text-success': part.removed,
            'bg-error/20 text-error': part.added,
            'text-text-primary': !part.added && !part.removed,
          }"
        >{{ part.value }}</span>
      </div>
    </template>
  </div>
</template>
