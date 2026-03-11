import type { OllamaChatMessage } from '@/types/ollama'
import type { MemorySettings, EmbeddedMessage } from '@/types/memory'
import { ollamaClient } from './ollama-client'
import { messageMemoryDB } from './message-memory-db'
import { nanoid } from 'nanoid'

export interface ContextManagerInput {
  conversationId: string
  messages: OllamaChatMessage[]
  model: string
  settings: MemorySettings
  userFactsPrompt: string
  existingSummary?: string
}

export interface ContextManagerResult {
  messages: OllamaChatMessage[]
  newSummary?: string // if auto-summarization produced a new summary
}

/**
 * Orchestrates all four memory strategies to prepare the message array
 * before sending to Ollama.
 *
 * Order of operations:
 * 1. Inject user facts as system message (Tier 3)
 * 2. Apply sliding window to trim old messages (Tier 1)
 * 3. Auto-summarize if threshold exceeded (Tier 2)
 * 4. Inject RAG-based message memory (Tier 4)
 */
export async function prepareContext(input: ContextManagerInput): Promise<ContextManagerResult> {
  let messages = [...input.messages]
  let newSummary: string | undefined

  // ── Tier 3: User Facts ──────────────────────────────────────────
  if (input.settings.userFacts.enabled && input.userFactsPrompt) {
    messages.unshift({
      role: 'system',
      content: input.userFactsPrompt,
    })
  }

  // ── Tier 2: Auto-Summarization ──────────────────────────────────
  // Count non-system messages to determine if we should summarize
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')
  if (
    input.settings.autoSummarize.enabled &&
    nonSystemMessages.length > input.settings.autoSummarize.triggerThreshold
  ) {
    // Summarize older messages, keep the most recent ones
    const keepRecent = Math.floor(input.settings.autoSummarize.triggerThreshold / 3)
    const systemMessages = messages.filter((m) => m.role === 'system')
    const toSummarize = nonSystemMessages.slice(0, -keepRecent)
    const recentMessages = nonSystemMessages.slice(-keepRecent)

    // Use existing summary as base if available
    const summaryBase = input.existingSummary
      ? `Previous summary:\n${input.existingSummary}\n\nNew messages to incorporate:\n`
      : ''

    const summaryText = await generateSummary(
      input.model,
      summaryBase + toSummarize.map((m) => `${m.role}: ${m.content}`).join('\n'),
    )

    if (summaryText) {
      newSummary = summaryText
      messages = [
        ...systemMessages,
        {
          role: 'system',
          content: `Summary of earlier conversation:\n${summaryText}`,
        },
        ...recentMessages,
      ]
    }
  }

  // ── Tier 1: Sliding Window ──────────────────────────────────────
  if (input.settings.slidingWindow.enabled) {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystem = messages.filter((m) => m.role !== 'system')
    const maxMessages = input.settings.slidingWindow.maxMessages

    if (nonSystem.length > maxMessages) {
      const trimmed = nonSystem.slice(-maxMessages)
      messages = [...systemMessages, ...trimmed]
    }
  }

  // ── Tier 4: RAG-based Message Memory ────────────────────────────
  if (
    input.settings.ragMemory.enabled &&
    input.settings.ragMemory.embeddingModel
  ) {
    try {
      const ragContext = await retrieveRelevantMemory(
        input.conversationId,
        messages,
        input.settings.ragMemory.embeddingModel,
        input.settings.ragMemory.topK,
      )
      if (ragContext) {
        // Insert after other system messages but before conversation
        const systemMessages = messages.filter((m) => m.role === 'system')
        const nonSystem = messages.filter((m) => m.role !== 'system')
        messages = [
          ...systemMessages,
          { role: 'system', content: ragContext },
          ...nonSystem,
        ]
      }
    } catch {
      // RAG memory retrieval failed silently — continue without it
    }
  }

  return { messages, newSummary }
}

/**
 * After a conversation turn completes, embed the new messages for future
 * RAG-based retrieval.
 */
export async function embedNewMessages(
  conversationId: string,
  newMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>,
  embeddingModel: string,
): Promise<void> {
  if (!embeddingModel || newMessages.length === 0) return

  const texts = newMessages.map((m) => m.content)
  const response = await ollamaClient.embed({
    model: embeddingModel,
    input: texts,
  })

  const toStore: EmbeddedMessage[] = []
  for (let i = 0; i < newMessages.length; i++) {
    const embedding = response.embeddings[i]
    if (!embedding) continue
    const msg = newMessages[i]!
    toStore.push({
      id: nanoid(),
      conversationId,
      role: msg.role,
      content: msg.content,
      embedding,
      timestamp: msg.timestamp,
    })
  }

  await messageMemoryDB.storeMessages(toStore)
}

async function generateSummary(model: string, conversationText: string): Promise<string | null> {
  try {
    const response = await ollamaClient.chat({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Summarize the following conversation concisely, preserving key facts, decisions, and context that would be important for continuing the conversation. Keep it under 300 words.',
        },
        {
          role: 'user',
          content: conversationText,
        },
      ],
      stream: false,
    })
    return response.message.content.trim() || null
  } catch {
    return null
  }
}

async function retrieveRelevantMemory(
  currentConversationId: string,
  messages: OllamaChatMessage[],
  embeddingModel: string,
  topK: number,
): Promise<string | null> {
  // Use the last user message as the query
  const userMessages = messages.filter((m) => m.role === 'user')
  const lastUserMsg = userMessages[userMessages.length - 1]
  if (!lastUserMsg) return null

  // Embed the query
  const response = await ollamaClient.embed({
    model: embeddingModel,
    input: [lastUserMsg.content],
  })

  const queryEmbedding = response.embeddings[0]
  if (!queryEmbedding) return null

  // Search past messages (excluding current conversation)
  const results = await messageMemoryDB.search(queryEmbedding, topK, currentConversationId)

  // Filter by minimum relevance threshold
  const relevant = results.filter((r) => r.score > 0.5)
  if (relevant.length === 0) return null

  const lines = relevant.map(
    (r) => `[${r.message.role}, relevance: ${(r.score * 100).toFixed(0)}%] ${r.message.content}`,
  )

  return `Relevant messages from past conversations:\n${lines.join('\n\n')}\n\nUse this context if helpful, but prioritize the current conversation.`
}
