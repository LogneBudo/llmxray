<script setup lang="ts">
import { computed } from 'vue'
import type { StreamToken, HeatmapMode } from '@/types/token'

const props = defineProps<{
  token: StreamToken
  color: string
  isLatest: boolean
  heatmapMode: HeatmapMode
}>()

defineEmits<{
  hover: [token: StreamToken]
  click: [token: StreamToken]
}>()

const style = computed(() => ({
  // Use a subtle underline/bottom-border for the heatmap instead of background
  // so text remains readable on the dark surface
  borderBottomColor: props.color,
  borderBottomWidth: '3px',
  borderBottomStyle: 'solid' as const,
}))
</script>

<template>
  <span
    class="inline cursor-pointer rounded-sm px-px text-text-primary transition-all hover:bg-surface-overlay"
    :class="{ 'animate-pulse': isLatest }"
    :style="style"
    :title="`Token #${token.index} | Confidence: ${(token.confidence * 100).toFixed(0)}% | Latency: ${token.interTokenLatencyMs}ms`"
    @mouseenter="$emit('hover', token)"
    @click="$emit('click', token)"
  >{{ token.text }}</span>
</template>
