<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  unit?: string
  trend?: number
}>()
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <div class="text-xs font-medium text-text-muted uppercase tracking-wide">{{ label }}</div>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="text-2xl font-bold text-text-primary">{{ value }}</span>
      <span v-if="unit" class="text-sm text-text-secondary">{{ unit }}</span>
    </div>
    <div v-if="trend !== undefined" class="mt-1 text-xs" :class="trend >= 0 ? 'text-success' : 'text-error'">
      {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend).toFixed(1) }}%
    </div>
  </div>
</template>
