<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
}>()

const percentage = computed(() => Math.round(props.score * 100))

const color = computed(() => {
  if (props.score >= 0.8) return '#4ade80'
  if (props.score >= 0.5) return '#fbbf24'
  return '#f87171'
})

const label = computed(() => {
  if (props.score >= 0.9) return 'Very Similar'
  if (props.score >= 0.7) return 'Similar'
  if (props.score >= 0.5) return 'Somewhat Similar'
  if (props.score >= 0.3) return 'Weakly Related'
  return 'Dissimilar'
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="relative h-32 w-32">
      <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
        <!-- Background circle -->
        <circle cx="50" cy="50" r="42" fill="none" class="stroke-surface-overlay" stroke-width="8" />
        <!-- Score arc -->
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          :stroke="color"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="`${percentage * 2.64} 264`"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold text-text-primary">{{ percentage }}%</span>
      </div>
    </div>
    <span class="text-sm font-medium" :style="{ color }">{{ label }}</span>
    <span class="text-xs text-text-muted">Cosine Similarity</span>
  </div>
</template>
