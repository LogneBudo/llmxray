import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useProtocolObservatoryStore } from './protocol-observatory-store'
import { ollamaClient } from '@/services/ollama-client'
import { anthropicClient } from '@/services/anthropic-client'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { streamChat: vi.fn(), streamChatOpenAI: vi.fn() },
}))
vi.mock('@/services/anthropic-client', async (importActual) => {
  const actual = await importActual<typeof import('@/services/anthropic-client')>()
  return { ...actual, anthropicClient: { streamMessages: vi.fn() } }
})

function bytesOf(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l))
      controller.close()
    },
  })
}

/** Native NDJSON, final chunk shaped exactly as Ollama 0.40.3 emits it on a warm cache. */
function nativeStream() {
  return bytesOf([
    JSON.stringify({ model: 'm', created_at: '', message: { role: 'assistant', content: 'Hi' }, done: false }) + '\n',
    JSON.stringify({
      model: 'm', created_at: '', message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop',
      prompt_eval_count: 31, prompt_eval_cached_count: 30, prompt_eval_duration: 9_303_000,
      eval_count: 11, eval_duration: 84_962_000,
    }) + '\n',
  ])
}

/**
 * OpenAI-compat SSE as measured live on Ollama 0.40.3 (qwen2.5:7b, second
 * send of an identical prompt): the usage chunk has EMPTY choices and carries a
 * `timings` block whose prompt_per_second is the inflated figure.
 */
function openaiStream() {
  const base = { id: 'chatcmpl-269', object: 'chat.completion.chunk', created: 0, model: 'm', system_fingerprint: 'fp_ollama' }
  return bytesOf([
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`,
    `data: ${JSON.stringify({
      ...base,
      choices: [],
      usage: { prompt_tokens: 31, prompt_tokens_details: { cached_tokens: 30 }, completion_tokens: 11, total_tokens: 42 },
      timings: {
        prompt_n: 31, prompt_ms: 8, prompt_per_token_ms: 0.258, prompt_per_second: 3875,
        predicted_n: 11, predicted_ms: 83, predicted_per_token_ms: 7.545, predicted_per_second: 132.53,
      },
    })}\n\n`,
    'data: [DONE]\n\n',
  ])
}

describe('protocol-observatory store — prefill figures per protocol (Ollama 0.35.1+ timings)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.streamChat).mockReset().mockResolvedValue(nativeStream())
    vi.mocked(ollamaClient.streamChatOpenAI).mockReset().mockResolvedValue(openaiStream())
    vi.mocked(anthropicClient.streamMessages).mockReset().mockRejectedValue(new Error('not under test'))
  })

  it('keeps the daemon-stated OpenAI rate verbatim, and the prefill time from both protocols', async () => {
    const store = useProtocolObservatoryStore()
    store.model = 'm'
    store.prompt = 'Say hi'
    await store.runAll()

    // Native: nanoseconds become ms; it never states a rate of its own
    expect(store.native.prefillMs).toBeCloseTo(9.303, 3)
    expect(store.native.serverStatedPrefillRate).toBeNull()
    expect(store.native.cachedPromptTokens).toBe(30)

    // OpenAI-compat: the stated figure is the inflated 3875, kept as the daemon said it
    expect(store.openai.prefillMs).toBe(8)
    expect(store.openai.serverStatedPrefillRate).toBe(3875)
    expect(store.openai.promptTokens).toBe(31)
    expect(store.openai.cachedPromptTokens).toBe(30)

    // The honest figure the page derives from the same chunk: 1 evaluated token in 8 ms
    const evaluated = store.openai.promptTokens - (store.openai.cachedPromptTokens ?? 0)
    expect(Math.round((evaluated / store.openai.prefillMs!) * 1000)).toBe(125)
    expect(store.openai.serverStatedPrefillRate).toBeGreaterThan(125 * 10)
  })

  it('leaves the prefill fields null when a protocol never reports them', async () => {
    const store = useProtocolObservatoryStore()
    store.model = 'm'
    store.prompt = 'Say hi'
    await store.runAll()

    expect(store.anthropic.prefillMs).toBeNull()
    expect(store.anthropic.serverStatedPrefillRate).toBeNull()
    expect(store.anthropic.status).toBe('error')
  })
})
