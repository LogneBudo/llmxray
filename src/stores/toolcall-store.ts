import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToolCallEntry } from '@/types/toolcall'

export const useToolCallStore = defineStore('toolcalls', () => {
  const callsBySession = ref<Map<string, ToolCallEntry[]>>(new Map())

  function getToolCalls(sessionId: string): ToolCallEntry[] {
    return callsBySession.value.get(sessionId) ?? []
  }

  function getPendingCalls(sessionId: string): ToolCallEntry[] {
    return getToolCalls(sessionId).filter((c) => c.status === 'pending')
  }

  function addToolCall(sessionId: string, entry: ToolCallEntry) {
    let calls = callsBySession.value.get(sessionId)
    if (!calls) {
      calls = []
      callsBySession.value.set(sessionId, calls)
    }
    calls.push(entry)
  }

  function updateToolCall(
    sessionId: string,
    callId: string,
    partial: Partial<ToolCallEntry>,
  ) {
    const calls = callsBySession.value.get(sessionId)
    if (!calls) return
    const entry = calls.find((c) => c.id === callId)
    if (entry) Object.assign(entry, partial)
  }

  return {
    callsBySession,
    getToolCalls,
    getPendingCalls,
    addToolCall,
    updateToolCall,
  }
})
