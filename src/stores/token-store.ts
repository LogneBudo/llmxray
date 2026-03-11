import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { StreamToken } from '@/types/token'

export const useTokenStore = defineStore('tokens', () => {
  const tokensBySession = shallowRef<Map<string, StreamToken[]>>(new Map())

  function pushToken(sessionId: string, token: StreamToken) {
    const map = new Map(tokensBySession.value)
    const existing = map.get(sessionId) ?? []
    map.set(sessionId, [...existing, token])
    tokensBySession.value = map
  }

  function getTokens(sessionId: string): StreamToken[] {
    return tokensBySession.value.get(sessionId) ?? []
  }

  function getTokenCount(sessionId: string): number {
    return (tokensBySession.value.get(sessionId) ?? []).length
  }

  function clearTokens(sessionId: string) {
    const map = new Map(tokensBySession.value)
    map.delete(sessionId)
    tokensBySession.value = map
  }

  return {
    tokensBySession,
    pushToken,
    getTokens,
    getTokenCount,
    clearTokens,
  }
})
