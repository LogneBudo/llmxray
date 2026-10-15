import { describe, it, expect } from 'vitest'
import { createTools } from './mcp.mjs'
import { renderFinding } from './findings.mjs'

let seq = 0
function turn(over = {}) {
  const tokens = over.tokens ?? 10_000
  const cached = over.cached ?? 2_000
  seq++
  return {
    id: `t${seq}`,
    seq,
    at: Date.now() - (over.ageMs ?? 0),
    durationMs: 4_000,
    path: '/api/chat',
    protocol: 'ollama-chat',
    mode: 'agent',
    client: over.client ?? { id: 'ua:swarm', label: 'swarm', userAgent: 'swarm/1' },
    model: over.model ?? 'gemma4:latest',
    stream: false,
    status: 200,
    error: null,
    contextExceeded: over.contextExceeded ?? null,
    prompt: {
      tokens,
      cached,
      evaluated: tokens - cached,
      prefillMs: over.prefillMs ?? 3_000,
      prefillTps: 2_600,
      contextRequested: 32_768,
    },
    gen: { tokens: 120, ms: 2_400, tps: 50, doneReason: 'stop' },
    toolCalls: over.toolCalls ?? [],
    toolsOffered: over.toolsOffered ?? 5,
    toolNames: [],
    anatomy: { systemChars: 900, toolsChars: over.toolsChars ?? 2_000, historyChars: 20_000, messageChars: 400, totalChars: 23_300, messages: 6 },
    prefix: over.prefix ?? { breakChar: 950, breakShare: 0.04, breakTokensEst: 400, identical: false },
    fit: over.fit ?? { contextLength: 32_768, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' },
    textKept: false,
  }
}

function fakeFetch(routes) {
  return async (url) => {
    for (const [prefix, data] of Object.entries(routes)) {
      if (url.includes(prefix)) return { ok: true, json: async () => (typeof data === 'function' ? data() : data) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }
}

const base = { serverUrl: 'http://x:5174/', ollamaUrl: 'http://x:11434' }

describe('diagnose_my_turns', () => {
  it('tells an agent how to route when nothing was seen', async () => {
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns: [] } }) })
    const out = await tools.diagnose_my_turns()
    expect(out).toMatch(/11435/)
  })

  it('names the prefix-cache finding with the fix, from three bad turns', async () => {
    const turns = [turn(), turn(), turn()]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.diagnose_my_turns({})
    expect(out).toMatch(/3 turns seen/)
    expect(out).toMatch(/swarm re-reads about 8000 tokens on every turn with gemma4:latest/)
    expect(out).toMatch(/around token 400/)
  })

  it('names the clients it did see when the filter matches none of them', async () => {
    const turns = [turn({ client: { id: 'ua:node', label: 'Node (fetch)', userAgent: 'node' } })]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.diagnose_my_turns({ client: 'swarm' })
    expect(out).toMatch(/No turns from a client matching "swarm"\. Clients seen so far: Node \(fetch\)\./)
    expect(out).not.toMatch(/No turns have been seen yet/)
  })

  it('filters by client label and reports when nothing stands out', async () => {
    const good = () => turn({ cached: 9_600, client: { id: 'ua:other', label: 'Other tool', userAgent: 'o' } })
    const turns = [turn(), turn(), turn(), good(), good(), good()]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.diagnose_my_turns({ client: 'other' })
    expect(out).toMatch(/3 turns seen for "other"/)
    expect(out).toMatch(/Nothing stands out: the cache is holding/)
    expect(out).not.toMatch(/swarm/)
  })

  it('reports a rejected prompt as an error with the context numbers', async () => {
    const turns = [turn({ contextExceeded: { promptTokens: 40_000, contextLength: 32_768 } })]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.diagnose_my_turns({})
    expect(out).toMatch(/\[error\] swarm sends 40000-token prompts, but gemma4:latest is loaded with a 32768-token context\. 1 request rejected\./)
    expect(out).toMatch(/OLLAMA_CONTEXT_LENGTH/)
  })
})

