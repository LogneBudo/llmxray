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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  tokenLatencies: number[]
  title?: string
}>()

const chartData = computed(() => ({
  labels: props.tokenLatencies.map((_, i) => `${i}`),
  datasets: [
    {
      label: 'Token Latency (ms)',
      data: props.tokenLatencies,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0.3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    x: {
      display: false,
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ title ?? 'Token Latency' }}</h3>
    <div class="h-40">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
