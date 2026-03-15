<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  inputText: string
  isEmbedding: boolean
  vector: number[] | null
}>()

const phase = ref<'idle' | 'decomposing' | 'transforming' | 'complete'>('idle')
const progress = ref(0)
const hoveredDim = ref<{ index: number; value: number; x: number; y: number } | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLElement | null>(null)
let animFrame = 0
let startTime = 0

const words = computed(() =>
  props.inputText
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 20),
)

const vectorSummary = computed(() => {
  if (!props.vector) return null
  let pos = 0
  let neg = 0
  for (const v of props.vector) {
    if (v >= 0) pos++
    else neg++
  }
  const ratio = pos / props.vector.length
  let character: string
  if (ratio > 0.7) character = 'Mostly positive activations'
  else if (ratio < 0.3) character = 'Mostly negative activations'
  else character = 'Balanced activation spread'
  return { positive: pos, negative: neg, character }
})

function drawCompleteVector() {
  const canvas = canvasRef.value
  const container = canvasContainerRef.value
  if (!canvas || !container || !props.vector) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const vec = props.vector
  const width = container.clientWidth
  const height = 96
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

function handleCanvasMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas || !props.vector) return

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

function handleCanvasMouseLeave() {
  hoveredDim.value = null
}

function animate(timestamp: number) {
  if (!startTime) startTime = timestamp
  const elapsed = timestamp - startTime

  if (elapsed < 600) {
    phase.value = 'decomposing'
    progress.value = elapsed / 600
  } else if (elapsed < 1200) {
    phase.value = 'transforming'
    progress.value = (elapsed - 600) / 600
  }

  if (props.isEmbedding) {
    animFrame = requestAnimationFrame(animate)
  }
}

watch(
  () => props.isEmbedding,
  (embedding) => {
    if (embedding) {
      startTime = 0
      progress.value = 0
      hoveredDim.value = null
      phase.value = 'decomposing'
      animFrame = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(animFrame)
      if (props.vector) {
        phase.value = 'complete'
        progress.value = 1
        nextTick(drawCompleteVector)
      } else {
        phase.value = 'idle'
        progress.value = 0
      }
    }
  },
)

watch(() => props.vector, () => {
  if (phase.value === 'complete' && props.vector) {
    nextTick(drawCompleteVector)
  }
})

onUnmounted(() => cancelAnimationFrame(animFrame))
</script>

<template>
  <div
    v-if="phase !== 'idle' || vector"
    class="relative overflow-hidden rounded-lg border border-border-default bg-surface p-4"
  >
    <!-- Phase label -->
    <div class="mb-3 flex items-center justify-between text-[10px] text-text-muted">
      <span v-if="phase === 'decomposing'">Tokenizing text...</span>
      <span v-else-if="phase === 'transforming'">Projecting into embedding space...</span>
      <span v-else-if="phase === 'complete' && vectorSummary">
        {{ vectorSummary.character }}
      </span>
      <span v-if="vector" class="font-mono">
        {{ vector.length }} dimensions &middot; {{ vectorSummary?.positive }} positive &middot; {{ vectorSummary?.negative }} negative
      </span>
    </div>

    <div class="relative h-24 flex items-center justify-center">
      <!-- STAGE 1: Text words floating/decomposing -->
      <Transition name="fade">
        <div
          v-if="phase === 'decomposing' || (phase === 'idle' && !vector)"
          class="absolute inset-0 flex flex-wrap items-center justify-center gap-1.5 px-4"
        >
          <span
            v-for="(word, i) in words"
            :key="i"
            class="inline-block rounded bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent transition-all duration-500"
            :style="{
              opacity: phase === 'decomposing' ? Math.max(0, 1 - progress * 1.5 + (i * 0.1)) : 1,
              transform: phase === 'decomposing'
                ? `translateY(${(progress * 20 * (i % 2 === 0 ? -1 : 1))}px) scale(${1 - progress * 0.3})`
                : 'none',
            }"
          >
            {{ word }}
          </span>
        </div>
      </Transition>

      <!-- STAGE 2: Transforming particles -->
      <Transition name="fade">
        <div
          v-if="phase === 'transforming'"
          class="absolute inset-0 flex items-center justify-center"
        >
          <div class="flex items-end gap-px h-16">
            <div
              v-for="i in 60"
              :key="i"
              class="w-1 rounded-full transition-all duration-300"
              :style="{
                height: `${Math.abs(Math.sin(i * 0.5 + progress * 10)) * progress * 100}%`,
                backgroundColor: Math.sin(i * 0.5 + progress * 10) >= 0
                  ? `rgba(139, 92, 246, ${0.3 + progress * 0.5})`
                  : `rgba(251, 146, 60, ${0.3 + progress * 0.5})`,
                opacity: Math.min(1, progress * 2),
              }"
            />
          </div>
        </div>
      </Transition>

      <!-- STAGE 3: Full vector via canvas -->
      <Transition name="fade">
        <div
          v-if="phase === 'complete' && vector"
          ref="canvasContainerRef"
          class="absolute inset-0"
        >
          <canvas
            ref="canvasRef"
            class="w-full h-full cursor-crosshair"
            @mousemove="handleCanvasMouseMove"
            @mouseleave="handleCanvasMouseLeave"
          />
          <!-- Hover tooltip -->
          <div
            v-if="hoveredDim"
            class="pointer-events-none absolute z-10 rounded border border-border-default bg-surface-raised px-2 py-1 text-[10px] shadow-lg"
            :style="{
              left: `${Math.min(hoveredDim.x, (canvasContainerRef?.clientWidth ?? 200) - 120)}px`,
              top: `${hoveredDim.y - 36}px`,
            }"
          >
            <span class="text-text-muted">dim[{{ hoveredDim.index }}]</span>
            <span class="ml-1.5 font-mono" :class="hoveredDim.value >= 0 ? 'text-accent' : 'text-warning'">
              {{ hoveredDim.value.toFixed(6) }}
            </span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Legend + flow -->
    <div class="mt-3 flex items-center justify-between">
      <!-- Legend -->
      <div class="flex items-center gap-3 text-[10px] text-text-muted">
        <span class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full bg-[rgb(139,92,246)]" />
          Positive activation
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full bg-[rgb(251,146,60)]" />
          Negative activation
        </span>
        <span v-if="phase === 'complete'" class="text-text-muted">
          &middot; Each bar = one semantic dimension. Taller = stronger signal.
        </span>
      </div>

      <!-- Flow arrow -->
      <div class="flex items-center gap-2 text-[10px] text-text-muted shrink-0">
        <span class="rounded bg-surface-overlay px-1.5 py-0.5">Text</span>
        <span>&rarr;</span>
        <span class="rounded bg-surface-overlay px-1.5 py-0.5">Tokens</span>
        <span>&rarr;</span>
        <span class="rounded px-1.5 py-0.5" :class="phase === 'complete' ? 'bg-accent/10 text-accent' : 'bg-surface-overlay'">
          Vector
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
