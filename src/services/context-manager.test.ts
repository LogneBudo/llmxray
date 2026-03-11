import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MemorySettings } from '@/types/memory'
import { DEFAULT_MEMORY_SETTINGS } from '@/types/memory'

// Mock dependencies before importing the module
vi.mock('./ollama-client', () => ({
  ollamaClient: {
    chat: vi.fn(),
    embed: vi.fn(),
  },
}))

vi.mock('./message-memory-db', () => ({
  messageMemoryDB: {
    search: vi.fn(),
    storeMessages: vi.fn(),
  },
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id',
}))

import { prepareContext, embedNewMessages } from './context-manager'
import type { ContextManagerInput } from './context-manager'
import { ollamaClient } from './ollama-client'
import { messageMemoryDB } from './message-memory-db'

function makeInput(overrides: Partial<ContextManagerInput> = {}): ContextManagerInput {
  return {
    conversationId: 'conv-1',
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ],
    model: 'llama3:latest',
    settings: { ...DEFAULT_MEMORY_SETTINGS },
    userFactsPrompt: '',
    ...overrides,
  }
}

describe('context-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('prepareContext', () => {
    describe('Tier 3: User Facts', () => {
      it('injects user facts as system message when enabled', async () => {
        const input = makeInput({
          settings: { ...DEFAULT_MEMORY_SETTINGS, userFacts: { enabled: true } },
          userFactsPrompt: 'User prefers TypeScript',
        })

        const result = await prepareContext(input)

        expect(result.messages[0]).toEqual({
          role: 'system',
          content: 'User prefers TypeScript',
        })
      })

      it('does not inject facts when disabled', async () => {
        const input = makeInput({
          settings: { ...DEFAULT_MEMORY_SETTINGS, userFacts: { enabled: false } },
          userFactsPrompt: 'Should not appear',
        })

        const result = await prepareContext(input)

        expect(result.messages.some((m) => m.content === 'Should not appear')).toBe(false)
      })

      it('does not inject facts when prompt is empty', async () => {
        const input = makeInput({
          settings: { ...DEFAULT_MEMORY_SETTINGS, userFacts: { enabled: true } },
          userFactsPrompt: '',
        })

        const result = await prepareContext(input)
        // Should only have the original 2 messages
        expect(result.messages).toHaveLength(2)
      })
    })

    describe('Tier 1: Sliding Window', () => {
      it('trims messages when exceeding maxMessages', async () => {
        const messages = Array.from({ length: 20 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}`,
        }))

        const input = makeInput({
          messages,
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            slidingWindow: { enabled: true, maxMessages: 5 },
          },
        })

        const result = await prepareContext(input)
        const nonSystem = result.messages.filter((m) => m.role !== 'system')
        expect(nonSystem).toHaveLength(5)
        // Should keep the LAST 5 messages
        expect(nonSystem[0]!.content).toBe('Message 15')
      })

      it('does not trim when under maxMessages', async () => {
        const input = makeInput({
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            slidingWindow: { enabled: true, maxMessages: 50 },
          },
        })

        const result = await prepareContext(input)
        expect(result.messages).toHaveLength(2)
      })

      it('preserves system messages during trimming', async () => {
        const messages = [
          { role: 'system' as const, content: 'System prompt' },
          ...Array.from({ length: 10 }, (_, i) => ({
            role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
            content: `Message ${i}`,
          })),
        ]

        const input = makeInput({
          messages,
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            slidingWindow: { enabled: true, maxMessages: 3 },
          },
        })

        const result = await prepareContext(input)
        const systemMessages = result.messages.filter((m) => m.role === 'system')
        expect(systemMessages).toHaveLength(1)
        expect(systemMessages[0]!.content).toBe('System prompt')
      })

      it('does nothing when disabled', async () => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}`,
        }))

        const input = makeInput({
          messages,
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            slidingWindow: { enabled: false, maxMessages: 5 },
          },
        })

        const result = await prepareContext(input)
        expect(result.messages).toHaveLength(100)
      })
    })

    describe('Tier 2: Auto-Summarization', () => {
      it('summarizes when messages exceed threshold', async () => {
        vi.mocked(ollamaClient.chat).mockResolvedValue({
          message: { role: 'assistant', content: 'Summary of conversation' },
        } as never)

        const messages = Array.from({ length: 40 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}`,
        }))

        const input = makeInput({
          messages,
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            autoSummarize: { enabled: true, triggerThreshold: 30 },
            slidingWindow: { enabled: false, maxMessages: 50 },
          },
        })

        const result = await prepareContext(input)

        expect(result.newSummary).toBe('Summary of conversation')
        expect(ollamaClient.chat).toHaveBeenCalled()
        // Should have system summary + recent messages
        const summaryMsg = result.messages.find((m) =>
          m.content.includes('Summary of earlier conversation'),
        )
        expect(summaryMsg).toBeDefined()
      })

      it('does not summarize when under threshold', async () => {
        const input = makeInput({
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            autoSummarize: { enabled: true, triggerThreshold: 30 },
          },
        })

        const result = await prepareContext(input)

        expect(result.newSummary).toBeUndefined()
        expect(ollamaClient.chat).not.toHaveBeenCalled()
      })
    })

    describe('Tier 4: RAG Memory', () => {
      it('retrieves relevant past messages when enabled', async () => {
        vi.mocked(ollamaClient.embed).mockResolvedValue({
          embeddings: [[0.1, 0.2, 0.3]],
        } as never)

        vi.mocked(messageMemoryDB.search).mockResolvedValue([
          {
            message: {
              id: 'past-1',
              conversationId: 'old-conv',
              role: 'user',
              content: 'Related past message',
              embedding: [0.1, 0.2, 0.3],
              timestamp: Date.now(),
            },
            score: 0.85,
          },
        ])

        const input = makeInput({
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            ragMemory: { enabled: true, embeddingModel: 'nomic-embed-text', topK: 3 },
            slidingWindow: { enabled: false, maxMessages: 50 },
          },
        })

        const result = await prepareContext(input)

        const ragMsg = result.messages.find((m) =>
          m.content.includes('Relevant messages from past conversations'),
        )
        expect(ragMsg).toBeDefined()
      })

      it('does nothing when embedding model is empty', async () => {
        const input = makeInput({
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            ragMemory: { enabled: true, embeddingModel: '', topK: 3 },
          },
        })

        const result = await prepareContext(input)
        expect(ollamaClient.embed).not.toHaveBeenCalled()
        expect(result.messages).toHaveLength(2)
      })

      it('continues silently on RAG error', async () => {
        vi.mocked(ollamaClient.embed).mockRejectedValue(new Error('Model not found'))

        const input = makeInput({
          settings: {
            ...DEFAULT_MEMORY_SETTINGS,
            ragMemory: { enabled: true, embeddingModel: 'missing-model', topK: 3 },
          },
        })

        const result = await prepareContext(input)
        // Should not throw, returns original messages
        expect(result.messages).toHaveLength(2)
      })
    })

    it('returns unchanged messages when all features disabled', async () => {
      const settings: MemorySettings = {
        slidingWindow: { enabled: false, maxMessages: 50 },
        autoSummarize: { enabled: false, triggerThreshold: 30 },
        ragMemory: { enabled: false, embeddingModel: '', topK: 3 },
        userFacts: { enabled: false },
      }

      const input = makeInput({ settings })
      const result = await prepareContext(input)

      expect(result.messages).toEqual(input.messages)
      expect(result.newSummary).toBeUndefined()
    })
  })

  describe('embedNewMessages', () => {
    it('embeds messages and stores them', async () => {
      vi.mocked(ollamaClient.embed).mockResolvedValue({
        embeddings: [[0.1, 0.2], [0.3, 0.4]],
      } as never)

      await embedNewMessages('conv-1', [
        { role: 'user', content: 'Hello', timestamp: 1000 },
        { role: 'assistant', content: 'Hi', timestamp: 2000 },
      ], 'nomic-embed-text')

      expect(ollamaClient.embed).toHaveBeenCalledWith({
        model: 'nomic-embed-text',
        input: ['Hello', 'Hi'],
      })
      expect(messageMemoryDB.storeMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: 'Hello', role: 'user' }),
          expect.objectContaining({ content: 'Hi', role: 'assistant' }),
        ]),
      )
    })

    it('does nothing when no embedding model', async () => {
      await embedNewMessages('conv-1', [
        { role: 'user', content: 'Hello', timestamp: 1000 },
      ], '')

      expect(ollamaClient.embed).not.toHaveBeenCalled()
    })

    it('does nothing when no messages', async () => {
      await embedNewMessages('conv-1', [], 'nomic-embed-text')

      expect(ollamaClient.embed).not.toHaveBeenCalled()
    })
  })
})
