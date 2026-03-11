<script setup lang="ts">
import { computed } from 'vue'
import type { ModelArchitecture } from '@/types/introspection'
import { formatParamCount } from '@/utils/format'

const props = defineProps<{
  architecture: ModelArchitecture
}>()

const layerTypeColors: Record<string, string> = {
  embedding: '#818cf8',
  attention: '#38bdf8',
  feed_forward: '#fb923c',
  norm: '#94a3b8',
  output: '#4ade80',
}

// Show a compact representation: just unique block types
const blockSummary = computed(() => {
  const arch = props.architecture
  return [
    { label: 'Embedding', color: layerTypeColors.embedding, count: 1 },
    { label: 'Attention', color: layerTypeColors.attention, count: arch.blockCount },
    { label: 'FFN', color: layerTypeColors.feed_forward, count: arch.blockCount },
    { label: 'LayerNorm', color: layerTypeColors.norm, count: arch.blockCount },
    { label: 'Output', color: layerTypeColors.output, count: 1 },
  ]
})
</script>

<template>
  <div class="space-y-4">
    <!-- Architecture stats -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-lg bg-surface p-3">
        <div class="text-xs text-text-muted">Family</div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.family }}</div>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <div class="text-xs text-text-muted">Parameters</div>
        <div class="text-sm font-medium text-text-primary">{{ formatParamCount(architecture.totalParameters) }}</div>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <div class="text-xs text-text-muted">Context Length</div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.contextLength.toLocaleString() }}</div>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <div class="text-xs text-text-muted">Quantization</div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.quantization }}</div>
      </div>
    </div>

    <!-- Layer diagram -->
    <div class="rounded-lg bg-surface p-4">
      <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Layer Structure ({{ architecture.blockCount }} blocks)</h4>
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="block in blockSummary"
          :key="block.label"
          class="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
        >
          <div class="h-3 w-3 rounded-sm" :style="{ backgroundColor: block.color }" />
          <span class="text-xs text-text-primary">{{ block.label }}</span>
          <span class="text-xs text-text-muted">×{{ block.count }}</span>
        </div>
      </div>
    </div>

    <!-- Architecture details -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="rounded-lg bg-surface p-3">
        <span class="text-text-muted">Attention Heads:</span>
        <span class="ml-1 text-text-primary">{{ architecture.attentionHeadCount }}</span>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <span class="text-text-muted">KV Heads:</span>
        <span class="ml-1 text-text-primary">{{ architecture.kvHeadCount }}</span>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <span class="text-text-muted">Embedding Dim:</span>
        <span class="ml-1 text-text-primary">{{ architecture.embeddingLength }}</span>
      </div>
      <div class="rounded-lg bg-surface p-3">
        <span class="text-text-muted">FFN Dim:</span>
        <span class="ml-1 text-text-primary">{{ architecture.feedForwardLength }}</span>
      </div>
    </div>
  </div>
</template>
