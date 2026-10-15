import { describe, it, expect } from 'vitest'
import { buildLedger, slotsOf, unloadsNow, keepAliveText } from './ledger'
import type { LiveTurn } from '@/types/live'

let seq = 0
function turn(over: Partial<LiveTurn> & { client?: LiveTurn['client']; at?: number } = {}): LiveTurn {
  seq++
  const base: LiveTurn = {
    id: `t${seq}`,
    seq,
    at: over.at ?? seq * 10_000,
    durationMs: 1_000,
    path: '/api/chat',
    protocol: 'ollama-chat',
    mode: 'chat',
    client: { id: 'open-webui', label: 'Open WebUI', userAgent: 'open-webui' },
    model: 'gemma4:latest',
    stream: true,
    status: 200,
    error: null,
    contextExceeded: null,
    prompt: { tokens: 800, cached: 600, evaluated: 200, prefillMs: 200, prefillTps: 1000, contextRequested: 8192 },
    gen: { tokens: 20, ms: 200, tps: 100, doneReason: 'stop' },
    toolCalls: [],
    toolsOffered: 0,
    toolNames: [],
    anatomy: { systemChars: 400, toolsChars: 0, historyChars: 2000, messageChars: 100, totalChars: 2500, messages: 4 },
    prefix: null,
    fit: { contextLength: 32_768, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' },
    textKept: false,
  }
  return { ...base, ...over, prompt: { ...base.prompt, ...(over.prompt ?? {}) } }
}

const cron = { id: 'ua:cron', label: 'cron-digest', userAgent: 'python-requests' }
const codex = { id: 'openai-node', label: 'codex', userAgent: 'openai/node' }

describe('keep_alive', () => {
  it('reads the request value the way a user writes it, and knows which values unload', () => {
    expect(keepAliveText(0)).toBe('0')
    expect(keepAliveText('5m')).toBe('5m')
    expect(keepAliveText(-1)).toBe('forever')
    expect(unloadsNow(0)).toBe(true)
    expect(unloadsNow('0s')).toBe(true)
    expect(unloadsNow('5m')).toBe(false)
    expect(unloadsNow(null)).toBe(false)
  })
})

describe('slots', () => {
  it('reads the slot count from the loaded context over the requested one', () => {
    expect(slotsOf(turn({ prompt: { contextRequested: 8192 } as LiveTurn['prompt'] }))).toBe(4)
    expect(slotsOf(turn({ prompt: { contextRequested: 32_768 } as LiveTurn['prompt'] }))).toBe(1)
  })
})

describe('buildLedger', () => {
  it('charges a tool that sends keep_alive 0 for the reload the next tool paid', () => {
    const a = turn({ client: cron, keepAlive: 0 })
    const b = turn({ loadMs: 18_000 } as Partial<LiveTurn>) // Open WebUI pays the reload
    const l = buildLedger([a, b])!
    const cronRow = l.rows.find((r) => r.clientId === cron.id)!
    const webui = l.rows.find((r) => r.clientId === 'open-webui')!
    expect(cronRow.unloadsEveryTime).toBe(true)
    expect(cronRow.fix).toBe('keepalive')
    expect(cronRow.costToOthersMs).toBe(18_000)
    expect(cronRow.reloadsCausedForOthers).toBe(1)
    expect(webui.reloadsPaidMs).toBe(18_000)
    expect(l.events[0]).toMatchObject({ kind: 'load', cause: 'keepalive', byClientLabel: 'cron-digest', clientLabel: 'Open WebUI' })
    expect(l.rows[0]!.clientId).toBe(cron.id)
  })

  it('charges a model switch to the tool that brought the other model in, and calls an idle reload nobody’s fault', () => {
    const a = turn()
    const b = turn({ client: codex, model: 'qwen2.5:14b', loadMs: 9_000 } as Partial<LiveTurn>)
    const c = turn({ loadMs: 6_000 } as Partial<LiveTurn>) // gemma4 again, evicted by qwen
    const d = turn({ at: 4 * 10_000 + 3_600_000, loadMs: 6_000 } as Partial<LiveTurn>) // an hour later: idle expiry
    const l = buildLedger([a, b, c, d])!
    const ev = l.events.filter((e) => e.kind === 'load')
    expect(ev.map((e) => e.cause)).toEqual(['first', 'switch', 'idle']) // qwen's own first load is nobody's fault
    expect(ev[1]).toMatchObject({ byClientLabel: 'codex', clientLabel: 'Open WebUI' })
    expect(ev[2]!.byClientLabel).toBeNull()
    expect(l.rows.find((r) => r.clientId === codex.id)!.costToOthersMs).toBe(6_000)
  })

  it('pays a queue wait to the request that was still running, and names it', () => {
    const long = turn({ client: codex, at: 100_000, durationMs: 30_000 })
    const waiter = turn({ at: 105_000, queueMs: 22_000 } as Partial<LiveTurn>)
    const l = buildLedger([long, waiter])!
    const webui = l.rows.find((r) => r.clientId === 'open-webui')!
    expect(webui.waitedMs).toBe(22_000)
    expect(webui.waitedBehind).toEqual([{ clientId: codex.id, clientLabel: 'codex', ms: 22_000 }])
    expect(l.rows.find((r) => r.clientId === codex.id)!.costToOthersMs).toBe(22_000)
  })

  it('flags a context far larger than the prompts and records the slot drop it caused', () => {
    const a = turn()
    const big = turn({ client: codex, prompt: { tokens: 4_200, contextRequested: 131_072 } as LiveTurn['prompt'], fit: { contextLength: 131_072, size: 6e9, sizeVram: 6e9, cpuShare: 0, runner: 'llamacpp' } })
    const l = buildLedger([a, big])!
    expect(l.rows.find((r) => r.clientId === codex.id)!.fix).toBe('context')
    expect(l.slots).toMatchObject({ max: 4, min: 1 })
    expect(l.slots.changes[0]).toMatchObject({ from: 4, to: 1, clientLabel: 'codex' })
  })

  it('does not count what a tool costs itself against it', () => {
    const a = turn({ client: cron, keepAlive: 0 })
    const b = turn({ client: cron, keepAlive: 0, loadMs: 18_000 } as Partial<LiveTurn>)
    const l = buildLedger([a, b])!
    const cronRow = l.rows[0]!
    expect(cronRow.costToOthersMs).toBe(0)
    expect(cronRow.reloadsPaidMs).toBe(18_000)
    expect(l.totalCostMs).toBe(0)
  })
})
