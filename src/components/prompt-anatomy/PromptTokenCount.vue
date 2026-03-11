<script setup lang="ts">
import type { PromptSection } from '@/types/prompt'
import { sectionColors } from '@/utils/color-scales'

defineProps<{
  sections: PromptSection[]
  totalTokens: number
}>()
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
      Token Distribution (~{{ totalTokens }} total)
    </h4>
    <!-- Stacked bar -->
    <div class="flex h-6 overflow-hidden rounded-lg">
      <div
        v-for="section in sections"
        :key="section.id"
        class="transition-all"
        :style="{
          width: `${section.percentage}%`,
          backgroundColor: sectionColors[section.type] ?? sectionColors.unknown,
          minWidth: section.percentage > 0 ? '2px' : '0',
        }"
        :title="`${section.label}: ~${section.tokenCount} tokens (${section.percentage.toFixed(1)}%)`"
      />
    </div>
    <!-- Legend -->
    <div class="mt-3 flex flex-wrap gap-3 text-xs">
      <div v-for="section in sections" :key="section.id" class="flex items-center gap-1.5">
        <div
          class="h-2.5 w-2.5 rounded-sm"
          :style="{ backgroundColor: sectionColors[section.type] ?? sectionColors.unknown }"
        />
        <span class="text-text-secondary">{{ section.label }}</span>
        <span class="text-text-muted">({{ section.percentage.toFixed(0) }}%)</span>
      </div>
    </div>
  </div>
</template>
