import type { OllamaOptions } from '@/types/ollama'
import { useSessionStore } from '@/stores/session-store'
import { usePromptStore } from '@/stores/prompt-store'
import { ollamaClient } from './ollama-client'
import { executeGenerateStream } from './stream-handler'
import { analyzePrompt } from './prompt-analyzer'

export async function startGeneration(params: {
  model: string
  prompt: string
  system?: string
  options?: OllamaOptions
}): Promise<{ sessionId: string; abort: () => void }> {
  const sessionStore = useSessionStore()
  const promptStore = usePromptStore()

  const sessionId = sessionStore.createSession({
    mode: 'generate',
    model: params.model,
    prompt: params.prompt,
    options: params.options,
  })

  sessionStore.setActiveSession(sessionId)

  // Analyze prompt anatomy
  const anatomy = analyzePrompt(sessionId, params.prompt)
  promptStore.setAnatomy(sessionId, anatomy)

  const abortController = new AbortController()

  // Start streaming (async, does not block)
  const streamPromise = ollamaClient
    .streamGenerate(
      {
        model: params.model,
        prompt: params.prompt,
        system: params.system,
        options: params.options,
      },
      abortController.signal,
    )
    .then((stream) =>
      executeGenerateStream(sessionId, stream, abortController.signal),
    )
    .catch((err) => {
      if (!abortController.signal.aborted) {
        sessionStore.setSessionError(
          sessionId,
          err instanceof Error ? err.message : 'Generation failed',
        )
      }
    })

  // Fire and forget — the stream handler updates stores reactively
  void streamPromise

  return {
    sessionId,
    abort: () => {
      abortController.abort()
      sessionStore.cancelSession(sessionId)
    },
  }
}
