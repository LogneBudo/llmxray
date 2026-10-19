import { setActivePinia, createPinia } from 'pinia'
import { executeGenerateStream } from './stream-handler'
import { useTokenStore } from '@/stores/token-store'
import { useSessionStore } from '@/stores/session-store'

/** An NDJSON stream of the chunks given, the way Ollama sends /api/generate. */
function ndjson(chunks: object[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(JSON.stringify(ch) + '\n'))
      c.close()
    },
  })
}

describe('executeGenerateStream', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("keeps the model's own probability when Ollama sends logprobs, as Compare now asks for", async () => {
    const id = useSessionStore().createSession({ mode: 'generate', model: 'qwen2.5:7b', prompt: 'Say hi.' })
    await executeGenerateStream(
      id,
      ndjson([
        // The shape Ollama 0.40 streams with "logprobs": true.
        { model: 'qwen2.5:7b', response: 'Hello', done: false, logprobs: [{ token: 'Hello', logprob: Math.log(0.25), bytes: [72] }] },
        { model: 'qwen2.5:7b', response: '!', done: false, logprobs: [{ token: '!', logprob: Math.log(0.9), bytes: [33] }] },
        { model: 'qwen2.5:7b', response: '', done: true, done_reason: 'stop', eval_count: 2 },
      ]),
    )
    const tokens = useTokenStore().getTokens(id).filter((t) => t.text)
    expect(tokens.map((t) => t.text)).toEqual(['Hello', '!'])
    expect(tokens[0]!.logprob).toBeCloseTo(Math.log(0.25))
    expect(tokens[0]!.confidence).toBeCloseTo(0.25)
    expect(tokens[1]!.confidence).toBeCloseTo(0.9)
  })

  it('leaves the logprob unset when Ollama sent none, so nothing calls the timing a probability', async () => {
    const id = useSessionStore().createSession({ mode: 'generate', model: 'qwen2.5:7b', prompt: 'Say hi.' })
    await executeGenerateStream(id, ndjson([
      { model: 'qwen2.5:7b', response: 'Hello', done: false },
      { model: 'qwen2.5:7b', response: '', done: true, done_reason: 'stop', eval_count: 1 },
    ]))
    const [first] = useTokenStore().getTokens(id).filter((t) => t.text)
    expect(first!.logprob).toBeUndefined()
  })
})
