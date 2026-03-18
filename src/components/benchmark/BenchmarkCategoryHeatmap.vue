<script setup lang="ts">
import { computed } from 'vue'
import type { BenchmarkResult } from '@/types/benchmark'
import { getBenchmarkLabel, getBaselineBenchmarkIds } from '@/data/benchmarks/baselines'

const props = defineProps<{
  results: BenchmarkResult[]
}>()

const allCategories = computed(() => {
  const ids = new Set<string>(getBaselineBenchmarkIds())
  for (const r of props.results) {
    for (const cat of r.categories) ids.add(cat.category)
  }
  return [...ids]
})

function getAccuracy(result: BenchmarkResult, category: string): number | null {
  const cat = result.categories.find((c) => c.category === category)
  return cat ? Math.round(cat.accuracy * 100) : null
}

function cellColor(accuracy: number | null): string {
  if (accuracy === null) return 'bg-surface text-text-muted'
  if (accuracy >= 80) return 'bg-success/20 text-success'
  if (accuracy >= 60) return 'bg-success/10 text-success/80'
  if (accuracy >= 40) return 'bg-warning/10 text-warning'
  if (accuracy >= 20) return 'bg-error/10 text-error/80'
  return 'bg-error/20 text-error'
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
      Category Heatmap — Models x Categories
    </h4>
    <div v-if="results.length > 0" class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr>
            <th class="pb-2 pe-3 text-start text-text-muted">Model</th>
            <th
              v-for="cat in allCategories"
              :key="cat"
              class="pb-2 px-2 text-center text-text-muted"
            >
              {{ getBenchmarkLabel(cat) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in results" :key="result.id">
            <td class="py-1.5 pe-3 text-text-primary truncate max-w-[120px]">{{ result.modelName }}</td>
            <td
              v-for="cat in allCategories"
              :key="cat"
              class="py-1.5 px-2 text-center rounded"
              :class="cellColor(getAccuracy(result, cat))"
            >
              {{ getAccuracy(result, cat) !== null ? `${getAccuracy(result, cat)}%` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="flex h-24 items-center justify-center text-sm text-text-muted">
      Select results to compare
    </div>
  </div>
</template>
