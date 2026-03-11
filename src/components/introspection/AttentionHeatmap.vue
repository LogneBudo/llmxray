<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { AttentionPattern } from '@/types/introspection'

const props = defineProps<{
  patterns: AttentionPattern[]
}>()

const selectedPattern = ref(0)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const currentPattern = computed(() => props.patterns[selectedPattern.value] ?? null)

function drawHeatmap() {
  const canvas = canvasRef.value
  const pattern = currentPattern.value
  if (!canvas || !pattern) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const n = pattern.matrix.length
  const cellSize = Math.min(Math.floor(400 / n), 20)
  const size = n * cellSize

  canvas.width = size
  canvas.height = size

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const value = pattern.matrix[i]?.[j] ?? 0
      const intensity = Math.floor(value * 255)
      ctx.fillStyle = `rgb(${Math.floor(56 + value * 100)}, ${Math.floor(100 + intensity * 0.5)}, ${intensity})`
      ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize)
    }
  }
}

onMounted(drawHeatmap)
watch([currentPattern], drawHeatmap)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-text-secondary">Attention Pattern</h4>
        <span class="rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">Illustrative</span>
      </div>
      <select
        v-if="patterns.length > 1"
        v-model.number="selectedPattern"
        class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary"
      >
        <option v-for="(p, i) in patterns" :key="i" :value="i">
          Layer {{ p.layerIndex }} / Head {{ p.headIndex }}
        </option>
      </select>
    </div>

    <div v-if="currentPattern" class="overflow-auto rounded-lg border border-border-default bg-surface p-2">
      <canvas ref="canvasRef" class="max-w-full" />
    </div>

    <p class="text-xs text-text-muted">
      Synthetic attention pattern based on causal masking and positional decay.
      Not derived from actual model internals.
    </p>
  </div>
</template>
