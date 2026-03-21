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
import { useConversationStore } from '@/stores/conversation-store'
import { scoreConversationTurns } from '@/services/turn-quality'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const conversationStore = useConversationStore()

const scores = computed(() => {
  const conv = conversationStore.activeConversation
  if (!conv || conv.messages.length < 2) return []
  return scoreConversationTurns(conv.messages)
})

const assistantScores = computed(() => scores.value.filter((s) => s.role === 'assistant'))

const chartData = computed(() => ({
  labels: assistantScores.value.map((_, i) => `Turn ${i + 1}`),
  datasets: [
    {
      label: 'Quality Score',
      data: assistantScores.value.map((s) => s.score),
      borderColor: '#818cf8',
      backgroundColor: 'rgba(129, 140, 248, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: assistantScores.value.map((s) =>
        s.score >= 3.5 ? '#34d399' : s.score >= 2 ? '#fbbf24' : '#ef4444',
      ),
      pointRadius: 4,
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
          const s = assistantScores.value[ctx.dataIndex]
          return `Score: ${(ctx.parsed.y ?? 0).toFixed(1)}/5 (${s?.wordCount ?? 0} words)`
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
      min: 0,
      max: 5,
      ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const hasData = computed(() => assistantScores.value.length >= 2)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.quality.title') }}</h3>
    <template v-if="hasData">
      <div class="h-48">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <p class="mt-2 text-[10px] text-text-muted">{{ $t('analytics.quality.hint') }}</p>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.quality.noData') }}</p>
  </div>
</template>
