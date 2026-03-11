import type { OllamaChatMessage, OllamaOptions, OllamaToolDefinition } from '@/types/ollama'
import { useSessionStore } from '@/stores/session-store'
import { usePromptStore } from '@/stores/prompt-store'
import { ollamaClient } from './ollama-client'
import { executeChatStream } from './stream-handler'
import { analyzeMessages } from './prompt-analyzer'

export async function startChat(params: {
  model: string
  messages: OllamaChatMessage[]
  tools?: OllamaToolDefinition[]
  options?: OllamaOptions
}): Promise<{ sessionId: string; abort: () => void }> {
  const sessionStore = useSessionStore()
  const promptStore = usePromptStore()

  const promptText = params.messages.map((m) => `[${m.role}] ${m.content}`).join('\n')

  const sessionId = sessionStore.createSession({
    mode: 'chat',
    model: params.model,
    prompt: promptText,
    messages: params.messages,
    options: params.options,
  })

  sessionStore.setActiveSession(sessionId)

  const anatomy = analyzeMessages(sessionId, params.messages)
  promptStore.setAnatomy(sessionId, anatomy)

  const abortController = new AbortController()

  const streamPromise = ollamaClient
    .streamChat(
      {
        model: params.model,
        messages: params.messages,
        tools: params.tools,
        options: params.options,
      },
      abortController.signal,
    )
    .then((stream) =>
      executeChatStream(sessionId, stream, abortController.signal),
    )
    .catch((err) => {
      if (!abortController.signal.aborted) {
        sessionStore.setSessionError(
          sessionId,
          err instanceof Error ? err.message : 'Chat failed',
        )
      }
    })

  void streamPromise

  return {
    sessionId,
    abort: () => {
      abortController.abort()
      sessionStore.cancelSession(sessionId)
    },
  }
}
