import { ref } from 'vue'
import type { OllamaChatMessage, OllamaOptions, OllamaToolDefinition, OllamaThink } from '@/types/ollama'
import { startGeneration } from '@/services/generate-service'
import { startChat } from '@/services/chat-service'

export function useOllamaStream() {
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentSessionId = ref<string | null>(null)
  let abortFn: (() => void) | null = null

  async function startGenerate(
    model: string,
    prompt: string,
    options?: OllamaOptions,
    system?: string,
  ): Promise<string> {
    isStreaming.value = true
    error.value = null

    try {
      const result = await startGeneration({ model, prompt, system, options })
      currentSessionId.value = result.sessionId
      abortFn = result.abort
      return result.sessionId
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start generation'
      isStreaming.value = false
      throw e
    }
  }

  async function startChatStream(
    model: string,
    messages: OllamaChatMessage[],
    options?: OllamaOptions,
    tools?: OllamaToolDefinition[],
    extras?: { think?: OllamaThink; format?: 'json' | Record<string, unknown> },
  ): Promise<string> {
    isStreaming.value = true
    error.value = null

    try {
      const result = await startChat({ model, messages, tools, options, think: extras?.think, format: extras?.format })
      currentSessionId.value = result.sessionId
      abortFn = result.abort
      return result.sessionId
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start chat'
      isStreaming.value = false
      throw e
    }
  }

  function cancel() {
    if (abortFn) {
      abortFn()
      abortFn = null
    }
    isStreaming.value = false
  }

  return {
    isStreaming,
    error,
    currentSessionId,
    startGenerate,
    startChatStream,
    cancel,
  }
}
