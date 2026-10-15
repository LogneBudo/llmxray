import { computeFindings, summariseClients, cacheFixSavingMs, median } from './live-findings'
import type { LiveTurn } from '@/types/live'

let seq = 0
function turn(over: Partial<LiveTurn> & { tokens?: number; cached?: number; prefillMs?: number }): LiveTurn {
  const tokens = over.tokens ?? 10_000
  const cached = over.cached ?? 2_000
  const prefillMs = over.prefillMs ?? 3_000
  seq++
  return {
    id: `t${seq}`,
    seq,
    at: 1_000 + seq,
    durationMs: 4_000,
    path: '/api/chat',
    protocol: 'ollama-chat',
    mode: 'agent',
    client: { id: 'copilot', label: 'VS Code Copilot', userAgent: 'GitHubCopilotChat' },
    model: 'qwen2.5-coder:14b',
    stream: true,
    status: 200,
    error: null,
    contextExceeded: null,
    prompt: { tokens, cached, evaluated: tokens - cached, prefillMs, prefillTps: null, contextRequested: null },
    gen: { tokens: 100, ms: 3_000, tps: 33, doneReason: 'stop' },
    toolCalls: ['read_file'],
    toolsOffered: 31,
    toolNames: [],
    anatomy: { systemChars: 1_500, toolsChars: 4_000, historyChars: 4_000, messageChars: 500, totalChars: 10_000, messages: 6 },
    prefix: { breakChar: 2_000, breakShare: 0.2, breakTokensEst: 2_000, identical: false },
    fit: { contextLength: 32_768, size: 1000, sizeVram: 590, cpuShare: 0.41, runner: 'llamacpp' },
    textKept: false,
    ...over,
  }
}

describe('median', () => {
  it('handles odd, even and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
    expect(median([NaN, 5])).toBe(5)
  })
})

