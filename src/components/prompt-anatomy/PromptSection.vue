<script setup lang="ts">
import type { PromptSection } from '@/types/prompt'
import { sectionColors } from '@/utils/color-scales'

const props = defineProps<{
  section: PromptSection
  totalTokens: number
}>()

const color = sectionColors[props.section.type] ?? sectionColors.unknown
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 border-b border-border-default">
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded-sm" :style="{ backgroundColor: color }" />
        <span class="text-sm font-medium text-text-primary">{{ section.label }}</span>
        <span class="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-muted">
          {{ section.type }}
        </span>
      </div>
      <div class="flex items-center gap-3 text-xs text-text-secondary">
        <span>~{{ section.tokenCount }} tokens</span>
        <span class="text-text-muted">{{ section.percentage.toFixed(1) }}%</span>
      </div>
    </div>
    <!-- Token percentage bar -->
    <div class="h-1 bg-surface">
      <div
        class="h-full transition-all"
        :style="{ width: `${section.percentage}%`, backgroundColor: color }"
      />
    </div>
    <!-- Content preview -->
    <pre class="px-4 py-3 text-xs text-text-secondary font-mono whitespace-pre-wrap max-h-40 overflow-auto">{{ section.content }}</pre>
  </div>
</template>
