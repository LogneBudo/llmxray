<script setup lang="ts">
import { computed } from 'vue'
import { formatBytes } from '@/utils/format'

export interface StorageSegment {
  name: string
  bytes: number
  color: string
}

const props = withDefaults(
  defineProps<{
    used: number
    total: number
    label?: string
    animating?: boolean
    segments?: StorageSegment[]
    compact?: boolean
  }>(),
  { animating: false, compact: false },
)

const percent = computed(() => {
  if (props.total <= 0) return 0
  return Math.min(Math.round((props.used / props.total) * 100), 100)
})

const barColor = computed(() => {
  if (percent.value > 85) return 'bg-error'
  if (percent.value > 60) return 'bg-warning'
  return 'bg-success'
})

const segmentWidths = computed(() => {
  if (!props.segments || props.total <= 0) return []
  return props.segments.map((s) => ({
    ...s,
    width: Math.max((s.bytes / props.total) * 100, 0.5),
  }))
})
</script>

<template>
  <div class="space-y-1.5">
    <div v-if="!compact" class="flex items-center justify-between text-xs">
      <span class="text-text-secondary">{{ label ?? 'Storage' }}</span>
      <span class="text-text-muted">
        {{ formatBytes(used) }} / {{ formatBytes(total) }}
        <span class="ms-1">({{ percent }}%)</span>
      </span>
    </div>

    <!-- Segmented bar -->
    <div
      class="h-2 rounded-full bg-surface-overlay overflow-hidden"
      :class="{ 'animate-storage-pulse': animating }"
    >
      <div v-if="segments && segments.length > 0" class="flex h-full">
        <div
          v-for="seg in segmentWidths"
          :key="seg.name"
          class="h-full transition-all duration-500 first:rounded-s-full last:rounded-e-full"
          :style="{ width: `${seg.width}%`, backgroundColor: seg.color }"
          :title="`${seg.name}: ${formatBytes(seg.bytes)}`"
        />
      </div>
      <!-- Simple bar -->
      <div
        v-else
        class="h-full rounded-full transition-all duration-500"
        :class="barColor"
        :style="{ width: `${percent}%` }"
      />
    </div>

    <div v-if="compact" class="flex items-center justify-between text-[10px] text-text-muted">
      <span>{{ label }}</span>
      <span>{{ formatBytes(used) }} / {{ formatBytes(total) }} ({{ percent }}%)</span>
    </div>
  </div>
</template>

<style>
@keyframes storage-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.4); }
}
.animate-storage-pulse {
  animation: storage-pulse 1.5s ease-in-out infinite;
}
</style>
