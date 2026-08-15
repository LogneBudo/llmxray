import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OllamaModel, OllamaModelInfo, OllamaCapability } from '@/types/ollama'
import { ollamaClient } from '@/services/ollama-client'
import { capabilityUnicodeIcons } from '@/utils/capability-defs'
import { parseModelParameters } from '@/utils/parse-model-params'
import type { OllamaOptions } from '@/types/ollama'

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
    /gpt-oss/i, // OpenAI open-weight reasoning
    /magistral/i, // Mistral reasoning
    /nemotron/i, // NVIDIA Nemotron reasoning family
    /\bqwen3(\.\d+)?\b/i, // Qwen 3.x reasons by default
    /muse-glimmer/i, // Meta Superintelligence Labs agent model
    /\bglm-\d/i, // GLM reasoning line
    /kimi-k\d/i, // Moonshot Kimi
  ]

  // Vision model name patterns (fallback when Ollama doesn't report capabilities)
  const VISION_NAME_PATTERNS = [
    /llava/i,
    /\bvl\b/i,
    /vision/i,
    /minicpm-v/i,
    /moondream/i,
    /\bmllama\b/i,
    /gemma3/i,
    /muse-glimmer/i,
  ]

  // Embedding-only model families and name patterns
  const EMBEDDING_FAMILIES = new Set(['bert', 'nomic-bert'])
  const EMBEDDING_NAME_PATTERNS = [/embed/i, /^nomic-/i, /^mxbai-/i, /^all-minilm/i, /^bge-/i, /^gte-/i, /^e5-/i, /^snowflake-arctic-embed/i]

  /**
   * True when a model is embedding-only. Ollama 0.32 reports an `embedding`
   * capability directly in /api/tags; family and name heuristics remain as a
   * fallback for older daemons that report nothing.
   */
  function isEmbeddingOnly(m: OllamaModel): boolean {
    const caps = m.capabilities ?? modelInfoCache.value.get(m.name)?.capabilities
    if (caps?.length) return caps.includes('embedding') && !caps.includes('completion')

    const families = m.details?.families ?? []
    if (families.length > 0 && families.every((f) => EMBEDDING_FAMILIES.has(f))) return true
    return EMBEDDING_NAME_PATTERNS.some((p) => p.test(m.name))
  }

  const chatModelNames = computed(() =>
    models.value.filter((m) => !isEmbeddingOnly(m)).map((m) => m.name),
  )

  // Inverse of chatModelNames — only embedding-capable models
  const embeddingModelNames = computed(() =>
    models.value.filter((m) => isEmbeddingOnly(m)).map((m) => m.name),
  )

  function getModelDetails(name: string): OllamaModelInfo | undefined {
    return modelInfoCache.value.get(name)
  }

  /**
   * Capabilities for a model. Ollama 0.32 reports these in /api/tags, so they
   * are known as soon as the model list lands — no longer gated on the
   * per-model /api/show round-trip. /api/show wins when cached, since it is
   * refreshed on demand; the tag listing is the immediate fallback.
   */
  function getCapabilities(name: string): OllamaCapability[] {
    const fromShow = modelInfoCache.value.get(name)?.capabilities
    if (fromShow?.length) return fromShow
    return models.value.find((m) => m.name === name)?.capabilities ?? []
  }

  /** Detect thinking/reasoning models via Ollama capabilities or name pattern fallback */
  function isThinkingModel(name: string): boolean {
    const caps = getCapabilities(name)
    if (caps.includes('thinking')) return true
    // Only guess when the daemon reported nothing — a reported capability set
    // that omits 'thinking' is an authoritative "no".
    if (caps.length > 0) return false
    return THINKING_NAME_PATTERNS.some((p) => p.test(name))
  }

  /** Detect vision-capable models via Ollama capabilities or name pattern fallback */
  function isVisionModel(name: string): boolean {
    const caps = getCapabilities(name)
    if (caps.includes('vision')) return true
    if (caps.length > 0) return false
    return VISION_NAME_PATTERNS.some((p) => p.test(name))
  }

  /** Detect tool-calling support via Ollama capabilities */
  function supportsTools(name: string): boolean {
    return getCapabilities(name).includes('tools')
  }

  /**
   * Training context window in tokens, reported by /api/tags since Ollama 0.32.
   * Falls back to the architecture key in /api/show's model_info.
   */
  function getContextLength(name: string): number | undefined {
    const fromTags = models.value.find((m) => m.name === name)?.details?.context_length
    if (fromTags) return fromTags

    const info = modelInfoCache.value.get(name)?.model_info
    if (!info) return undefined
    const key = Object.keys(info).find((k) => k.endsWith('.context_length'))
    const val = key ? info[key] : undefined
    return typeof val === 'number' ? val : undefined
  }

  /** Embedding vector width, reported by /api/tags since Ollama 0.32. */
  function getEmbeddingLength(name: string): number | undefined {
    return models.value.find((m) => m.name === name)?.details?.embedding_length
  }

  /** Parse model's default parameters from /api/show into OllamaOptions */
  function getModelDefaults(name: string): Partial<OllamaOptions> {
    const info = modelInfoCache.value.get(name)
    if (!info?.parameters) return {}
    const raw = parseModelParameters(info.parameters)
    const opts: Partial<OllamaOptions> = {}
    if (raw.temperature) opts.temperature = parseFloat(raw.temperature)
    if (raw.num_ctx) opts.num_ctx = parseInt(raw.num_ctx, 10)
    if (raw.top_p) opts.top_p = parseFloat(raw.top_p)
    if (raw.top_k) opts.top_k = parseInt(raw.top_k, 10)
    if (raw.repeat_penalty) opts.repeat_penalty = parseFloat(raw.repeat_penalty)
    if (raw.num_predict) opts.num_predict = parseInt(raw.num_predict, 10)
    if (raw.mirostat) opts.mirostat = parseInt(raw.mirostat, 10)
    if (raw.seed) opts.seed = parseInt(raw.seed, 10)
    // Stop sequences can appear as multiple "stop" lines
    const stops = Object.entries(raw).filter(([k]) => k === 'stop').map(([, v]) => v)
    if (stops.length > 0) opts.stop = stops
    return opts
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
      // Capabilities and context length already arrived with the listing, so the
      // UI is correct immediately. This enriches the cache with the rest of
      // /api/show (parameters, template, license, model_info) in the background.
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

  async function deleteModel(name: string) {
    await ollamaClient.deleteModel(name)
    models.value = models.value.filter((m) => m.name !== name)
    modelInfoCache.value.delete(name)
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
    getContextLength,
    getEmbeddingLength,
    getModelDefaults,
    isThinkingModel,
    isVisionModel,
    supportsTools,
    capabilityIcons,
    fetchModels,
    fetchModelInfo,
    deleteModel,
  }
})
