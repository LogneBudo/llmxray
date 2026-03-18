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
  let nearZero = 0

  for (const v of vec) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
    sumSq += v * v
    if (Math.abs(v) < 0.001) nearZero++
  }

  const mean = sum / vec.length
  const variance = sumSq / vec.length - mean * mean
  const norm = Math.sqrt(sumSq)
  const sparsity = (nearZero / vec.length) * 100

  return {
    dimensions: vec.length,
    min: min.toFixed(4),
    max: max.toFixed(4),
    mean: mean.toFixed(4),
    stdDev: Math.sqrt(Math.max(0, variance)).toFixed(4),
    l2Norm: norm.toFixed(4),
    sparsity: sparsity.toFixed(1),
    duration: formatDuration(props.result.durationMs),
    memoryBytes: vec.length * 8,
  }
})

interface StatDef {
  key: string
  label: string
  value: string | number
  tooltip: string
}

const statDefs = computed<StatDef[]>(() => [
  {
    key: 'dims',
    label: 'Dims',
    value: stats.value.dimensions,
    tooltip: 'Number of dimensions in the embedding vector. Higher dimensions capture more semantic nuance but use more memory.',
  },
  {
    key: 'min',
    label: 'Min',
    value: stats.value.min,
    tooltip: 'Smallest value across all dimensions. Shows the negative activation floor of the embedding space.',
  },
  {
    key: 'max',
    label: 'Max',
    value: stats.value.max,
    tooltip: 'Largest value across all dimensions. Shows the positive activation ceiling of the embedding space.',
  },
  {
    key: 'mean',
    label: 'Mean',
    value: stats.value.mean,
    tooltip: 'Average value across all dimensions. Near-zero means the vector is well-centered, which is typical for normalized embeddings.',
  },
  {
    key: 'stdDev',
    label: 'Std Dev',
    value: stats.value.stdDev,
    tooltip: 'Standard deviation — measures how spread out the values are. Higher means more varied activations across dimensions.',
  },
  {
    key: 'l2Norm',
    label: 'L2 Norm',
    value: stats.value.l2Norm,
    tooltip: 'Euclidean length of the vector. Normalized embeddings have L2 norm close to 1.0, making cosine similarity equivalent to dot product.',
  },
  {
    key: 'sparsity',
    label: 'Sparsity',
    value: `${stats.value.sparsity}%`,
    tooltip: 'Percentage of dimensions with near-zero values (|v| < 0.001). High sparsity means the text activates only a subset of the semantic dimensions.',
  },
  {
    key: 'duration',
    label: 'Time',
    value: stats.value.duration,
    tooltip: 'Time taken by the model to compute the embedding vector from the input text.',
  },
])
</script>

<template>
  <div class="grid grid-cols-4 gap-2 text-xs lg:grid-cols-8">
    <div
      v-for="stat in statDefs"
      :key="stat.key"
      class="group relative rounded-lg bg-surface p-2 cursor-help"
    >
      <div class="text-text-muted">{{ stat.label }}</div>
      <div class="font-medium text-text-primary">{{ stat.value }}</div>
      <!-- Tooltip -->
      <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div class="w-52 rounded-lg border border-border-default bg-surface-raised px-3 py-2 text-[10px] leading-relaxed text-text-secondary shadow-lg">
          {{ stat.tooltip }}
        </div>
        <div class="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-e border-border-default bg-surface-raised" />
      </div>
    </div>
  </div>
</template>
