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

const dailyCounts = computed(() => {
  const byDay = new Map<string, number>()
  for (const m of metricsStore.metricsHistory) {
    const date = new Date(m.startedAt).toISOString().slice(0, 10)
    byDay.set(date, (byDay.get(date) ?? 0) + 1)
  }
  return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

const chartData = computed(() => ({
  labels: dailyCounts.value.map(([date]) => date),
  datasets: [
    {
      label: 'Requests',
      data: dailyCounts.value.map(([, count]) => count),
      backgroundColor: '#818cf8',
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { display: false },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const hasData = computed(() => dailyCounts.value.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.usage.requestVolume') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.usage.noData') }}</p>
  </div>
</template>
