import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReasoningStep, ReasoningChain } from '@/types/reasoning'

export interface ThinkingState {
  isThinking: boolean
  content: string
}

export const useReasoningStore = defineStore('reasoning', () => {
  const chainsBySession = ref<Map<string, ReasoningChain>>(new Map())
  const thinkingBySession = ref<Map<string, ThinkingState>>(new Map())

  function getChain(sessionId: string): ReasoningChain | null {
    return chainsBySession.value.get(sessionId) ?? null
  }

  function getSteps(sessionId: string): ReasoningStep[] {
    return chainsBySession.value.get(sessionId)?.steps ?? []
  }

  function addStep(sessionId: string, step: ReasoningStep) {
    let chain = chainsBySession.value.get(sessionId)
    if (!chain) {
      chain = { sessionId, steps: [], totalSteps: 0, currentDepth: 0 }
      chainsBySession.value.set(sessionId, chain)
    }
    chain.steps.push(step)
    chain.totalSteps = chain.steps.length
  }

  function clearChain(sessionId: string) {
    chainsBySession.value.delete(sessionId)
  }

  function setThinking(sessionId: string, isThinking: boolean, content: string) {
    thinkingBySession.value.set(sessionId, { isThinking, content })
  }

  function getThinking(sessionId: string): ThinkingState {
    return thinkingBySession.value.get(sessionId) ?? { isThinking: false, content: '' }
  }

  return {
    chainsBySession,
    thinkingBySession,
    getChain,
    getSteps,
    addStep,
    clearChain,
    setThinking,
    getThinking,
  }
})
