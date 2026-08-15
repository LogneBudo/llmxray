import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { OllamaModel } from '@/types/ollama'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: {
    listModels: vi.fn(),
    showModel: vi.fn(),
    deleteModel: vi.fn(),
  },
}))

import { useModelStore } from './model-store'
import { ollamaClient } from '@/services/ollama-client'

function model(name: string, over: Partial<OllamaModel> = {}): OllamaModel {
  return {
    name,
    model: name,
    modified_at: '2026-08-15T00:00:00Z',
    size: 1,
    digest: 'd',
    details: {
      parent_model: '',
      format: 'gguf',
      family: 'test',
      families: ['test'],
      parameter_size: '7B',
      quantization_level: 'Q4_K_M',
    },
    ...over,
  }
}

describe('model-store — capabilities from /api/tags (Ollama 0.32)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.listModels).mockReset()
    // /api/show never resolves here, so anything the store knows must have
    // come from the tag listing alone.
    vi.mocked(ollamaClient.showModel).mockImplementation(() => new Promise(() => {}))
  })

  it('resolves capabilities without waiting for the per-model /api/show call', async () => {
    vi.mocked(ollamaClient.listModels).mockResolvedValue([
      model('seer:9b', {
        capabilities: ['completion', 'vision', 'tools', 'thinking'],
        details: { ...model('x').details, context_length: 262144, embedding_length: 4096 },
      }),
    ])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.getCapabilities('seer:9b')).toContain('vision')
    expect(store.isThinkingModel('seer:9b')).toBe(true)
    expect(store.isVisionModel('seer:9b')).toBe(true)
    expect(store.supportsTools('seer:9b')).toBe(true)
    expect(store.getContextLength('seer:9b')).toBe(262144)
    expect(store.getEmbeddingLength('seer:9b')).toBe(4096)
  })

  it('treats a reported capability set that omits thinking as authoritative', async () => {
    // The name matches THINKING_NAME_PATTERNS, but the daemon says otherwise.
    vi.mocked(ollamaClient.listModels).mockResolvedValue([
      model('deepseek-r1-distill:8b', { capabilities: ['completion', 'tools'] }),
    ])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.isThinkingModel('deepseek-r1-distill:8b')).toBe(false)
  })

  it('falls back to name patterns when the daemon reports no capabilities', async () => {
    vi.mocked(ollamaClient.listModels).mockResolvedValue([model('deepseek-r1:8b')])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.getCapabilities('deepseek-r1:8b')).toEqual([])
    expect(store.isThinkingModel('deepseek-r1:8b')).toBe(true)
  })

  it('splits chat and embedding models on the reported embedding capability', async () => {
    vi.mocked(ollamaClient.listModels).mockResolvedValue([
      model('nomic-embed-text:latest', { capabilities: ['embedding'] }),
      model('qwen2.5:7b', { capabilities: ['completion', 'tools'] }),
      // Embedding-capable but also a chat model — must NOT be filtered out of chat.
      model('hybrid:7b', { capabilities: ['completion', 'embedding'] }),
    ])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.embeddingModelNames).toEqual(['nomic-embed-text:latest'])
    expect(store.chatModelNames).toEqual(['qwen2.5:7b', 'hybrid:7b'])
  })

  it('classifies embedding models by name when capabilities are absent', async () => {
    vi.mocked(ollamaClient.listModels).mockResolvedValue([
      model('mxbai-embed-large:latest'),
      model('llama3.1:8b'),
    ])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.embeddingModelNames).toEqual(['mxbai-embed-large:latest'])
    expect(store.chatModelNames).toEqual(['llama3.1:8b'])
  })

  it('does not misclassify a custom-named model the daemon reports as chat-capable', async () => {
    // "yugo60" carries no embedding hint in its name; the daemon settles it.
    vi.mocked(ollamaClient.listModels).mockResolvedValue([
      model('yugo60:latest', { capabilities: ['completion'] }),
    ])

    const store = useModelStore()
    await store.fetchModels()

    expect(store.chatModelNames).toEqual(['yugo60:latest'])
    expect(store.embeddingModelNames).toEqual([])
  })
})
