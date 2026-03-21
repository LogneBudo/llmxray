<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useMetricsStore } from '@/stores/metrics-store'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const metricsStore = useMetricsStore()

// OTel-recommended bucket boundaries for time per output token (seconds), converted to ms
const BUCKETS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000]

const histogram = computed(() => {
  const allLatencies: number[] = []
  for (const m of metricsStore.metricsHistory) {
    for (const lat of m.tokenLatencies) {
      allLatencies.push(lat)
    }
  }

  if (allLatencies.length === 0) return null

  const counts = new Array(BUCKETS.length + 1).fill(0) as number[]
  for (const lat of allLatencies) {
    let placed = false
    for (let i = 0; i < BUCKETS.length; i++) {
      if (lat <= BUCKETS[i]!) {
        counts[i]!++
        placed = true
        break
      }
    }
    if (!placed) counts[BUCKETS.length]!++
  }

  const labels = BUCKETS.map((b, i) => (i === 0 ? `0-${b}` : `${BUCKETS[i - 1]}-${b}`))
  labels.push(`>${BUCKETS[BUCKETS.length - 1]}`)

  return { labels, counts, total: allLatencies.length }
})

const chartData = computed(() => {
  if (!histogram.value) return { labels: [], datasets: [] }
  return {
    labels: histogram.value.labels,
    datasets: [
      {
        label: 'Tokens',
        data: histogram.value.counts,
        backgroundColor: '#818cf8',
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => {
          const count = ctx.parsed.y ?? 0
          const total = histogram.value?.total ?? 1
          return `${count} tokens (${((count / total) * 100).toFixed(1)}%)`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45 },
      grid: { display: false },
      title: { display: true, text: 'ms', color: '#94a3b8', font: { size: 10 } },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
      title: { display: true, text: 'Count', color: '#94a3b8', font: { size: 10 } },
    },
  },
}

const hasData = computed(() => histogram.value !== null)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.percentiles.histogramTitle') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <p class="mt-2 text-[10px] text-text-muted">{{ $t('cost.percentiles.histogramHint') }}</p>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('cost.percentiles.noData') }}</p>
  </div>
</template>
