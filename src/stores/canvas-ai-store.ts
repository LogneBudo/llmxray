import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AiDraft, AiInsightsResult, AiAutoMapSuggestion } from '@/types/canvas-ai'
import { useModelStore } from './model-store'

const INTENT_STORAGE_KEY = 'llmxray-canvas-ai-intents'
const MODEL_STORAGE_KEY = 'llmxray-canvas-ai-model'

function loadIntents(): Map<string, string> {
  try {
    const raw = localStorage.getItem(INTENT_STORAGE_KEY)
    if (raw) return new Map(JSON.parse(raw) as [string, string][])
  } catch { /* ignore */ }
  return new Map()
}

function persistIntents(map: Map<string, string>) {
  localStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify([...map.entries()]))
}

export const useCanvasAiStore = defineStore('canvas-ai', () => {
  const drafts = ref<Map<string, AiDraft>>(new Map())
  const insights = ref<Map<string, AiInsightsResult>>(new Map())
  const autoMapSuggestions = ref<Map<string, AiAutoMapSuggestion>>(new Map())
  const intentMemory = ref<Map<string, string>>(loadIntents())
  const canvasAiModel = ref<string | null>(
    localStorage.getItem(MODEL_STORAGE_KEY) ?? null,
  )
  const activeRequests = ref<Map<string, AbortController>>(new Map())

  const modelStore = useModelStore()

  const effectiveModel = computed(() =>
    canvasAiModel.value ?? modelStore.chatModelNames[0] ?? '',
  )

  function setCanvasAiModel(model: string | null) {
    canvasAiModel.value = model
    if (model) {
      localStorage.setItem(MODEL_STORAGE_KEY, model)
    } else {
      localStorage.removeItem(MODEL_STORAGE_KEY)
    }
  }

  function setDraft(toolId: string, draft: AiDraft) {
    drafts.value = new Map(drafts.value).set(toolId, draft)
  }

  function clearDraft(toolId: string) {
    const next = new Map(drafts.value)
    next.delete(toolId)
    drafts.value = next
  }

  function setInsights(toolId: string, result: AiInsightsResult) {
    insights.value = new Map(insights.value).set(toolId, result)
  }

  function clearInsights(toolId: string) {
    const next = new Map(insights.value)
    next.delete(toolId)
    insights.value = next
  }

  function setAutoMapSuggestion(toolId: string, suggestion: AiAutoMapSuggestion) {
    autoMapSuggestions.value = new Map(autoMapSuggestions.value).set(toolId, suggestion)
  }

  function clearAutoMapSuggestion(toolId: string) {
    const next = new Map(autoMapSuggestions.value)
    next.delete(toolId)
    autoMapSuggestions.value = next
  }

  function setIntent(toolId: string, text: string) {
    intentMemory.value = new Map(intentMemory.value).set(toolId, text)
    persistIntents(intentMemory.value)
  }

  function getIntent(toolId: string): string | undefined {
    return intentMemory.value.get(toolId)
  }

  function startRequest(key: string): AbortController {
    cancelRequest(key)
    const controller = new AbortController()
    activeRequests.value = new Map(activeRequests.value).set(key, controller)
    return controller
  }

  function cancelRequest(key: string) {
    const existing = activeRequests.value.get(key)
    if (existing) {
      existing.abort()
      const next = new Map(activeRequests.value)
      next.delete(key)
      activeRequests.value = next
    }
  }

  function finishRequest(key: string) {
    const next = new Map(activeRequests.value)
    next.delete(key)
    activeRequests.value = next
  }

  return {
    drafts,
    insights,
    autoMapSuggestions,
    intentMemory,
    canvasAiModel,
    activeRequests,
    effectiveModel,
    setCanvasAiModel,
    setDraft,
    clearDraft,
    setInsights,
    clearInsights,
    setAutoMapSuggestion,
    clearAutoMapSuggestion,
    setIntent,
    getIntent,
    startRequest,
    cancelRequest,
    finishRequest,
  }
})
