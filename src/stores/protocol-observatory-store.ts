import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ollamaClient } from '@/services/ollama-client'
import { anthropicClient, readAnthropicSSE } from '@/services/anthropic-client'
import { readNDJSONStream, readSSEStream } from '@/services/stream-handler'
import type { OllamaChatChunk } from '@/types/ollama'
import type { OpenAIChatChunk } from '@/types/ollama'
import type { AnthropicStreamEvent } from '@/types/anthropic'

export type ProtocolKind = 'native' | 'openai' | 'anthropic'

export interface ProtocolRunState {
  protocol: ProtocolKind
  endpoint: string
  status: 'idle' | 'streaming' | 'completed' | 'error' | 'cancelled'
  startedAt: number | null
  completedAt: number | null
  ttftMs: number | null
  totalMs: number | null
  outputText: string
  outputTokens: number
  /** Whatever each protocol uses to signal end-of-turn (different field names per protocol) */
  finishReason: string | null
  error: string | null
  /** First non-empty chunk/event we received — useful to see streaming entry shape */
  firstChunkRaw: unknown
  /** Last chunk/event — usually carries totals, finish reason, usage */
  finalChunkRaw: unknown
  /** All chunks/events received, for raw inspection */
  rawChunks: unknown[]
  /** Distinct top-level field names seen across all chunks — for envelope diff */
  fieldNames: Set<string>
}

function emptyRun(protocol: ProtocolKind, endpoint: string): ProtocolRunState {
  return {
    protocol,
    endpoint,
    status: 'idle',
    startedAt: null,
    completedAt: null,
    ttftMs: null,
    totalMs: null,
    outputText: '',
    outputTokens: 0,
    finishReason: null,
    error: null,
    firstChunkRaw: null,
    finalChunkRaw: null,
    rawChunks: [],
    fieldNames: new Set<string>(),
  }
}

