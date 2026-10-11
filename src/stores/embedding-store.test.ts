import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useEmbeddingStore } from './embedding-store'
import { ollamaClient } from '@/services/ollama-client'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { embed: vi.fn() },
}))

const VEC = Array.from({ length: 768 }, (_, i) => Math.sin(i))

describe('embedding-store — text and image input (Ollama 0.40 /api/embed object form)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.embed).mockReset()
  })

  it('keeps the plain string wire shape for text, and records the prompt tokens', async () => {
    // Shape measured live on embeddinggemma-2: 7 prompt tokens for a short sentence
    vi.mocked(ollamaClient.embed).mockResolvedValue({ model: 'embeddinggemma-2', embeddings: [VEC], prompt_eval_count: 7 })
    const store = useEmbeddingStore()

    const r = await store.embed('embeddinggemma-2', 'a cat on a windowsill')

    expect(vi.mocked(ollamaClient.embed).mock.calls[0]![0]).toEqual({ model: 'embeddinggemma-2', input: 'a cat on a windowsill', dimensions: undefined })
    expect(r.input).toBe('a cat on a windowsill')
    expect(r.image).toBeUndefined()
    expect(r.promptTokens).toBe(7)
    expect(r.dimensions).toBe(768)
  })

  it('sends text and image as one object, and keeps the image on the result', async () => {
    // Live: the same sentence plus a 1x1 PNG cost 265 prompt tokens
    vi.mocked(ollamaClient.embed).mockResolvedValue({ model: 'embeddinggemma-2', embeddings: [VEC], prompt_eval_count: 265 })
    const store = useEmbeddingStore()

    const r = await store.embed('embeddinggemma-2', { text: 'a cat on a windowsill', image: 'iVBORw0KGgo=' })

    expect(vi.mocked(ollamaClient.embed).mock.calls[0]![0].input).toEqual({ text: 'a cat on a windowsill', image: 'iVBORw0KGgo=' })
    expect(r.image).toBe('iVBORw0KGgo=')
    expect(r.promptTokens).toBe(265)
  })

  it('embeds an image alone without inventing empty text', async () => {
    vi.mocked(ollamaClient.embed).mockResolvedValue({ model: 'embeddinggemma-2', embeddings: [VEC], prompt_eval_count: 258 })
    const store = useEmbeddingStore()

    const r = await store.embed('embeddinggemma-2', { image: 'iVBORw0KGgo=' })

    expect(vi.mocked(ollamaClient.embed).mock.calls[0]![0].input).toEqual({ image: 'iVBORw0KGgo=' })
    expect(r.input).toBe('')
  })

  it('leaves promptTokens undefined when the daemon omits the count', async () => {
    vi.mocked(ollamaClient.embed).mockResolvedValue({ model: 'nomic-embed-text', embeddings: [VEC] })
    const store = useEmbeddingStore()
    const r = await store.embed('nomic-embed-text', 'hello')
    expect(r.promptTokens).toBeUndefined()
  })

  it('refuses an empty input before calling the daemon, and is not left loading', async () => {
    const store = useEmbeddingStore()
    await expect(store.embed('m', { text: '   ' })).rejects.toThrow('Nothing to embed')
    expect(ollamaClient.embed).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
  })

  it('surfaces the daemon error for media on a text-only model', async () => {
    vi.mocked(ollamaClient.embed).mockRejectedValue(new Error('model does not support media embeddings'))
    const store = useEmbeddingStore()
    await expect(store.embed('nomic-embed-text', { image: 'x' })).rejects.toThrow()
    expect(store.error).toContain('does not support media embeddings')
    expect(store.loading).toBe(false)
  })
})
