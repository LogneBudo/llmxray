import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PromptAnatomy, PromptSection } from '@/types/prompt'

export const usePromptStore = defineStore('prompt', () => {
  const anatomyBySession = ref<Map<string, PromptAnatomy>>(new Map())

  function getAnatomy(sessionId: string): PromptAnatomy | null {
    return anatomyBySession.value.get(sessionId) ?? null
  }

  function getSections(sessionId: string): PromptSection[] {
    return anatomyBySession.value.get(sessionId)?.sections ?? []
  }

  function setAnatomy(sessionId: string, anatomy: PromptAnatomy) {
    anatomyBySession.value.set(sessionId, anatomy)
  }

  return {
    anatomyBySession,
    getAnatomy,
    getSections,
    setAnatomy,
  }
})
