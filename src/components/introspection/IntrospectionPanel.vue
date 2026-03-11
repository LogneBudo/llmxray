<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useIntrospectionStore } from '@/stores/introspection-store'
import { useTokenStore } from '@/stores/token-store'
import { loadModelInfo } from '@/services/model-service'
import { generateSyntheticAttention, generateSyntheticActivations } from '@/services/introspection-service'
import ModelArchitectureDiagram from './ModelArchitectureDiagram.vue'
import AttentionHeatmap from './AttentionHeatmap.vue'
import LayerActivationChart from './LayerActivationChart.vue'

const props = defineProps<{
  sessionId: string
  modelName: string
}>()

const introspectionStore = useIntrospectionStore()
const tokenStore = useTokenStore()

const architecture = computed(() => introspectionStore.getArchitecture(props.modelName))
const attentionPatterns = computed(() => introspectionStore.getAttentionPatterns(props.sessionId))
const layerActivations = computed(() => introspectionStore.getLayerActivations(props.sessionId))

onMounted(async () => {
  // Load architecture if not cached
  if (!architecture.value) {
    await loadModelInfo(props.modelName)
  }

  // Generate synthetic visualizations
  const arch = architecture.value
  if (arch) {
    if (attentionPatterns.value.length === 0) {
      const tokens = tokenStore.getTokens(props.sessionId)
      const tokenTexts = tokens.slice(0, 30).map((t) => t.text)
      if (tokenTexts.length > 0) {
        const patterns = generateSyntheticAttention(tokenTexts, arch.attentionHeadCount, arch.blockCount)
        introspectionStore.setAttentionPatterns(props.sessionId, patterns)
      }
    }

    if (layerActivations.value.length === 0) {
      const activations = generateSyntheticActivations(arch)
      introspectionStore.setLayerActivations(props.sessionId, activations)
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="architecture">
      <h3 class="mb-3 text-sm font-medium text-text-secondary">Model Architecture</h3>
      <ModelArchitectureDiagram :architecture="architecture" />
    </div>

    <div v-if="attentionPatterns.length > 0">
      <AttentionHeatmap :patterns="attentionPatterns" />
    </div>

    <div v-if="layerActivations.length > 0">
      <LayerActivationChart :activations="layerActivations" />
    </div>

    <div v-if="!architecture" class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
      Loading model introspection data...
    </div>
  </div>
</template>
