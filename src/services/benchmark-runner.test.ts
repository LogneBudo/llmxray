import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BenchmarkSuite } from '@/types/benchmark'

vi.mock('./ollama-client', () => ({
  ollamaClient: {
    streamChatOpenAI: vi.fn(),
  },
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id',
}))

import { runBenchmark } from './benchmark-runner'
import type { BenchmarkCallbacks } from './benchmark-runner'
import { ollamaClient } from './ollama-client'

/**
 * Build a ReadableStream of SSE bytes shaped exactly like Ollama 0.32.6+
 * emits from /v1/chat/completions: `role` only on the first chunk, a
 * `finish_reason` chunk with an empty delta, and — when the caller sends
 * `stream_options.include_usage` — a trailing usage chunk whose `choices`
 * array is EMPTY.
 */
function makeOllamaStream(tokens: string[], usageTokens: number | null): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const lines: string[] = []

  tokens.forEach((tok, i) => {
    lines.push(
      JSON.stringify({
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        created: 0,
        model: 'test-model',
        choices: [
          {
            index: 0,
            delta: i === 0 ? { role: 'assistant', content: tok } : { content: tok },
            finish_reason: null,
            logprobs: { content: [{ token: tok, logprob: -0.1, bytes: [] }] },
          },
        ],
      }),
    )
  })

  // finish_reason arrives on its own chunk with an empty delta
  lines.push(
    JSON.stringify({
      id: 'chatcmpl-1',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'test-model',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop', logprobs: null }],
    }),
  )

  if (usageTokens !== null) {
    lines.push(
      JSON.stringify({
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        created: 0,
        model: 'test-model',
        choices: [], // <- the trap: no choices[0] on the usage chunk
        usage: { prompt_tokens: 30, completion_tokens: usageTokens, total_tokens: 30 + usageTokens },
      }),
    )
  }

  const payload = lines.map((l) => `data: ${l}\n\n`).join('') + 'data: [DONE]\n\n'

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(payload))
      controller.close()
    },
  })
}

const SUITE: BenchmarkSuite = {
  id: 'test-suite',
  name: 'Test Suite',
  description: 'single question',
  builtIn: false,
  questions: [
    {
      id: 'q1',
      category: 'logic',
      question: 'Pick B.',
      choices: ['A) no', 'B) yes', 'C) no', 'D) no'],
      correctAnswer: 'B',
    },
  ],
}

function noopCallbacks(): BenchmarkCallbacks {
  return {
    onQuestionStart: vi.fn(),
    onToken: vi.fn(),
    onQuestionComplete: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  }
}

describe('benchmark-runner — Ollama 0.32 OpenAI-compat wire format', () => {
  beforeEach(() => {
    vi.mocked(ollamaClient.streamChatOpenAI).mockReset()
  })

  it('reads usage from the trailing chunk even though it has no choices[0]', async () => {
    vi.mocked(ollamaClient.streamChatOpenAI).mockResolvedValue(makeOllamaStream(['B'], 7))

    const result = await runBenchmark('test-model', [SUITE], 4096, false, new AbortController().signal, noopCallbacks())

    const q = result.questionResults[0]!
    expect(q.tokenCount).toBe(7)
    expect(q.tokensPerSecond).toBeGreaterThan(0)
  })

  it('still parses the answer and confidence when usage is absent', async () => {
    vi.mocked(ollamaClient.streamChatOpenAI).mockResolvedValue(makeOllamaStream(['B'], null))

    const result = await runBenchmark('test-model', [SUITE], 4096, false, new AbortController().signal, noopCallbacks())

    const q = result.questionResults[0]!
    expect(q.modelAnswer).toBe('B')
    expect(q.correct).toBe(true)
    expect(q.tokenCount).toBe(0)
    expect(q.avgTokenConfidence).toBeGreaterThan(0)
  })

  it('grades the answer from content across the streamed deltas', async () => {
    vi.mocked(ollamaClient.streamChatOpenAI).mockResolvedValue(makeOllamaStream(['The', ' answer', ' is', ' B'], 4))

    const result = await runBenchmark('test-model', [SUITE], 4096, false, new AbortController().signal, noopCallbacks())

    const q = result.questionResults[0]!
    expect(q.fullResponse).toBe('The answer is B')
    expect(q.modelAnswer).toBe('B')
    expect(q.tokenCount).toBe(4)
  })
})
