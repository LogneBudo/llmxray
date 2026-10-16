import { describe, it, expect } from 'vitest'
import { createTools } from './mcp.mjs'
import { renderFinding, computeFindings } from './findings.mjs'

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
    await expect(tools.list_local_models()).rejects.toThrow(/Ollama is not reachable at http:\/\/x:11434/)
  })
})

describe('read_my_last_turn', () => {
  it('describes the newest turn in numbers', async () => {
    const turns = [turn({ tokens: 5_000, cached: 4_000 }), turn({ tokens: 12_000, cached: 11_000, prefillMs: 800 })]
    const tools = createTools({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns } }) })
    const out = await tools.read_my_last_turn({})
    expect(out).toMatch(/prompt: 12000 tokens, 11000 from cache \(92%\), 1000 evaluated in 800 ms/)
    expect(out).toMatch(/generation: 120 tokens in 2400 ms \(50\.0 tok\/s\), stopped: stop/)
    expect(out).toMatch(/model fit: context 32768, 100% in VRAM/)
  })
})

describe('list_local_models', () => {
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
    const out = await tools.list_local_models()
    expect(out).toMatch(/RTX 5070, 12\.0 GB video memory/)
    expect(out).toMatch(/gemma4:latest: 6\.6 GB on disk, 7\.5B parameters, Q4_K_M, gemma4\.\s+LOADED now with a 32768-token context, fully in VRAM/)
    expect(out).toMatch(/qwen2\.5:14b.*fits in VRAM with room for context/)
    expect(out).toMatch(/big:70b.*larger than VRAM: will run partly on CPU/)
  })
})

