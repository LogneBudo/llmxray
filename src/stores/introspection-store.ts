import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModelArchitecture, AttentionPattern, LayerActivation } from '@/types/introspection'

export const useIntrospectionStore = defineStore('introspection', () => {
  const architectureByModel = ref<Map<string, ModelArchitecture>>(new Map())
  const attentionPatterns = ref<Map<string, AttentionPattern[]>>(new Map())
  const layerActivations = ref<Map<string, LayerActivation[]>>(new Map())

  function getArchitecture(modelName: string): ModelArchitecture | null {
    return architectureByModel.value.get(modelName) ?? null
  }

  function setArchitecture(modelName: string, arch: ModelArchitecture) {
    architectureByModel.value.set(modelName, arch)
  }

  function getAttentionPatterns(sessionId: string): AttentionPattern[] {
    return attentionPatterns.value.get(sessionId) ?? []
  }

  function setAttentionPatterns(sessionId: string, patterns: AttentionPattern[]) {
    attentionPatterns.value.set(sessionId, patterns)
  }

  function getLayerActivations(sessionId: string): LayerActivation[] {
    return layerActivations.value.get(sessionId) ?? []
  }

  function setLayerActivations(sessionId: string, activations: LayerActivation[]) {
    layerActivations.value.set(sessionId, activations)
  }

  return {
    architectureByModel,
    attentionPatterns,
    layerActivations,
    getArchitecture,
    setArchitecture,
    getAttentionPatterns,
    setAttentionPatterns,
    getLayerActivations,
    setLayerActivations,
  }
})
