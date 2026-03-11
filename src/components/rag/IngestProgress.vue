<script setup lang="ts">
import type { IngestProgress } from '@/services/rag-pipeline'

defineProps<{
  progress: IngestProgress | null
}>()
</script>

<template>
  <div v-if="progress" class="rounded-lg border border-accent/30 bg-accent/5 p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium text-text-primary">{{ progress.message }}</span>
      <span class="text-xs text-text-muted">{{ (progress.progress * 100).toFixed(0) }}%</span>
    </div>
    <div class="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
      <div
        class="h-full rounded-full bg-accent transition-all duration-300"
        :style="{ width: `${progress.progress * 100}%` }"
      />
    </div>
  </div>
</template>