describe('when LLMxRay is not running', () => {
  it('says what to start instead of "fetch failed"', async () => {
    const tools = createTools({ ...base, fetchImpl: async () => { throw new TypeError('fetch failed') } })
    await expect(tools.diagnose_my_turns({})).rejects.toThrow(/LLMxRay is not running at http:\/\/x:5174.*npx llmxray/)
    await expect(tools.local_models()).rejects.toThrow(/Ollama is not reachable at http:\/\/x:11434/)
  })
})

describe('last_turn_metrics', () => {
  it('describes the newest turn in numbers', async () => {
    const turns = [turn({ tokens: 5_000, cached: 4_000 }), turn({ tokens: 12_000, cached: 11_000, prefillMs: 800 })]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.last_turn_metrics({})
    expect(out).toMatch(/prompt: 12000 tokens, 11000 from cache \(92%\), 1000 evaluated in 800 ms/)
    expect(out).toMatch(/generation: 120 tokens in 2400 ms \(50\.0 tok\/s\), stopped: stop/)
    expect(out).toMatch(/model fit: context 32768, 100% in VRAM/)
  })
})

describe('local_models', () => {
  it('lists pulled models, marks the loaded one, and judges fit against video memory', async () => {
    const tools = createTools({
      ...base,
      fetchImpl: fakeFetch({
        '/api/tags': {
          models: [
            { name: 'gemma4:latest', size: 6.6 * 1024 ** 3, details: { parameter_size: '7.5B', quantization_level: 'Q4_K_M', family: 'gemma4' } },
            { name: 'qwen2.5:14b', size: 9.0 * 1024 ** 3, details: { parameter_size: '14.8B', quantization_level: 'Q4_K_M', family: 'qwen2' } },
            { name: 'big:70b', size: 40 * 1024 ** 3, details: { parameter_size: '70B', quantization_level: 'Q4_K_M', family: 'llama' } },
          ],
        },
        '/api/ps': { models: [{ name: 'gemma4:latest', size: 7e9, size_vram: 7e9, context_length: 32768 }] },
        '/__system-info': { gpu: [{ name: 'RTX 5070', adapterRamBytes: 12 * 1024 ** 3 }], memory: { totalBytes: 64 * 1024 ** 3 } },
      }),
    })
    const out = await tools.local_models()
    expect(out).toMatch(/RTX 5070, 12\.0 GB video memory/)
    expect(out).toMatch(/gemma4:latest: 6\.6 GB on disk, 7\.5B parameters, Q4_K_M, gemma4\.\s+LOADED now with a 32768-token context, fully in VRAM/)
    expect(out).toMatch(/qwen2\.5:14b.*fits in VRAM with room for context/)
    expect(out).toMatch(/big:70b.*larger than VRAM: will run partly on CPU/)
  })
})

describe('renderFinding', () => {
  it('renders every kind as a sentence, never as JSON', () => {
    const kinds = [
      { kind: 'context', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', tokens: 1, context: 2, rejected: 2 } },
      { kind: 'truncated', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', context: 1024, tokens: 4900, lost: 3876, systemChars: 80, turns: 3 } },
      { kind: 'prefix', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', tokens: 1, promptTokens: 2, share: 3, breakTokens: -1 } },
      { kind: 'drop', severity: 'warning', turnId: 't', params: { client: 'c', model: 'm', from: 90, to: 10, promptTokens: 2, breakTokens: 5 } },
      { kind: 'cpu', severity: 'warning', turnId: 't', params: { model: 'm', cpu: 30, context: -1, runner: '' } },
      { kind: 'tools', severity: 'warning', turnId: 't', params: { client: 'c', share: 40, offered: 10, used: 2, turns: 7 } },
    ]
    for (const f of kinds) {
      const s = renderFinding(f)
      expect(s).not.toMatch(/[{}"]/)
      expect(s.length).toBeGreaterThan(40)
    }
    expect(renderFinding(kinds[0])).toMatch(/2 requests rejected/)
  })
})
