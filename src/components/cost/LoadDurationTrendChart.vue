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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const metricsStore = useMetricsStore()

const COLD_THRESHOLD = 500

const data = computed(() => {
  const history = metricsStore.metricsHistory.slice(-50)
  return history.map((m) => ({
    label: new Date(m.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    loadMs: m.loadDurationMs,
    model: m.model,
    isCold: m.loadDurationMs > COLD_THRESHOLD,
  }))
})

const chartData = computed(() => ({
  labels: data.value.map((d) => d.label),
  datasets: [
    {
      label: 'Load Duration (ms)',
      data: data.value.map((d) => d.loadMs),
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: data.value.map((d) => d.isCold ? '#f97316' : '#a855f7'),
      pointRadius: data.value.map((d) => d.isCold ? 4 : 2),
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
        label: (ctx: { parsed: { y: number | null }; dataIndex: number }) => {
          const d = data.value[ctx.dataIndex]
          const val = ctx.parsed.y ?? 0
          return `${d?.model ?? ''}: ${val.toFixed(0)}ms${d?.isCold ? ' (cold start)' : ''}`
        },
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
const coldCount = computed(() => data.value.filter((d) => d.isCold).length)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-medium text-text-secondary">{{ $t('cost.loadDuration.title') }}</h3>
      <span v-if="coldCount > 0" class="rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-medium text-warning">
        {{ coldCount }} {{ $t('cost.loadDuration.coldStarts') }}
      </span>
    </div>
    <template v-if="hasData">
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <p class="mt-2 text-[10px] text-text-muted">{{ $t('cost.loadDuration.hint') }}</p>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('cost.loadDuration.noData') }}</p>
  </div>
</template>
