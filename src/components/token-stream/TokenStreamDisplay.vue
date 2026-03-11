<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { HeatmapMode, StreamToken } from '@/types/token'
import { useTokenStore } from '@/stores/token-store'
import { useTokenConfidence } from '@/composables/useTokenConfidence'
import { confidenceToColor, latencyToColor } from '@/utils/color-scales'
import TokenChip from './TokenChip.vue'
import ConfidenceHeatmap from './ConfidenceHeatmap.vue'

const props = defineProps<{
  sessionId: string
  heatmapMode?: HeatmapMode
}>()

const tokenStore = useTokenStore()
const sessionIdRef = computed(() => props.sessionId)
const { tokens, confidenceRange } = useTokenConfidence(sessionIdRef)

const containerRef = ref<HTMLElement | null>(null)
const hoveredToken = ref<StreamToken | null>(null)
const mode = computed(() => props.heatmapMode ?? 'confidence')

function getTokenColor(token: StreamToken): string {
  switch (mode.value) {
    case 'confidence':
      return confidenceToColor(token.confidence)
    case 'latency': {
      const median = confidenceRange.value.median
      return latencyToColor(token.interTokenLatencyMs, median > 0 ? median * 100 : 50)
    }
    case 'position': {
      const ratio = tokens.value.length > 1 ? token.index / (tokens.value.length - 1) : 0.5
      return confidenceToColor(1 - ratio)
    }
    default:
      return confidenceToColor(token.confidence)
  }
}

// Auto-scroll to bottom
watch(
  () => tokens.value.length,
  async () => {
    await nextTick()
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <ConfidenceHeatmap />

    <div
      ref="containerRef"
      class="min-h-[200px] max-h-[500px] overflow-auto rounded-lg border border-border-default bg-surface p-4 font-mono text-sm leading-relaxed"
    >
      <span v-if="tokens.length === 0" class="text-text-muted italic">
        Waiting for tokens...
      </span>
      <TokenChip
        v-for="(token, i) in tokens"
        :key="token.id"
        :token="token"
        :color="getTokenColor(token)"
        :is-latest="i === tokens.length - 1"
        :heatmap-mode="mode"
        @hover="hoveredToken = $event"
      />
    </div>

    <!-- Token detail tooltip -->
    <div
      v-if="hoveredToken"
      class="rounded-lg border border-border-default bg-surface-raised p-3 text-xs space-y-1"
    >
      <div class="flex gap-4">
        <span class="text-text-muted">Token #{{ hoveredToken.index }}</span>
        <span class="text-text-muted">
          Confidence: <span class="text-text-primary">{{ (hoveredToken.confidence * 100).toFixed(0) }}%</span>
        </span>
        <span class="text-text-muted">
          Latency: <span class="text-text-primary">{{ hoveredToken.interTokenLatencyMs }}ms</span>
        </span>
        <span class="text-text-muted">
          Text: <span class="text-text-primary font-mono">"{{ hoveredToken.text }}"</span>
        </span>
      </div>
    </div>
  </div>
</template>
