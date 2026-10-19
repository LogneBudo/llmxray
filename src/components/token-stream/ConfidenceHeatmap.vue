<script setup lang="ts">
import { confidenceToColor } from '@/utils/color-scales'

/**
 * The colour scale's legend. It is the model's probability only when Ollama sent logprobs;
 * otherwise the colours show how fast each token came, and the legend says so.
 */
defineProps<{ source: 'probability' | 'pace' }>()

const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
    <span class="font-semibold text-text-primary">{{ $t(`dashboard.tokenStream.${source}`) }}</span>
    <span>{{ source === 'probability' ? $t('dashboard.tokenStream.low') : $t('dashboard.tokenStream.slow') }}</span>
    <div class="flex h-3 overflow-hidden rounded-sm">
      <div
        v-for="s in stops"
        :key="s"
        class="w-4 h-full"
        :style="{ backgroundColor: confidenceToColor(s) }"
      />
    </div>
    <span>{{ source === 'probability' ? $t('dashboard.tokenStream.high') : $t('dashboard.tokenStream.fast') }}</span>
    <span class="ms-2 text-text-muted">({{ $t(`dashboard.tokenStream.${source}Note`) }})</span>
  </div>
</template>
