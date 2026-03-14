<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'
import type { LayerActivation } from '@/types/introspection'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{
  activations: LayerActivation[]
}>()

const chartData = computed(() => ({
  labels: props.activations.map((a) => a.layerName.replace(/^block_\d+_/, '')),
  datasets: [
    {
      label: 'Norm',
      data: props.activations.map((a) => a.norm),
      backgroundColor: '#a855f7',
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
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <h4 class="text-sm font-medium text-text-secondary">Layer Activation Norms</h4>
      <span class="rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">Simulated</span>
    </div>
    <div class="h-48 rounded-lg border border-border-default bg-surface-raised p-4">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <p class="text-xs text-text-muted leading-relaxed">
      This is a <strong class="text-warning">simulated visualization</strong> of activation norms across the model's layers.
      In a real model, these norms reveal how much each layer contributes to the output &mdash; unusually high norms can indicate
      exploding gradients or bottleneck layers, while low norms may suggest underutilized capacity.
      Actual activation data requires hooking into the inference engine, which the Ollama API does not expose.
    </p>
  </div>
</template>