describe('computeFindings', () => {
  it('needs three measured turns before it accuses a client of breaking the cache', () => {
    expect(computeFindings([turn({}), turn({})]).filter((f) => f.kind === 'prefix')).toHaveLength(0)
    const f = computeFindings([turn({}), turn({}), turn({})]).find((x) => x.kind === 'prefix')
    expect(f).toBeDefined()
    expect(f!.params).toMatchObject({ client: 'VS Code Copilot', tokens: 8_000, share: 20, breakTokens: 2_000 })
    expect(f!.turnId).toBe('t5')
  })

  it('flags the one turn where a cached client lost the cache, and points at the break', () => {
    const turns = [
      turn({ tokens: 10_000, cached: 9_000 }),
      turn({ tokens: 10_000, cached: 9_200 }),
      turn({ tokens: 10_000, cached: 300, prefix: { breakChar: 120, breakShare: 0.01, breakTokensEst: 120, identical: false } }),
      turn({ tokens: 10_000, cached: 9_100 }),
    ]
    const drops = computeFindings(turns).filter((f) => f.kind === 'drop')
    expect(drops).toHaveLength(1)
    expect(drops[0]!.turnId).toBe(turns[2]!.id)
    expect(drops[0]!.params).toMatchObject({ from: 92, to: 3, breakTokens: 120, promptTokens: 10_000 })
  })

  it('does not call a drop what the prefix finding already covers: a client that is never cached', () => {
    const turns = [turn({ cached: 500 }), turn({ cached: 400 }), turn({ cached: 600 })]
    const kinds = computeFindings(turns).map((f) => f.kind)
    expect(kinds).toContain('prefix')
    expect(kinds).not.toContain('drop')
  })

  it('ignores a drop on a prompt too small to matter', () => {
    const turns = [turn({ tokens: 200, cached: 190 }), turn({ tokens: 200, cached: 10 })]
    expect(computeFindings(turns).filter((f) => f.kind === 'drop')).toHaveLength(0)
  })

  it('stays quiet for a well-cached client even with a large prompt', () => {
    const turns = [turn({ cached: 9_600 }), turn({ cached: 9_700 }), turn({ cached: 9_500 })]
    expect(computeFindings(turns).filter((f) => f.kind === 'prefix')).toHaveLength(0)
  })

  it('stays quiet for a small prompt even when the cache share is low', () => {
    const turns = [turn({ tokens: 300, cached: 10 }), turn({ tokens: 300, cached: 10 }), turn({ tokens: 300, cached: 10 })]
    expect(computeFindings(turns).filter((f) => f.kind === 'prefix')).toHaveLength(0)
  })

  it('reports a model running partly on CPU from the latest load facts', () => {
    const f = computeFindings([turn({})]).find((x) => x.kind === 'cpu')
    expect(f!.params).toMatchObject({ model: 'qwen2.5-coder:14b', cpu: 41, context: 32_768 })
    const fits = computeFindings([turn({ fit: { contextLength: 8192, size: 1000, sizeVram: 1000, cpuShare: 0, runner: null } })])
    expect(fits.filter((x) => x.kind === 'cpu')).toHaveLength(0)
  })

  it('reports tool schemas that dominate the prompt, with how many were used', () => {
    const f = computeFindings([turn({ toolCalls: ['read_file'] }), turn({ toolCalls: ['edit_file'] })]).find((x) => x.kind === 'tools')
    expect(f!.params).toMatchObject({ share: 40, offered: 31, used: 2, turns: 2 })
  })

  it('reports a prompt larger than the loaded context from a single rejected turn, and counts the rejections', () => {
    const rejected = () =>
      turn({
        status: 400,
        error: 'request (9415 tokens) exceeds the available context size (4096 tokens), try increasing it',
        contextExceeded: { promptTokens: 9415, contextLength: 4096 },
        prompt: { tokens: 9415, cached: null, evaluated: null, prefillMs: null, prefillTps: null, contextRequested: null },
        anatomy: { systemChars: 40963, toolsChars: 148744, historyChars: 0, messageChars: 161, totalChars: 189868, messages: 2 },
        toolsOffered: 108,
        toolCalls: [],
      })
    const found = computeFindings([rejected(), rejected(), rejected()])
    const ctx = found.find((f) => f.kind === 'context')!
    expect(ctx.severity).toBe('error')
    expect(ctx.params).toMatchObject({ client: 'VS Code Copilot', model: 'qwen2.5-coder:14b', tokens: 9415, context: 4096, rejected: 3 })
    // Rejected turns still count for the tool-schema finding: the schemas are why the prompt is too big.
    expect(found.find((f) => f.kind === 'tools')!.params).toMatchObject({ share: 78, offered: 108, used: 0 })
    // But never for the cache finding, which needs measured turns.
    expect(found.filter((f) => f.kind === 'prefix')).toHaveLength(0)
  })

  it('ignores failed turns and embeddings for prompt findings', () => {
    const turns = [turn({ error: 'HTTP 500' }), turn({ mode: 'embedding' }), turn({}), turn({})]
    const found = computeFindings(turns)
    // Four turns, but only two count: not enough for the prefix finding, and the
    // tools finding counts the two healthy ones only.
    expect(found.filter((f) => f.kind === 'prefix')).toHaveLength(0)
    expect(found.find((f) => f.kind === 'tools')!.params.turns).toBe(2)
  })
})

