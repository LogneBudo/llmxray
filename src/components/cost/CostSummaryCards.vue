<script setup lang="ts">
defineProps<{
  totalTokens: number
  totalSessions: number
  estimatedCost: number
  avgCostPerSession: number
}>()

function formatCost(value: number): string {
  if (value < 0.01) return '< $0.01'
  return `$${value.toFixed(2)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <p class="text-[10px] font-medium uppercase tracking-wide text-text-muted">{{ $t('cost.summary.totalTokens') }}</p>
      <p class="mt-1 text-2xl font-semibold text-text-primary">{{ formatTokens(totalTokens) }}</p>
    </div>
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <p class="text-[10px] font-medium uppercase tracking-wide text-text-muted">{{ $t('cost.summary.totalSessions') }}</p>
      <p class="mt-1 text-2xl font-semibold text-text-primary">{{ totalSessions }}</p>
    </div>
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <p class="text-[10px] font-medium uppercase tracking-wide text-text-muted">{{ $t('cost.summary.estimatedCost') }}</p>
      <p class="mt-1 text-2xl font-semibold text-accent">{{ formatCost(estimatedCost) }}</p>
    </div>
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <p class="text-[10px] font-medium uppercase tracking-wide text-text-muted">{{ $t('cost.summary.avgCostPerSession') }}</p>
      <p class="mt-1 text-2xl font-semibold text-text-primary">{{ formatCost(avgCostPerSession) }}</p>
    </div>
  </div>
</template>
