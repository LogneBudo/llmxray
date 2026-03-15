import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { StreamToken } from '@/types/token'
import { conversationDB } from '@/services/conversation-db'

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

  /** Persist tokens for a completed session to IndexedDB */
  function persistTokens(sessionId: string) {
    const tokens = tokensBySession.value.get(sessionId)
    if (tokens && tokens.length > 0) {
      conversationDB.saveTokens(sessionId, tokens).catch(console.error)
    }
  }

  /** Load tokens from IndexedDB into the in-memory store */
  async function loadTokens(sessionId: string): Promise<void> {
    if (tokensBySession.value.has(sessionId)) return
    const tokens = await conversationDB.getTokens(sessionId)
    if (tokens.length > 0) {
      const map = new Map(tokensBySession.value)
      map.set(sessionId, tokens)
      tokensBySession.value = map
    }
  }

  return {
    tokensBySession,
    pushToken,
    getTokens,
    getTokenCount,
    clearTokens,
    persistTokens,
    loadTokens,
  }
})