describe('summariseClients', () => {
  it('totals per client and estimates what a cache fix would have saved', () => {
    const t = turn({})
    // 8,000 evaluated of which 500 (5% of chars) are the new message: 93.75% of 3 s avoidable.
    expect(cacheFixSavingMs(t)).toBeCloseTo(2_812.5)
    const other = turn({ client: { id: 'open-webui', label: 'Open WebUI', userAgent: '' }, mode: 'chat', toolCalls: [] })
    const s = summariseClients([t, turn({}), other])
    expect(s[0]).toMatchObject({ label: 'VS Code Copilot', turns: 2, toolCalls: 2, prefillMs: 6_000, tokens: 20_200 })
    expect(s[0]!.cacheFixSavesMs).toBeCloseTo(5_625)
    expect(s[1]!.label).toBe('Open WebUI')
  })

  it('does not count a first turn or a cold load as avoidable prefill', () => {
    // Captured live: 46,806 tokens, 0 cached, 10.5 s, no previous turn. Not a cache problem.
    const cold = turn({ cached: 0, prefillMs: 10_500, prefix: null })
    expect(cacheFixSavingMs(cold)).toBeNull()
    const s = summariseClients([cold, turn({})])
    expect(s[0]!.cacheFixSavesMs).toBeCloseTo(2_812.5)
  })

  it('reports no saving when the daemon gave no counts', () => {
    const t = turn({ prompt: { tokens: null, cached: null, evaluated: null, prefillMs: null, prefillTps: null, contextRequested: null } })
    expect(cacheFixSavingMs(t)).toBeNull()
    expect(summariseClients([t])[0]!.cacheFixSavesMs).toBeNull()
  })
})

describe('what does not count as a cache problem', () => {
  it('a turn whose model was (re)loaded is not a drop and not a prefix break', () => {
    const turns = [
      turn({ cached: 9_500 }),
      turn({ cached: 9_500 }),
      turn({ cached: 0, loadMs: 4_200 } as Partial<LiveTurn> & { cached: number }),
    ]
    const f = computeFindings(turns)
    expect(f.find((x) => x.kind === 'drop')).toBeUndefined()
    expect(f.find((x) => x.kind === 'prefix')).toBeUndefined()
  })

  it('a model entirely off the GPU is not a "partly on CPU" finding', () => {
    const turns = [turn({ fit: { contextLength: 8192, size: 4e9, sizeVram: 0, cpuShare: 1, runner: 'llamacpp' } })]
    expect(computeFindings(turns).find((x) => x.kind === 'cpu')).toBeUndefined()
  })
})

describe('silent truncation', () => {
  it('fires when the daemon reports a context-full prompt that was clearly larger, and names the lost part', () => {
    // Measured on Ollama 0.40.4: num_ctx 1024, a ~4900-token prompt, HTTP 200, prompt_eval_count 1027.
    const t = turn({ tokens: 1027, cached: 0 })
    // /api/ps says 2048 (num_ctx times two parallel slots); the request asked for 1024, and that is the ceiling.
    t.prompt.contextRequested = 1024
    t.fit = { contextLength: 2048, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' }
    t.anatomy = { systemChars: 80, toolsChars: 0, historyChars: 0, messageChars: 17_000, totalChars: 17_080, messages: 2 }
    const f = computeFindings([t]).find((x) => x.kind === 'truncated')
    expect(f).toBeTruthy()
    expect(f!.severity).toBe('error')
    expect(f!.params.context).toBe(1024)
    expect(Number(f!.params.lost)).toBeGreaterThan(3_000)
    expect(f!.params.systemChars).toBe(80)
  })

  it('does not fire on a prompt that merely fills the context, nor on a rejected one', () => {
    const full = turn({ tokens: 1020, cached: 0 })
    full.fit = { contextLength: 1024, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' }
    full.anatomy = { systemChars: 80, toolsChars: 0, historyChars: 0, messageChars: 3_400, totalChars: 3_480, messages: 2 }
    expect(computeFindings([full]).find((x) => x.kind === 'truncated')).toBeUndefined()
    const rejected = turn({ tokens: 1027, cached: 0, contextExceeded: { promptTokens: 4939, contextLength: 1024 } })
    rejected.fit = full.fit
    rejected.anatomy = { ...full.anatomy, messageChars: 17_000, totalChars: 17_080 }
    expect(computeFindings([rejected]).find((x) => x.kind === 'truncated')).toBeUndefined()
  })
})
