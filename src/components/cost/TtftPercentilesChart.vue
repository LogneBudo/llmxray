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
import { useMetricsStore } from '@/stores/metrics-store'
import { windowedPercentiles } from '@/utils/percentile'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const metricsStore = useMetricsStore()

const data = computed(() => {
  const entries = metricsStore.metricsHistory.map((m) => ({
    timestamp: m.startedAt,
    value: m.ttftMs,
  }))
  return windowedPercentiles(entries)
})

const chartData = computed(() => ({
  labels: data.value.map((d) => d.label),
  datasets: [
    {
      label: 'P50',
      data: data.value.map((d) => d.p50),
      borderColor: '#34d399',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.3,
    },
    {
      label: 'P95',
      data: data.value.map((d) => d.p95),
      borderColor: '#fbbf24',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.3,
    },
    {
      label: 'P99',
      data: data.value.map((d) => d.p99),
      borderColor: '#ef4444',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, pointStyle: 'line' },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toFixed(0)}ms`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 45 },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: string | number) => `${v}ms` },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const hasData = computed(() => data.value.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.percentiles.ttftTitle') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('cost.percentiles.noData') }}</p>
  </div>
</template>
