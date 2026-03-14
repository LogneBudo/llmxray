<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps<{
  vector: number[]
  label?: string
  height?: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const vizHeight = computed(() => props.height ?? 120)

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const vec = props.vector
  const width = canvas.parentElement?.clientWidth ?? 600
  canvas.width = width
  canvas.height = vizHeight.value

  ctx.clearRect(0, 0, width, vizHeight.value)

  // Draw dimension bars
  const barWidth = Math.max(1, width / vec.length)
  const mid = vizHeight.value / 2

  // Find range for normalization
  let minVal = Infinity
  let maxVal = -Infinity
  for (const v of vec) {
    if (v < minVal) minVal = v
    if (v > maxVal) maxVal = v
  }
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal)) || 1

  for (let i = 0; i < vec.length; i++) {
    const val = vec[i]!
    const normalized = val / range
    const barHeight = Math.abs(normalized) * (vizHeight.value / 2 - 4)

    // Positive = blue/cyan, Negative = orange/red
    if (val >= 0) {
      ctx.fillStyle = `rgba(168, 85, 247, ${0.3 + Math.abs(normalized) * 0.7})`
      ctx.fillRect(i * barWidth, mid - barHeight, barWidth, barHeight)
    } else {
      ctx.fillStyle = `rgba(251, 146, 60, ${0.3 + Math.abs(normalized) * 0.7})`
      ctx.fillRect(i * barWidth, mid, barWidth, barHeight)
    }
  }

  // Zero line
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border-default').trim() || '#475569'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mid)
  ctx.lineTo(width, mid)
  ctx.stroke()
}

onMounted(draw)
watch(() => props.vector, draw)
</script>

<template>
  <div class="space-y-1">
    <div v-if="label" class="text-xs text-text-muted">{{ label }}</div>
    <div class="overflow-hidden rounded-lg border border-border-default bg-surface">
      <canvas ref="canvasRef" :height="vizHeight" class="w-full" />
    </div>
    <div class="flex justify-between text-xs text-text-muted">
      <span>Dim 0</span>
      <span>{{ vector.length }} dimensions</span>
    </div>
  </div>
</template>