describe('renderFinding', () => {
  const kinds = () => [
      { kind: 'context', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', tokens: 1, context: 2, rejected: 2 } },
      { kind: 'truncated', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', context: 1024, tokens: 4900, lost: 3876, systemChars: 80, turns: 3 } },
      { kind: 'prefix', severity: 'error', turnId: 't', params: { client: 'c', model: 'm', tokens: 1, promptTokens: 2, share: 3, breakTokens: -1 } },
      { kind: 'drop', severity: 'warning', turnId: 't', params: { client: 'c', model: 'm', from: 90, to: 10, promptTokens: 2, breakTokens: 5 } },
      { kind: 'cpu', severity: 'warning', turnId: 't', params: { model: 'm', cpu: 30, context: -1, runner: '' } },
      { kind: 'tools', severity: 'warning', turnId: 't', params: { client: 'c', share: 40, offered: 10, used: 2, turns: 7 } },
  ]
  it('renders every kind as a sentence, never as JSON', () => {
    for (const f of kinds()) {
      const s = renderFinding(f)
      expect(s).not.toMatch(/[{}"]/)
      expect(s.length).toBeGreaterThan(40)
    }
    expect(renderFinding(kinds()[0])).toMatch(/2 requests rejected/)
  })

  it('a drop says whether the model stayed loaded, so eviction and prefix mismatch are told apart', () => {
    const base = { kind: 'drop', severity: 'warning', turnId: 't', params: { client: 'c', model: 'm', from: 99, to: 0, promptTokens: 4107, breakTokens: 557 } }
    const resident = renderFinding({ ...base, params: { ...base.params, loadMs: 5 } })
    expect(resident).toMatch(/stayed loaded \(load 5 ms\)/)
    expect(resident).toMatch(/KV cache was still there/)
    expect(resident).toMatch(/not an eviction/)
    const unknown = renderFinding({ ...base, params: { ...base.params, loadMs: -1 } })
    expect(unknown).toMatch(/did not report a reload/)
    expect(renderFinding(kinds()[2])).toMatch(/KV cache/)
  })

  it('computeFindings records the load time on the drop turn', () => {
    const turns = [turn({ cached: 9_900 }), turn({ cached: 9_900 }), turn({ cached: 9_900 }), turn({ cached: 0 })]
    turns[3].loadMs = 5.3
    const drop = computeFindings(turns).find((f) => f.kind === 'drop')
    expect(drop).toBeTruthy()
    expect(drop.params.loadMs).toBe(5)
  })
})

describe('what a client sees in tools/list', () => {
  async function listed() {
    const { buildServer } = await import('./mcp.mjs')
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
    const server = buildServer({ ...base, fetchImpl: fakeFetch({ '/__observe/turns': { turns: [] } }) })
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    await server.connect(serverSide)
    const client = new Client({ name: 'probe', version: '0' })
    await client.connect(clientSide)
    const { tools } = await client.listTools()
    return { tools, client }
  }

  it('declares every tool read-only, idempotent and closed-world through annotations', async () => {
    const { tools } = await listed()
    expect(tools.map((t) => t.name).sort()).toEqual(['compare_my_turns', 'diagnose_my_turns', 'estimate_my_prompt', 'list_local_models', 'list_my_turns', 'read_llmxray_status', 'read_my_last_turn'])
    for (const t of tools) {
      expect(t.annotations, t.name).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
      expect(t.annotations.title).toBeTruthy()
    }
  })

  it('tells the agent in each description when to use the other two and what the text that comes back looks like', async () => {
    const { tools } = await listed()
    for (const t of tools) {
      const others = tools.filter((o) => o !== t).map((o) => o.name)
      const named = others.filter((o) => t.description.includes(o))
      expect(named.length, `${t.name} should name at least two sibling tools, names ${named.join(', ') || 'none'}`).toBeGreaterThanOrEqual(2)
      // Each description says what comes back, in its own words.
      expect(t.description, `${t.name} says what comes back`).toMatch(/Returns text|one line each|with the difference|headroom|what it holds/)
      expect(t.description, `${t.name} names its prerequisite`).toMatch(/Needs (LLMxRay|Ollama)/)
      expect(t.description, `${t.name} states its cost`).toMatch(/Under a second/)
      const params = Object.keys(t.inputSchema?.properties ?? {})
      for (const name of params) expect(t.description, `${t.name} explains its parameter ${name}`).toMatch(new RegExp('\\b' + name + ':'))
    }
  })

  it('answers a call over the wire with text, not a transport error, when nothing was seen', async () => {
    const { client } = await listed()
    const r = await client.callTool({ name: 'diagnose_my_turns', arguments: {} })
    expect(r.isError).toBeFalsy()
    expect(r.content[0].text).toMatch(/11435/)
  })
})

describe('the four tools of 0.8.6', () => {
  const now = Date.now()
  function series() {
    // Six turns: three old ones that broke the cache, three recent ones that kept it.
    return [
      turn({ cached: 500, prefillMs: 3_000, ageMs: 3 * 3_600_000 }),
      turn({ cached: 600, prefillMs: 3_100, ageMs: 2.9 * 3_600_000 }),
      turn({ cached: 400, prefillMs: 2_900, ageMs: 2.8 * 3_600_000 }),
      turn({ cached: 9_800, prefillMs: 300, ageMs: 20 * 60_000 }),
      turn({ cached: 9_900, prefillMs: 250, ageMs: 10 * 60_000 }),
      turn({ cached: 9_700, prefillMs: 280, ageMs: 5 * 60_000 }),
    ]
  }
  const routes = () => ({
    '/__observe/turns': { turns: series() },
    '/__observe/status': { keepText: false, port: 11435, host: '127.0.0.1', listening: true, error: null, ollamaUrl: 'http://x:11434', startedAt: now - 3_600_000, turns: 6, textDir: 'C:/t' },
    '/__system-info': { gpu: [{ name: 'RTX', adapterRamBytes: 12 * 1024 ** 3 }], memory: { totalBytes: 32 * 1024 ** 3 } },
    '/api/tags': { models: [{ name: 'gemma4:latest', size: 6e9, details: { context_length: 131072, parameter_size: '7.5B', quantization_level: 'Q4', family: 'gemma' } }] },
    '/api/ps': { models: [{ name: 'gemma4:latest', size: 6e9, size_vram: 6e9, context_length: 32768 }] },
    '/api/version': { version: '0.40.5' },
  })

  it('list_my_turns shows the newest turns, one line each, with the cached share', async () => {
    const tools = createTools({ ...base, fetchImpl: fakeFetch(routes()) })
    const out = await tools.list_my_turns({ limit: 2 })
    expect(out).toMatch(/6 turns; showing the last 2/)
    expect(out.split('\n')).toHaveLength(3)
    expect(out).toMatch(/97% cached/)
    expect(await tools.list_my_turns({ client: 'nobody' })).toMatch(/No turns from a client matching "nobody"/)
  })

  it('compare_my_turns says the cache is working now where it was not', async () => {
    const tools = createTools({ ...base, fetchImpl: fakeFetch(routes()) })
    const out = await tools.compare_my_turns({ split_minutes_ago: 60 })
    expect(out).toMatch(/3 turns before and 3 after/)
    expect(out).toMatch(/cached share: 5% before, 98% after/)
    expect(out).toMatch(/prefill: 3000 ms before, 280 ms after .*better/)
    expect(out).toMatch(/Verdict: the cache is working now/)
    expect(await tools.compare_my_turns({ split_minutes_ago: 1 })).toMatch(/Nothing to compare: 6 turns before and 0 after/)
  })

  it('estimate_my_prompt gives headroom, VRAM fit and the cache reference from the last turn', async () => {
    const tools = createTools({ ...base, fetchImpl: fakeFetch(routes()) })
    const out = await tools.estimate_my_prompt({ model: 'gemma4', prompt_tokens: 30_000 })
    expect(out).toMatch(/loaded with a 32768-token context/)
    expect(out).toMatch(/fits with 2768 tokens of headroom/)
    expect(out).toMatch(/fully in video memory/)
    expect(out).toMatch(/last reused 97% of a 10000-token prompt/)
    expect(await tools.estimate_my_prompt({ model: 'gemma4', prompt_tokens: 40_000 })).toMatch(/7232 tokens over that context/)
    expect(await tools.estimate_my_prompt({ model: 'nope', prompt_tokens: 10 })).toMatch(/No pulled model matches "nope"/)
  })

  it('read_llmxray_status reports the port, the daemon and what is kept', async () => {
    const tools = createTools({ ...base, fetchImpl: fakeFetch(routes()) })
    const out = await tools.read_llmxray_status()
    expect(out).toMatch(/Observe port 11435 on 127.0.0.1: listening/)
    expect(out).toMatch(/version 0.40.5/)
    expect(out).toMatch(/Turns kept in memory: 6 of 500/)
    expect(out).toMatch(/is not kept/)
  })
})
