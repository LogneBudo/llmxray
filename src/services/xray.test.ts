import { describe, it, expect } from 'vitest'
import { xrayTurn, xrayConversations } from './xray'
import type { LiveTurn } from '@/types/live'

let seq = 0
function turn(over: Partial<LiveTurn> & { tokens?: number; cached?: number; sys?: number; tools?: number; hist?: number; msg?: number } = {}): LiveTurn {
  const tokens = over.tokens ?? 1000
  const cached = over.cached ?? 0
  const sys = over.sys ?? 400
  const tools = over.tools ?? 0
  const hist = over.hist ?? 0
  const msg = over.msg ?? 100
  seq++
  return {
    id: `t${seq}`,
    seq,
    at: 1_000 + seq * 1000,
    durationMs: 1000,
    path: '/api/chat',
    protocol: 'ollama-chat',
    mode: 'chat',
    client: { id: 'open-webui', label: 'Open WebUI', userAgent: 'open-webui' },
    model: 'gemma4:latest',
    stream: true,
    status: 200,
    error: null,
    contextExceeded: null,
    prompt: { tokens, cached, evaluated: tokens - cached, prefillMs: 500, prefillTps: 1000, contextRequested: over.prompt?.contextRequested ?? 8192 },
    gen: { tokens: 20, ms: 200, tps: 100, doneReason: 'stop' },
    toolCalls: [],
    toolsOffered: over.toolsOffered ?? (tools > 0 ? 3 : 0),
    toolNames: [],
    anatomy: { systemChars: sys, toolsChars: tools, historyChars: hist, messageChars: msg, totalChars: sys + tools + hist + msg, messages: 2 },
    prefix: over.prefix === undefined ? null : over.prefix,
    fit: { contextLength: 8192, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' },
    textKept: false,
    ...('loadMs' in over ? { loadMs: over.loadMs } : {}),
    ...(over.client ? { client: over.client } : {}),
    ...(over.mode ? { mode: over.mode } : {}),
  }
}

describe('xrayTurn', () => {
  it('draws a first turn as fully read, in canonical order, to the daemon token count', () => {
    const x = xrayTurn(turn({ tokens: 500, sys: 400, msg: 100 }), null)
    expect(x.segments.map((s) => [s.part, s.state])).toEqual([['system', 'recomputed'], ['message', 'recomputed']])
    expect(x.segments.reduce((n, s) => n + s.tokens, 0)).toBe(500)
    expect(x.note).toEqual({ kind: 'first' })
  })

  it('splits the history at the exact prefix break and notes which part it fell in', () => {
    const prev = turn({ tokens: 1000, sys: 400, hist: 500, msg: 100 })
    const t = turn({ tokens: 1200, cached: 300, sys: 400, hist: 700, msg: 100, prefix: { breakChar: 650, breakShare: 0.54, breakTokensEst: 650, identical: false } })
    const x = xrayTurn(t, prev)
    expect(x.segments.map((s) => `${s.part}:${s.state}:${s.chars}`)).toEqual([
      'system:cached:400',
      'history:cached:250',
      'history:recomputed:450',
      'message:recomputed:100',
    ])
    expect(x.note).toMatchObject({ kind: 'break', part: 'history', breakChar: 650 })
  })

  it('marks the start as cut when the daemon silently truncated, and says what was lost', () => {
    // Measured 2026-10-16: num_ctx 1024, prompt_eval_count 1027, ~12 500 characters sent.
    const t = turn({ tokens: 1027, sys: 80, msg: 12_400, prompt: { contextRequested: 1024 } as LiveTurn['prompt'] })
    t.prompt.contextRequested = 1024
    const x = xrayTurn(t, null)
    expect(x.segments[0]).toMatchObject({ part: 'system', state: 'cut', chars: 80 })
    expect(x.segments.find((s) => s.part === 'message' && s.state === 'cut')).toBeTruthy()
    expect(x.segments.find((s) => s.part === 'message' && s.state === 'recomputed')).toBeTruthy()
    expect(x.note).toMatchObject({ kind: 'cut', context: 1024, systemLost: true })
    expect((x.note as { lostTokens: number }).lostTokens).toBeGreaterThan(2000)
  })

  it('marks the oldest messages as cut, not the system prompt, when a chat outgrew the context', () => {
    // Recorded 2026-10-23: num_ctx 2048, read 1982 of about 3240 tokens; system and new message kept.
    const t = turn({ tokens: 1982, sys: 5064, hist: 6174, msg: 40 })
    t.prompt.contextRequested = 2048
    const x = xrayTurn(t, null)
    expect(x.segments[0]).toMatchObject({ part: 'system', state: 'recomputed', chars: 5064 })
    expect(x.segments.find((s) => s.part === 'history' && s.state === 'cut')).toBeTruthy()
    expect(x.segments.find((s) => s.part === 'message')).toMatchObject({ state: 'recomputed' })
    expect(x.note).toMatchObject({ kind: 'cut', mode: 'history', context: 2048, systemLost: false })
  })

  it('notes the turn where tools first appeared and a turn where the model was reloaded', () => {
    const prev = turn({ tokens: 500 })
    const withTools = turn({ tokens: 1700, cached: 400, tools: 4800, prefix: { breakChar: 400, breakShare: 0.08, breakTokensEst: 400, identical: false } })
    expect(xrayTurn(withTools, prev).note).toMatchObject({ kind: 'tools-added', tools: 3 })
    const reloaded = turn({ tokens: 500, cached: 0, loadMs: 4200 } as Partial<LiveTurn> & { tokens: number; cached: number })
    expect(xrayTurn(reloaded, prev).note).toEqual({ kind: 'reloaded', loadMs: 4200 })
  })
})

describe('xrayConversations', () => {
  it('groups by client and model, oldest turn first, and sums what the prompt reading cost', () => {
    const a1 = turn({ tokens: 500 })
    const other = turn({ tokens: 300, client: { id: 'curl', label: 'curl', userAgent: 'curl/8' } })
    const a2 = turn({ tokens: 900, cached: 450, hist: 400, prefix: { breakChar: 850, breakShare: 0.94, breakTokensEst: 850, identical: false } })
    const embed = turn({ tokens: 50, mode: 'embedding' })
    const convs = xrayConversations([a1, other, a2, embed])
    expect(convs.map((c) => c.clientLabel)).toEqual(['Open WebUI', 'curl'])
    expect(convs[0]!.turns.map((x) => x.turn.id)).toEqual([a1.id, a2.id])
    expect(convs[0]!.maxTokens).toBe(900)
    expect(convs[0]!.totals.prefillMs).toBe(1000)
    expect(convs[0]!.totals.cutTurns).toBe(0)
  })
})