export const useProtocolObservatoryStore = defineStore('protocolObservatory', () => {
  const native = ref<ProtocolRunState>(emptyRun('native', '/api/chat'))
  const openai = ref<ProtocolRunState>(emptyRun('openai', '/v1/chat/completions'))
  const anthropic = ref<ProtocolRunState>(emptyRun('anthropic', '/v1/messages'))

  const model = ref('')
  const prompt = ref('')
  const maxTokens = ref(256)
  const isRunning = ref(false)
  let abortControllers: AbortController[] = []

  function reset() {
    native.value = emptyRun('native', '/api/chat')
    openai.value = emptyRun('openai', '/v1/chat/completions')
    anthropic.value = emptyRun('anthropic', '/v1/messages')
  }

  function recordChunk(state: ProtocolRunState, chunk: unknown) {
    state.rawChunks.push(chunk)
    if (!state.firstChunkRaw) state.firstChunkRaw = chunk
    state.finalChunkRaw = chunk
    if (chunk && typeof chunk === 'object') {
      for (const k of Object.keys(chunk)) state.fieldNames.add(k)
    }
  }

  async function runNative(modelName: string, userPrompt: string, signal: AbortSignal) {
    const state = native.value
    state.status = 'streaming'
    state.startedAt = Date.now()
    try {
      const stream = await ollamaClient.streamChat(
        {
          model: modelName,
          messages: [{ role: 'user', content: userPrompt }],
          options: { num_predict: maxTokens.value },
        },
        signal,
      )
      await readNDJSONStream<OllamaChatChunk>(
        stream,
        (chunk) => {
          recordChunk(state, chunk)
          const text = chunk.message?.content ?? ''
          if (text && state.ttftMs === null && state.startedAt) {
            state.ttftMs = Date.now() - state.startedAt
          }
          state.outputText += text
          if (chunk.eval_count) state.outputTokens = chunk.eval_count
          if (chunk.done) {
            state.completedAt = Date.now()
            state.totalMs = state.completedAt - (state.startedAt ?? state.completedAt)
            state.finishReason = chunk.done_reason ?? 'done'
            state.status = 'completed'
          }
        },
        signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        state.status = 'cancelled'
      } else {
        state.status = 'error'
        state.error = e instanceof Error ? e.message : String(e)
      }
    }
  }

  async function runOpenAI(modelName: string, userPrompt: string, signal: AbortSignal) {
    const state = openai.value
    state.status = 'streaming'
    state.startedAt = Date.now()
    try {
      const stream = await ollamaClient.streamChatOpenAI(
        {
          model: modelName,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: maxTokens.value,
        },
        signal,
      )
      await readSSEStream<OpenAIChatChunk>(
        stream,
        (chunk) => {
          recordChunk(state, chunk)
          const choice = chunk.choices?.[0]
          const text = choice?.delta?.content ?? ''
          if (text && state.ttftMs === null && state.startedAt) {
            state.ttftMs = Date.now() - state.startedAt
          }
          state.outputText += text
          if (chunk.usage?.completion_tokens) state.outputTokens = chunk.usage.completion_tokens
          if (choice?.finish_reason) {
            state.finishReason = choice.finish_reason
            state.completedAt = Date.now()
            state.totalMs = state.completedAt - (state.startedAt ?? state.completedAt)
            state.status = 'completed'
          }
        },
        signal,
      )
      if (!state.completedAt) {
        state.completedAt = Date.now()
        state.totalMs = state.completedAt - (state.startedAt ?? state.completedAt)
        state.status = 'completed'
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        state.status = 'cancelled'
      } else {
        state.status = 'error'
        state.error = e instanceof Error ? e.message : String(e)
      }
    }
  }

  async function runAnthropic(modelName: string, userPrompt: string, signal: AbortSignal) {
    const state = anthropic.value
    state.status = 'streaming'
    state.startedAt = Date.now()
    try {
      const stream = await anthropicClient.streamMessages(
        {
          model: modelName,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: maxTokens.value,
        },
        signal,
      )
      await readAnthropicSSE(
        stream,
        (event: AnthropicStreamEvent) => {
          recordChunk(state, event)
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            if (state.ttftMs === null && state.startedAt) {
              state.ttftMs = Date.now() - state.startedAt
            }
            state.outputText += event.delta.text
          } else if (event.type === 'message_delta') {
            if (event.usage?.output_tokens) state.outputTokens = event.usage.output_tokens
            if (event.delta?.stop_reason) state.finishReason = event.delta.stop_reason
          } else if (event.type === 'message_stop') {
            state.completedAt = Date.now()
            state.totalMs = state.completedAt - (state.startedAt ?? state.completedAt)
            state.status = 'completed'
          } else if (event.type === 'error') {
            state.status = 'error'
            state.error = `${event.error.type}: ${event.error.message}`
          }
        },
        signal,
      )
      if (!state.completedAt && !state.error) {
        state.completedAt = Date.now()
        state.totalMs = state.completedAt - (state.startedAt ?? state.completedAt)
        state.status = 'completed'
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        state.status = 'cancelled'
      } else {
        state.status = 'error'
        state.error = e instanceof Error ? e.message : String(e)
      }
    }
  }

  async function runAll() {
    if (!model.value || !prompt.value.trim()) return
    reset()
    isRunning.value = true
    abortControllers = [new AbortController(), new AbortController(), new AbortController()]

    try {
      await Promise.all([
        runNative(model.value, prompt.value, abortControllers[0]!.signal),
        runOpenAI(model.value, prompt.value, abortControllers[1]!.signal),
        runAnthropic(model.value, prompt.value, abortControllers[2]!.signal),
      ])
    } finally {
      isRunning.value = false
      abortControllers = []
    }
  }

  function cancel() {
    for (const ctrl of abortControllers) ctrl.abort()
    abortControllers = []
    isRunning.value = false
  }

  return {
    native,
    openai,
    anthropic,
    model,
    prompt,
    maxTokens,
    isRunning,
    runAll,
    cancel,
    reset,
  }
})
