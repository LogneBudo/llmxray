<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useMetricsStore } from '@/stores/metrics-store'

ChartJS.register(ArcElement, Title, Tooltip, Legend)

const metricsStore = useMetricsStore()

const COLORS = ['#818cf8', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#60a5fa', '#c084fc']

const modelCounts = computed(() => {
  const byModel = new Map<string, number>()
  for (const m of metricsStore.metricsHistory) {
    byModel.set(m.model, (byModel.get(m.model) ?? 0) + 1)
  }
  return [...byModel.entries()].sort((a, b) => b[1] - a[1])
})

const chartData = computed(() => ({
  labels: modelCounts.value.map(([model]) => model),
  datasets: [
    {
      data: modelCounts.value.map(([, count]) => count),
      backgroundColor: modelCounts.value.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: { color: '#94a3b8', font: { size: 10 }, padding: 12 },
    },
  },
}

const hasData = computed(() => modelCounts.value.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.usage.modelDistribution') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.usage.noData') }}</p>
  </div>
</template>
