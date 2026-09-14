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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  promptTokens: number
  completionTokens: number
  /**
   * Prompt tokens served from the KV cache (Ollama 0.33.3+). When known, the
   * prompt bar is split into the cached and freshly evaluated halves; when
   * undefined the bar stays a single prompt segment as before.
   */
  cachedPromptTokens?: number
}>()

const chartData = computed(() => {
  const cached = props.cachedPromptTokens
  const promptDatasets =
    cached === undefined
      ? [{ label: 'Prompt', data: [props.promptTokens], backgroundColor: '#818cf8' }]
      : [
          {
            label: 'Prompt (cached)',
            data: [Math.min(cached, props.promptTokens)],
            backgroundColor: '#38bdf8',
          },
          {
            label: 'Prompt (evaluated)',
            data: [Math.max(props.promptTokens - cached, 0)],
            backgroundColor: '#818cf8',
          },
        ]

  return {
    labels: ['Tokens'],
    datasets: [
      ...promptDatasets,
      {
        label: 'Completion',
        data: [props.completionTokens],
        backgroundColor: '#a855f7',
      },
    ],
  }
})

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', font: { size: 11 } },
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
      display: false,
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">Token Distribution</h3>
    <div class="h-20">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div class="mt-2 flex gap-4 text-xs text-text-muted">
      <span>Total: {{ promptTokens + completionTokens }}</span>
    </div>
  </div>
</template>
