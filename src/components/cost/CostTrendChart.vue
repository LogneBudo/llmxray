<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { useCostStore } from '@/stores/cost-store'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const costStore = useCostStore()

const chartData = computed(() => ({
  labels: costStore.dailyUsage.map((d) => d.date),
  datasets: [
    {
      label: 'Est. Cost ($)',
      data: costStore.dailyUsage.map((d) => d.estimatedCost),
      borderColor: '#f472b6',
      backgroundColor: 'rgba(244, 114, 182, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) =>
          `$${(ctx.parsed.y ?? 0).toFixed(4)}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: string | number) => `$${Number(v).toFixed(4)}` },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const hasData = computed(() => costStore.dailyUsage.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.charts.costTrend') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('cost.noData') }}</p>
  </div>
</template>
