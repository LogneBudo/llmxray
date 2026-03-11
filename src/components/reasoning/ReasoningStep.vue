<script setup lang="ts">
import type { ReasoningStep } from '@/types/reasoning'
import { formatDuration } from '@/utils/format'

defineProps<{
  step: ReasoningStep
}>()

const typeStyles: Record<string, { color: string; icon: string }> = {
  thought: { color: 'text-accent', icon: '💭' },
  observation: { color: 'text-success', icon: '👁' },
  action: { color: 'text-warning', icon: '⚡' },
  conclusion: { color: 'text-[#a78bfa]', icon: '✓' },
  reflection: { color: 'text-[#f472b6]', icon: '↻' },
}
</script>

<template>
  <div class="flex gap-3">
    <div class="flex flex-col items-center">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-sm">
        {{ typeStyles[step.type]?.icon ?? '•' }}
      </div>
      <div class="flex-1 w-px bg-border-default" />
    </div>
    <div class="flex-1 pb-4">
      <div class="flex items-center gap-2 mb-1">
        <span
          class="text-xs font-semibold uppercase tracking-wide"
          :class="typeStyles[step.type]?.color ?? 'text-text-secondary'"
        >
          {{ step.type }}
        </span>
        <span class="text-xs text-text-muted">
          Step {{ step.index + 1 }} · {{ formatDuration(step.durationMs) }}
        </span>
      </div>
      <div class="rounded-lg border border-border-default bg-surface p-3 text-sm text-text-primary leading-relaxed">
        {{ step.content }}
      </div>
    </div>
  </div>
</template>
