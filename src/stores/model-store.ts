import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OllamaModel, OllamaModelInfo } from '@/types/ollama'
import { ollamaClient } from '@/services/ollama-client'
import { capabilityUnicodeIcons } from '@/utils/capability-defs'

export const useModelStore = defineStore('models', () => {
  const models = ref<OllamaModel[]>([])
  const modelInfoCache = ref<Map<string, OllamaModelInfo>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const modelNames = computed(() => models.value.map((m) => m.name))

  // Thinking/reasoning model name patterns (fallback when Ollama doesn't report capabilities)
  const THINKING_NAME_PATTERNS = [
    /deepseek-r1/i,
    /\br1\b/i,
    /\bqwq\b/i,
    /\bo1\b/i,
    /\bo3\b/i,
    /thinking/i,
  ]

  // Embedding-only model families and name patterns
  const EMBEDDING_FAMILIES = new Set(['bert', 'nomic-bert'])
  const EMBEDDING_NAME_PATTERNS = [/embed/i, /^nomic-/i, /^mxbai-/i, /^all-minilm/i, /^bge-/i, /^gte-/i, /^e5-/i, /^snowflake-arctic-embed/i]

  const chatModelNames = computed(() =>
    models.value
      .filter((m) => {
        // Exclude if all families are embedding-only families
        const families = m.details?.families ?? []
        if (families.length > 0 && families.every((f) => EMBEDDING_FAMILIES.has(f))) {
          return false
        }
        // Exclude by name pattern
        return !EMBEDDING_NAME_PATTERNS.some((p) => p.test(m.name))
      })
      .map((m) => m.name),
  )

  // Inverse of chatModelNames — only embedding-capable models
  const embeddingModelNames = computed(() =>
    models.value
      .filter((m) => {
        const families = m.details?.families ?? []
        if (families.length > 0 && families.every((f) => EMBEDDING_FAMILIES.has(f))) {
          return true
        }
        return EMBEDDING_NAME_PATTERNS.some((p) => p.test(m.name))
      })
      .map((m) => m.name),
  )

  function getModelDetails(name: string): OllamaModelInfo | undefined {
    return modelInfoCache.value.get(name)
  }

  function getCapabilities(name: string): string[] {
    return modelInfoCache.value.get(name)?.capabilities ?? []
  }

  /** Detect thinking/reasoning models via Ollama capabilities or name pattern fallback */
  function isThinkingModel(name: string): boolean {
    const caps = modelInfoCache.value.get(name)?.capabilities ?? []
    if (caps.includes('thinking')) return true
    return THINKING_NAME_PATTERNS.some((p) => p.test(name))
  }

  /** Unicode symbols for embedding in <option> text — delegates to shared capability-defs */
  function capabilityIcons(name: string): string {
    return capabilityUnicodeIcons(getCapabilities(name))
  }

  async function fetchModels() {
    loading.value = true
    error.value = null
    try {
      models.value = await ollamaClient.listModels()
      // Fetch capabilities for all models in parallel (non-blocking)
      fetchAllModelInfo()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch models'
    } finally {
      loading.value = false
    }
  }

  async function fetchAllModelInfo() {
    const names = models.value.map((m) => m.name)
    await Promise.allSettled(names.map((n) => fetchModelInfo(n)))
  }

  async function fetchModelInfo(name: string) {
    try {
      const info = await ollamaClient.showModel(name)
      modelInfoCache.value.set(name, info)
    } catch (e) {
      console.error(`Failed to fetch info for ${name}:`, e)
    }
  }

  return {
    models,
    modelInfoCache,
    loading,
    error,
    modelNames,
    chatModelNames,
    embeddingModelNames,
    getModelDetails,
    getCapabilities,
    isThinkingModel,
    capabilityIcons,
    fetchModels,
    fetchModelInfo,
  }
})
