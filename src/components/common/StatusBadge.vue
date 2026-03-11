<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const badgeClass = computed(() => {
  const map: Record<string, string> = {
    idle: 'bg-surface-overlay text-text-muted',
    streaming: 'bg-accent/20 text-accent animate-pulse',
    completed: 'bg-success/20 text-success',
    error: 'bg-error/20 text-error',
    cancelled: 'bg-warning/20 text-warning',
    pending: 'bg-surface-overlay text-text-muted',
    executing: 'bg-accent/20 text-accent animate-pulse',
    failed: 'bg-error/20 text-error',
    running: 'bg-accent/20 text-accent animate-pulse',
    partial: 'bg-warning/20 text-warning',
  }
  return map[props.status] ?? 'bg-surface-overlay text-text-muted'
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="badgeClass"
  >
    {{ status }}
  </span>
</template>
