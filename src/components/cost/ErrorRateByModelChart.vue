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
import { useSessionStore } from '@/stores/session-store'
import { classifyError, ERROR_COLORS, type ErrorCategory } from '@/services/error-classifier'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const sessionStore = useSessionStore()

interface ModelErrorStats {
  model: string
  total: number
  errors: number
  rate: number
  byCategory: Partial<Record<ErrorCategory, number>>
}

const stats = computed<ModelErrorStats[]>(() => {
  const byModel = new Map<string, { total: number; errors: number; byCategory: Partial<Record<ErrorCategory, number>> }>()

  for (const session of sessionStore.sessions.values()) {
    const model = session.model
    const entry = byModel.get(model) ?? { total: 0, errors: 0, byCategory: {} }
    entry.total++
    if (session.status === 'error' && session.error) {
      entry.errors++
      const { category } = classifyError(session.error)
      entry.byCategory[category] = (entry.byCategory[category] ?? 0) + 1
    }
    byModel.set(model, entry)
  }

  return [...byModel.entries()]
    .map(([model, s]) => ({ model, ...s, rate: s.total > 0 ? s.errors / s.total : 0 }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.rate - a.rate)
})

const categories: ErrorCategory[] = ['connection', 'timeout', 'model_not_found', 'context_exceeded', 'oom', 'tool_error', 'cancelled', 'unknown']
const categoryLabels: Record<ErrorCategory, string> = {
  connection: 'Connection',
  timeout: 'Timeout',
  model_not_found: 'Not found',
  context_exceeded: 'Context exceeded',
  oom: 'Out of memory',
  tool_error: 'Tool error',
  cancelled: 'Cancelled',
  unknown: 'Unknown',
}

const chartData = computed(() => ({
  labels: stats.value.map((s) => s.model),
  datasets: categories
    .filter((cat) => stats.value.some((s) => (s.byCategory[cat] ?? 0) > 0))
    .map((cat) => ({
      label: categoryLabels[cat],
      data: stats.value.map((s) => s.byCategory[cat] ?? 0),
      backgroundColor: ERROR_COLORS[cat],
    })),
}))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', font: { size: 10 } },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
    y: {
      stacked: true,
      ticks: { color: '#94a3b8', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

const hasErrors = computed(() => stats.value.some((s) => s.errors > 0))
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.errors.title') }}</h3>
    <template v-if="hasErrors">
      <div :style="{ height: Math.max(100, stats.length * 36) + 'px' }">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('cost.errors.noErrors') }}</p>
  </div>
</template>
