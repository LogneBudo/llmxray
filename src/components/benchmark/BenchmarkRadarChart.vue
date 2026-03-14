<script setup lang="ts">
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import type { BenchmarkResult } from '@/types/benchmark'
import { getPercentile, getBenchmarkLabel, getBaselineBenchmarkIds } from '@/data/benchmarks/baselines'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps<{
  results: BenchmarkResult[]
}>()

const DATASET_COLORS = [
  { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  { border: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { border: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  { border: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  { border: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)' },
  { border: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },
  { border: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
]

const benchmarkIds = computed(() => getBaselineBenchmarkIds())

const chartData = computed(() => {
  const labels = benchmarkIds.value.map((id) => getBenchmarkLabel(id))

  const datasets = props.results.map((result, i) => {
    const color = DATASET_COLORS[i % DATASET_COLORS.length]!
    const data = benchmarkIds.value.map((benchId) => {
      const cat = result.categories.find((c) => c.category === benchId)
      if (!cat) return 0
      return Math.round(getPercentile(benchId, cat.accuracy))
    })

    return {
      label: result.modelName,
      data,
      borderColor: color.border,
      backgroundColor: color.bg,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: color.border,
    }
  })

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#94a3b8', font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { r: number }; dataIndex: number }) => {
          const result = props.results[ctx.dataIndex !== undefined ? 0 : 0]
          const benchId = benchmarkIds.value[ctx.dataIndex]
          const cat = result?.categories.find((c) => c.category === benchId)
          const rawPct = cat ? Math.round(cat.accuracy * 100) : 0
          return `${ctx.dataset.label}: ${ctx.parsed.r}th percentile (${rawPct}% raw)`
        },
      },
    },
  },
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        color: '#64748b',
        backdropColor: 'transparent',
        font: { size: 9 },
      },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
      angleLines: { color: 'rgba(71, 85, 105, 0.3)' },
      pointLabels: { color: '#94a3b8', font: { size: 11 } },
    },
  },
}))
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
      Benchmark Radar — Percentile Scores
    </h4>
    <div v-if="results.length > 0" class="mx-auto max-w-md">
      <Radar :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="flex h-48 items-center justify-center text-sm text-text-muted">
      No results selected for comparison
    </div>
  </div>
</template>
