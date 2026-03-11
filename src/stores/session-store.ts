import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Session, SessionStatus, SessionMode } from '@/types/session'
import type { OllamaChatMessage, OllamaOptions } from '@/types/ollama'
import type { SessionMetrics } from '@/types/metrics'

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref<Map<string, Session>>(new Map())
  const activeSessionId = ref<string | null>(null)

  const activeSession = computed<Session | null>(() => {
    if (!activeSessionId.value) return null
    return sessions.value.get(activeSessionId.value) ?? null
  })

  const recentSessions = computed<Session[]>(() => {
    return [...sessions.value.values()].sort((a, b) => b.createdAt - a.createdAt)
  })

  function sessionById(id: string): Session | undefined {
    return sessions.value.get(id)
  }

  function createSession(params: {
    mode: SessionMode
    model: string
    prompt: string
    messages?: OllamaChatMessage[]
    options?: OllamaOptions
  }): string {
    const id = nanoid()
    const session: Session = {
      id,
      mode: params.mode,
      model: params.model,
      status: 'idle',
      createdAt: Date.now(),
      prompt: params.prompt,
      messages: params.messages ?? [],
      options: params.options ?? {},
      outputText: '',
      metrics: null,
    }
    sessions.value.set(id, session)
    return id
  }

  function updateSessionStatus(id: string, status: SessionStatus) {
    const session = sessions.value.get(id)
    if (session) session.status = status
  }

  function appendOutput(id: string, text: string) {
    const session = sessions.value.get(id)
    if (session) session.outputText += text
  }

  function finalizeSession(id: string, metrics: SessionMetrics) {
    const session = sessions.value.get(id)
    if (session) {
      session.status = 'completed'
      session.metrics = metrics
    }
  }

  function setSessionError(id: string, error: string) {
    const session = sessions.value.get(id)
    if (session) {
      session.status = 'error'
      session.error = error
    }
  }

  function cancelSession(id: string) {
    const session = sessions.value.get(id)
    if (session) session.status = 'cancelled'
  }

  function setActiveSession(id: string | null) {
    activeSessionId.value = id
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    recentSessions,
    sessionById,
    createSession,
    updateSessionStatus,
    appendOutput,
    finalizeSession,
    setSessionError,
    cancelSession,
    setActiveSession,
  }
})
