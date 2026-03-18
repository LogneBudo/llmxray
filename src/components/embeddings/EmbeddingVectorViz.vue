<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps<{
  vector: number[]
  label?: string
  height?: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const hoveredDim = ref<{ index: number; value: number; x: number; y: number } | null>(null)
const vizHeight = computed(() => props.height ?? 120)

function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const vec = props.vector
  const width = container.clientWidth
  const height = vizHeight.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, width, height)

  const barWidth = width / vec.length
  const mid = height / 2

  let maxAbs = 0
  for (const v of vec) {
    if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v)
  }
  if (maxAbs === 0) maxAbs = 1

  for (let i = 0; i < vec.length; i++) {
    const val = vec[i]!
    const normalized = val / maxAbs
    const barHeight = Math.abs(normalized) * (mid - 2)
    const alpha = 0.3 + Math.abs(normalized) * 0.7

    if (val >= 0) {
      ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`
      ctx.fillRect(i * barWidth, mid - barHeight, Math.max(barWidth, 0.5), barHeight)
    } else {
      ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`
      ctx.fillRect(i * barWidth, mid, Math.max(barWidth, 0.5), barHeight)
    }
  }

  // Zero line
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mid)
  ctx.lineTo(width, mid)
  ctx.stroke()
}

function handleMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const barWidth = rect.width / props.vector.length
  const index = Math.floor(x / barWidth)
  if (index >= 0 && index < props.vector.length) {
    hoveredDim.value = {
      index,
      value: props.vector[index]!,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  } else {
    hoveredDim.value = null
  }
}

function handleMouseLeave() {
  hoveredDim.value = null
}

onMounted(draw)
watch(() => props.vector, draw)
</script>

<template>
  <div class="space-y-1">
    <div v-if="label" class="text-xs text-text-muted">{{ label }}</div>
    <div ref="containerRef" class="relative overflow-hidden rounded-lg border border-border-default bg-surface">
      <canvas
        ref="canvasRef"
        :height="vizHeight"
        class="w-full cursor-crosshair"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      />
      <!-- Hover tooltip -->
      <div
        v-if="hoveredDim"
        class="pointer-events-none absolute z-10 rounded border border-border-default bg-surface-raised px-2 py-1 text-[10px] shadow-lg"
        :style="{
          left: `${Math.min(hoveredDim.x, (containerRef?.clientWidth ?? 200) - 120)}px`,
          top: `${hoveredDim.y - 36}px`,
        }"
      >
        <span class="text-text-muted">dim[{{ hoveredDim.index }}]</span>
        <span class="ms-1.5 font-mono" :class="hoveredDim.value >= 0 ? 'text-accent' : 'text-warning'">
          {{ hoveredDim.value.toFixed(6) }}
        </span>
      </div>
    </div>
    <div class="flex items-center justify-between text-[10px] text-text-muted">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(139,92,246)]" />
          Positive
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(251,146,60)]" />
          Negative
        </span>
      </div>
      <span>All {{ vector.length }} dimensions</span>
    </div>
  </div>
</template>
