import { nanoid } from 'nanoid'
import type { OllamaGenerateChunk, OllamaChatChunk, OllamaToolCall } from '@/types/ollama'
import type { StreamToken } from '@/types/token'
import { useSessionStore } from '@/stores/session-store'
import { useTokenStore } from '@/stores/token-store'
import { useMetricsStore } from '@/stores/metrics-store'
import { useReasoningStore } from '@/stores/reasoning-store'
import { useToolCallStore } from '@/stores/toolcall-store'
import { useAgentStore } from '@/stores/agent-store'
import { calculateMetrics } from './metrics-calculator'
import { ReasoningParser } from './reasoning-parser'

export interface ChatStreamResult {
  toolCalls: OllamaToolCall[]
}

export async function readSSEStream<T>(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as T
          onChunk(parsed)
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function readNDJSONStream<T>(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed) as T
          onChunk(parsed)
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as T
        onChunk(parsed)
      } catch {
        // Ignore
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function executeGenerateStream(
  sessionId: string,
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<void> {
  const sessionStore = useSessionStore()
  const tokenStore = useTokenStore()
  const metricsStore = useMetricsStore()
  const reasoningStore = useReasoningStore()
  const agentStore = useAgentStore()

  const startedAt = Date.now()
  let tokenIndex = 0
  let lastTokenTime = startedAt
  let cumulativeText = ''
  const tokenLatencies: number[] = []

  const reasoningParser = new ReasoningParser(sessionId)

  // Add start node to agent graph
  agentStore.initGraph(sessionId)
  agentStore.addNode(sessionId, {
    id: nanoid(),
    type: 'start',
    label: 'Generation Start',
    sessionId,
    stepIndex: 0,
    state: {},
    timestamp: startedAt,
  })

  sessionStore.updateSessionStatus(sessionId, 'streaming')

  await readNDJSONStream<OllamaGenerateChunk>(
    stream,
    (chunk) => {
      const now = Date.now()
      const interTokenLatency = now - lastTokenTime
      cumulativeText += chunk.response

      // Compute confidence from inter-token latency
      const confidence = computeConfidenceFromLatency(interTokenLatency, tokenLatencies)

      const token: StreamToken = {
        id: nanoid(),
        index: tokenIndex++,
        text: chunk.response,
        timestamp: now,
        confidence,
        cumulativeText,
        interTokenLatencyMs: interTokenLatency,
      }

      tokenStore.pushToken(sessionId, token)
      sessionStore.appendOutput(sessionId, chunk.response)
      tokenLatencies.push(interTokenLatency)
      lastTokenTime = now

      // Parse reasoning steps and propagate thinking state
      const step = reasoningParser.processToken(token, cumulativeText)
      reasoningStore.setThinking(sessionId, reasoningParser.isThinking, reasoningParser.thinkingContent)
      if (step) {
        reasoningStore.addStep(sessionId, step)
        agentStore.addNode(sessionId, {
          id: nanoid(),
          type: 'decision',
          label: `${step.type}: ${step.content.slice(0, 40)}...`,
          sessionId,
          stepIndex: step.index,
          state: { reasoning: step.type },
          timestamp: step.timestamp,
        })
      }

      // On final chunk, compute metrics
      if (chunk.done) {
        reasoningParser.finalize()
        reasoningStore.setThinking(sessionId, false, '')

        if (chunk.done_reason) {
          sessionStore.setDoneReason(sessionId, chunk.done_reason)
        }

        const session = sessionStore.sessionById(sessionId)
        if (session) {
          const metrics = calculateMetrics(
            sessionId,
            session.model,
            startedAt,
            chunk,
            tokenLatencies,
          )
          metricsStore.recordMetrics(sessionId, metrics)
          sessionStore.finalizeSession(sessionId, metrics)
          metricsStore.recalculateAggregate()
        }

        agentStore.addNode(sessionId, {
          id: nanoid(),
          type: 'output',
          label: 'Generation Complete',
          sessionId,
          stepIndex: tokenIndex,
          state: { tokenCount: tokenIndex },
          timestamp: Date.now(),
        })
      }
    },
    signal,
  )
}

export async function executeChatStream(
  sessionId: string,
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<ChatStreamResult> {
  const sessionStore = useSessionStore()
  const tokenStore = useTokenStore()
  const metricsStore = useMetricsStore()
  const reasoningStore = useReasoningStore()
  const toolCallStore = useToolCallStore()
  const agentStore = useAgentStore()

  const startedAt = Date.now()
  let tokenIndex = 0
  let lastTokenTime = startedAt
  let cumulativeText = ''
  let thinkingText = ''
  let completedThinkingText = ''
  let usesThinkingField = false
  const tokenLatencies: number[] = []
  const collectedToolCalls: OllamaToolCall[] = []

  const reasoningParser = new ReasoningParser(sessionId)

  agentStore.initGraph(sessionId)
  agentStore.addNode(sessionId, {
    id: nanoid(),
    type: 'start',
    label: 'Chat Start',
    sessionId,
    stepIndex: 0,
    state: {},
    timestamp: startedAt,
  })

  sessionStore.updateSessionStatus(sessionId, 'streaming')

  await readNDJSONStream<OllamaChatChunk>(
    stream,
    (chunk) => {
      const now = Date.now()
      const interTokenLatency = now - lastTokenTime

      // Ollama's native thinking field (DeepSeek R1, QwQ, etc.)
      const thinkingToken = chunk.message.thinking
      if (thinkingToken) {
        usesThinkingField = true
        thinkingText += thinkingToken
        reasoningStore.setThinking(sessionId, true, thinkingText)
        tokenLatencies.push(interTokenLatency)
        lastTokenTime = now
        return // Don't create a visible token for thinking content
      }

      // If we were in thinking mode and now got content, finalize thinking
      if (usesThinkingField && thinkingText && !chunk.done) {
        reasoningStore.setThinking(sessionId, false, thinkingText)
        if (thinkingText.trim()) {
          reasoningStore.addStep(sessionId, {
            id: nanoid(),
            index: 0,
            type: 'thought',
            content: thinkingText.trim(),
            startTokenIndex: 0,
            endTokenIndex: tokenIndex,
            timestamp: now,
            durationMs: now - startedAt,
          })
        }
        completedThinkingText = thinkingText
        thinkingText = '' // Only finalize once
      }

      const tokenText = chunk.message.content
      cumulativeText += tokenText

      let confidence: number
      let logprobValue: number | undefined
      if (chunk.logprobs && chunk.logprobs.length > 0) {
        logprobValue = chunk.logprobs[0]!.logprob
        confidence = Math.exp(logprobValue)
      } else {
        confidence = computeConfidenceFromLatency(interTokenLatency, tokenLatencies)
      }

      const token: StreamToken = {
        id: nanoid(),
        index: tokenIndex++,
        text: tokenText,
        timestamp: now,
        confidence,
        logprob: logprobValue,
        cumulativeText,
        interTokenLatencyMs: interTokenLatency,
      }

      tokenStore.pushToken(sessionId, token)
      sessionStore.appendOutput(sessionId, tokenText)
      tokenLatencies.push(interTokenLatency)
      lastTokenTime = now

      // Parse reasoning via <think> tags (legacy format fallback)
      if (!usesThinkingField) {
        const step = reasoningParser.processToken(token, cumulativeText)
        reasoningStore.setThinking(sessionId, reasoningParser.isThinking, reasoningParser.thinkingContent)
        if (step) {
          reasoningStore.addStep(sessionId, step)
        }
      }

      // Detect tool calls
      if (chunk.message.tool_calls) {
        for (const tc of chunk.message.tool_calls) {
          collectedToolCalls.push(tc)
          const entry = {
            id: nanoid(),
            sessionId,
            index: toolCallStore.getToolCalls(sessionId).length,
            functionName: tc.function.name,
            arguments: tc.function.arguments,
            status: 'pending' as const,
            startedAt: now,
            tokenIndexStart: tokenIndex,
          }
          toolCallStore.addToolCall(sessionId, entry)

          agentStore.addNode(sessionId, {
            id: nanoid(),
            type: 'tool_call',
            label: `Tool: ${tc.function.name}`,
            sessionId,
            stepIndex: tokenIndex,
            state: { tool: tc.function.name, args: tc.function.arguments },
            timestamp: now,
          })
        }
      }

      if (chunk.done) {
        // Finalize any remaining thinking content from native thinking field
        // (handles case where thinking tokens run until done with no content)
        if (usesThinkingField && thinkingText.trim()) {
          completedThinkingText = thinkingText
          reasoningStore.addStep(sessionId, {
            id: nanoid(),
            index: 0,
            type: 'thought',
            content: thinkingText.trim(),
            startTokenIndex: 0,
            endTokenIndex: tokenIndex,
            timestamp: Date.now(),
            durationMs: Date.now() - startedAt,
          })
        }
        reasoningParser.finalize()
        // Preserve thinking content on completion so the UI shows "Thought process"
        reasoningStore.setThinking(sessionId, false, usesThinkingField ? completedThinkingText : '')

        if (chunk.done_reason) {
          sessionStore.setDoneReason(sessionId, chunk.done_reason)
        }

        // Only finalize metrics if no tool calls pending (the tool loop handles finalization)
        if (collectedToolCalls.length === 0) {
          const session = sessionStore.sessionById(sessionId)
          if (session) {
            const metrics = calculateMetrics(
              sessionId,
              session.model,
              startedAt,
              chunk,
              tokenLatencies,
            )
            metricsStore.recordMetrics(sessionId, metrics)
            sessionStore.finalizeSession(sessionId, metrics)
            metricsStore.recalculateAggregate()
          }

          agentStore.addNode(sessionId, {
            id: nanoid(),
            type: 'output',
            label: 'Chat Complete',
            sessionId,
            stepIndex: tokenIndex,
            state: { tokenCount: tokenIndex },
            timestamp: Date.now(),
          })
        }
      }
    },
    signal,
  )

  return { toolCalls: collectedToolCalls }
}

export function computeConfidenceFromLatency(
  currentLatency: number,
  previousLatencies: number[],
): number {
  if (previousLatencies.length < 2) return 0.5

  const sorted = [...previousLatencies].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!

  if (median <= 0) return 0.5

  const ratio = currentLatency / median

  // ratio < 0.5 → high confidence (~0.9)
  // ratio ≈ 1.0 → medium confidence (~0.5)
  // ratio > 2.0 → low confidence (~0.1)
  const confidence = Math.max(0, Math.min(1, 1 - (ratio - 0.5) / 2))
  return Math.round(confidence * 100) / 100
}
