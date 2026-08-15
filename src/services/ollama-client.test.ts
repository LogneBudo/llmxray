import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ollamaClient } from './ollama-client'

function okStream(): Response {
  return {
    ok: true,
    statusText: 'OK',
    body: new ReadableStream({
      start(c) {
        c.close()
      },
    }),
  } as unknown as Response
}

function bodyOf(call: unknown[]): Record<string, unknown> {
  const init = call[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

describe('ollama-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opts into usage totals on the OpenAI-compatible stream', async () => {
    // Ollama 0.32.6+ withholds the usage chunk unless this is sent, which
    // silently zeroes benchmark token counts and tokens/sec.
    vi.mocked(fetch).mockResolvedValue(okStream())

    await ollamaClient.streamChatOpenAI({
      model: 'test',
      messages: [{ role: 'user', content: 'hi' }],
    })

    const body = bodyOf(vi.mocked(fetch).mock.calls[0]!)
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
  })

  it('sends the documented `model` field to /api/show, keeping the legacy alias', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ capabilities: ['completion'] }),
    } as unknown as Response)

    await ollamaClient.showModel('qwen2.5:7b')

    const body = bodyOf(vi.mocked(fetch).mock.calls[0]!)
    expect(body.model).toBe('qwen2.5:7b')
    expect(body.name).toBe('qwen2.5:7b')
  })

  it('omits `dimensions` from the embed request when not requested', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ model: 'm', embeddings: [[0.1]] }),
    } as unknown as Response)

    await ollamaClient.embed({ model: 'nomic-embed-text', input: 'hi' })

    expect(bodyOf(vi.mocked(fetch).mock.calls[0]!)).not.toHaveProperty('dimensions')
  })

  it('forwards `dimensions` for Matryoshka truncation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ model: 'm', embeddings: [[0.1]] }),
    } as unknown as Response)

    await ollamaClient.embed({ model: 'nomic-embed-text', input: 'hi', dimensions: 256 })

    expect(bodyOf(vi.mocked(fetch).mock.calls[0]!).dimensions).toBe(256)
  })
})
