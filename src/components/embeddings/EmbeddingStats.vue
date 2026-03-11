<script setup lang="ts">
import { computed } from 'vue'
import type { EmbeddingResult } from '@/types/embedding'
import { formatDuration } from '@/utils/format'

const props = defineProps<{
  result: EmbeddingResult
}>()

const stats = computed(() => {
  const vec = props.result.vector
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let sumSq = 0

  for (const v of vec) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
    sumSq += v * v
  }

  const mean = sum / vec.length
  const variance = sumSq / vec.length - mean * mean
  const norm = Math.sqrt(sumSq)

  return {
    dimensions: vec.length,
    min: min.toFixed(4),
    max: max.toFixed(4),
    mean: mean.toFixed(4),
    stdDev: Math.sqrt(Math.max(0, variance)).toFixed(4),
    l2Norm: norm.toFixed(4),
    duration: formatDuration(props.result.durationMs),
  }
})
</script>

<template>
  <div class="grid grid-cols-3 gap-2 text-xs lg:grid-cols-6">
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">Dims</div>
      <div class="font-medium text-text-primary">{{ stats.dimensions }}</div>
    </div>
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">Min</div>
      <div class="font-medium text-text-primary">{{ stats.min }}</div>
    </div>
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">Max</div>
      <div class="font-medium text-text-primary">{{ stats.max }}</div>
    </div>
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">Mean</div>
      <div class="font-medium text-text-primary">{{ stats.mean }}</div>
    </div>
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">Std Dev</div>
      <div class="font-medium text-text-primary">{{ stats.stdDev }}</div>
    </div>
    <div class="rounded-lg bg-surface p-2">
      <div class="text-text-muted">L2 Norm</div>
      <div class="font-medium text-text-primary">{{ stats.l2Norm }}</div>
    </div>
  </div>
</template>
