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
} from 'chart.js'
import { useSessionStore } from '@/stores/session-store'
import { classifyError } from '@/services/error-classifier'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const sessionStore = useSessionStore()

const errorEvents = computed(() => {
  const events: { date: string; category: string; model: string; error: string }[] = []
  for (const s of sessionStore.sessions.values()) {
    if (s.status === 'error' && s.error) {
      const { category, label } = classifyError(s.error)
      events.push({
        date: new Date(s.createdAt).toISOString().slice(0, 10),
        category,
        model: s.model,
        error: label,
      })
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
})

const dailyCounts = computed(() => {
  const byDay = new Map<string, number>()
  for (const e of errorEvents.value) {
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + 1)
  }
  return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

const chartData = computed(() => ({
  labels: dailyCounts.value.map(([date]) => date),
  datasets: [
    {
      label: 'Errors',
      data: dailyCounts.value.map(([, count]) => count),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
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
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.errors.timelineTitle') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.errors.noErrors') }}</p>
  </div>
</template>
