<script setup lang="ts">
import { computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useSessionStore } from '@/stores/session-store'
import { useMetricsStore } from '@/stores/metrics-store'

ChartJS.register(LinearScale, PointElement, Title, Tooltip, Legend)

const sessionStore = useSessionStore()
const metricsStore = useMetricsStore()

const dataPoints = computed(() => {
  const points: { x: number; y: number; model: string }[] = []
  for (const s of sessionStore.sessions.values()) {
    const temp = s.options?.temperature
    if (temp === undefined) continue
    const m = metricsStore.getMetrics(s.id)
    if (!m) continue
    points.push({ x: temp, y: m.tokensPerSecond, model: s.model })
  }
  return points
})

const chartData = computed(() => ({
  datasets: [
    {
      label: 'Temperature vs Speed',
      data: dataPoints.value.map((p) => ({ x: p.x, y: p.y })),
      backgroundColor: '#818cf880',
      borderColor: '#818cf8',
      pointRadius: 5,
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
        label: (ctx: { dataIndex: number; parsed: { x: number | null; y: number | null } }) => {
          const p = dataPoints.value[ctx.dataIndex]
          return `${p?.model ?? ''}: temp=${(ctx.parsed.x ?? 0).toFixed(1)} → ${(ctx.parsed.y ?? 0).toFixed(1)} tok/s`
        },
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Temperature', color: '#94a3b8', font: { size: 10 } },
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      title: { display: true, text: 'Tokens/sec', color: '#94a3b8', font: { size: 10 } },
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const hasData = computed(() => dataPoints.value.length >= 2)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.settings.title') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Scatter :data="chartData" :options="chartOptions" />
      </div>
      <p class="mt-2 text-[10px] text-text-muted">{{ $t('analytics.settings.hint') }}</p>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.settings.noData') }}</p>
  </div>
</template>
