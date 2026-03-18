<script setup lang="ts">
import { confidenceToColor } from '@/utils/color-scales'

const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-text-secondary">
    <span>Low</span>
    <div class="flex h-3 overflow-hidden rounded-sm">
      <div
        v-for="s in stops"
        :key="s"
        class="w-4 h-full"
        :style="{ backgroundColor: confidenceToColor(s) }"
      />
    </div>
    <span>High</span>
    <span class="ms-2 text-text-muted">(confidence from token latency)</span>
  </div>
</template>
