<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  detail?: string
}>()

const isActive = computed(() => ['streaming', 'executing', 'running'].includes(props.status))

const badgeClass = computed(() => {
  const map: Record<string, string> = {
    idle: 'bg-surface-overlay text-text-muted',
    streaming: 'bg-accent/20 text-accent',
    completed: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
    cancelled: 'bg-warning/20 text-warning',
    pending: 'bg-surface-overlay text-text-muted',
    executing: 'bg-accent/20 text-accent',
    failed: 'bg-error/20 text-error',
    running: 'bg-accent/20 text-accent',
    partial: 'bg-warning/20 text-warning',
  }
  return map[props.status] ?? 'bg-surface-overlay text-text-muted'
})
</script>

<template>
  <span
    class="relative inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="badgeClass"
    :title="detail"
  >
    <span v-if="isActive" class="relative mr-1.5 flex h-2 w-2">
      <span class="absolute inline-flex h-full w-full rounded-full bg-current opacity-75" style="animation: ripple 1.5s ease-out infinite" />
      <span class="relative inline-flex h-2 w-2 rounded-full bg-current" />
    </span>
    {{ status }}
  </span>
</template>
