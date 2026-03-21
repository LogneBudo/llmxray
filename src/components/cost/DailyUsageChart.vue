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
import type { DailyUsageSummary } from '@/types/cost'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  data: DailyUsageSummary[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((d) => d.date),
  datasets: [
    {
      label: 'Tokens',
      data: props.data.map((d) => d.totalTokens),
      borderColor: '#818cf8',
      backgroundColor: 'rgba(129, 140, 248, 0.1)',
      fill: true,
      tension: 0.3,
      yAxisID: 'y',
    },
    {
      label: 'Est. Cost ($)',
      data: props.data.map((d) => d.estimatedCost),
      borderColor: '#a855f7',
      backgroundColor: 'transparent',
      borderDash: [4, 4],
      tension: 0.3,
      yAxisID: 'y1',
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const label = ctx.dataset.label ?? ''
          const val = ctx.parsed.y ?? 0
          if (label === 'Est. Cost ($)') {
            return `${label}: $${val.toFixed(4)}`
          }
          return `${label}: ${val.toLocaleString()}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
      title: {
        display: true,
        text: 'Tokens',
        color: '#94a3b8',
        font: { size: 10 },
      },
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      ticks: {
        color: '#94a3b8',
        font: { size: 10 },
        callback: (value: string | number) => `$${Number(value).toFixed(4)}`,
      },
      grid: { display: false },
      title: {
        display: true,
        text: 'Cost ($)',
        color: '#94a3b8',
        font: { size: 10 },
      },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.charts.dailyUsage') }}</h3>
    <div class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
