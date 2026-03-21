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
import type { ModelUsageSummary } from '@/types/cost'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: ModelUsageSummary[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((d) => d.model),
  datasets: [
    {
      label: 'Prompt',
      data: props.data.map((d) => d.promptTokens),
      backgroundColor: '#818cf8',
    },
    {
      label: 'Completion',
      data: props.data.map((d) => d.completionTokens),
      backgroundColor: '#a855f7',
    },
  ],
}))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { x: number | null } }) =>
          `${ctx.dataset.label ?? ''}: ${(ctx.parsed.x ?? 0).toLocaleString()} tokens`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      stacked: true,
      ticks: { color: '#94a3b8', font: { size: 11 } },
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.charts.tokensByModel') }}</h3>
    <div :style="{ height: Math.max(120, data.length * 40) + 'px' }">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
