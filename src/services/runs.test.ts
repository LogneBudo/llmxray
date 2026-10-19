import { describe, expect, it } from 'vitest'
import type { LiveTurn, LiveTurnText } from '@/types/live'
import { answerOf, buildRuns, continues, rowKey, runOfTurn, toolExchanges, RUN_GAP_MS } from './runs'
// A real run recorded 2026-10-18: the swarm's funnel-baseline mission on gemma4, 20 calls. Timings only.
import recorded from './__fixtures__/run-funnel-baseline.turns.json'

const real = recorded as unknown as LiveTurn[]

function turn(over: Partial<LiveTurn> & { id: string; at: number }): LiveTurn {
  return {
    seq: 0, durationMs: 100, path: '/api/chat', protocol: 'ollama-chat', mode: 'agent',
    client: { id: 'agent-a', label: 'agent-a', source: 'header' } as LiveTurn['client'],
    model: 'm', stream: true, status: 200, error: null, contextExceeded: null, loadMs: 5,
    prompt: { tokens: 1000, cached: 900, evaluated: 100, prefillMs: 20, prefillTps: null, contextRequested: null },
    gen: { tokens: 10, ms: 40, tps: null, doneReason: 'stop' },
    toolCalls: [], toolsOffered: 0, toolNames: [],
    anatomy: { systemChars: 0, toolsChars: 0, historyChars: 0, messageChars: 0, totalChars: 0, messages: 0 },
    prefix: null, fit: null, textKept: false,
    ...over,
  } as LiveTurn
}
const text = (messages: unknown[], answer?: LiveTurnText['answer']): LiveTurnText => ({ request: { messages }, canonical: '', snippet: null, answer })

describe('the recorded run', () => {
  const [run] = buildRuns(real)

  it('is one run of 20 calls from one client', () => {
    expect(buildRuns(real)).toHaveLength(1)
    expect(run!.calls).toHaveLength(20)
    expect(run!.clientLabel).toBe('swarm-funnel-baseline')
  })

  it('finds the 8.5 s model load on the first call and nowhere else', () => {
    expect(run!.calls[0]!.flags).toContain('loaded')
    expect(run!.calls.slice(1).every((c) => !c.flags.includes('loaded'))).toBe(true)
    expect(run!.findings.loadMs).toBeGreaterThan(8000)
  })

  it('starts a step at every fresh context, read from the empty cache when no text is kept', () => {
    // Calls 7, 9, 12, 16 and 19 began fresh conversations: five empty caches, six steps with the first.
    expect(run!.findings.emptyCache).toBe(5)
    expect(run!.steps).toHaveLength(6)
    expect(run!.steps.map((s) => (s.rows[0] as { index: number }).index + 1)).toEqual([1, 7, 9, 12, 16, 19])
  })

  it('splits each call into phases that add up to its wall time', () => {
    for (const c of run!.calls) {
      const sum = c.phases.reduce((s, p) => s + p.ms, 0)
      expect(Math.abs(sum - c.ms)).toBeLessThan(1)
    }
  })

  it('puts the tool time between a call and the next, named after the tools asked for', () => {
    const gap = run!.steps[1]!.rows.find((r) => r.kind === 'tools')!
    expect(gap.kind).toBe('tools')
    if (gap.kind === 'tools') {
      expect(gap.tools.length).toBeGreaterThan(10)
      expect(gap.tools).toContain('prom_query')
      expect(gap.ms).toBeGreaterThan(0)
    }
  })
})

describe('grouping', () => {
  it('splits a client into two runs when it pauses longer than the run gap', () => {
    const runs = buildRuns([turn({ id: 'a', at: 0 }), turn({ id: 'b', at: 1000 }), turn({ id: 'c', at: 1000 + RUN_GAP_MS + 500 })])
    expect(runs).toHaveLength(2)
    expect(runOfTurn(runs, 'b')!.calls.map((c) => c.turn.id)).toEqual(['a', 'b'])
  })

  it('keeps clients apart and leaves embeddings out', () => {
    const other = { id: 'b', label: 'b', source: 'header' } as LiveTurn['client']
    const runs = buildRuns([turn({ id: 'a', at: 0 }), turn({ id: 'x', at: 10, client: other }), turn({ id: 'e', at: 20, mode: 'embedding' })])
    expect(runs.map((r) => r.calls.map((c) => c.turn.id))).toEqual([['x'], ['a']])
  })

  it('names rows by call number', () => {
    const [run] = buildRuns([turn({ id: 'a', at: 0, toolCalls: ['read_file'] }), turn({ id: 'b', at: 500 })])
    expect(run!.steps[0]!.rows.map(rowKey)).toEqual(['call-1', 'tools-1', 'call-2'])
  })
})

describe('with kept text', () => {
  const sys = { role: 'system', content: 'S' }
  const user = { role: 'user', content: 'list runs' }
  const asked = { role: 'assistant', content: '', tool_calls: [{ function: { name: 'list_files', arguments: { dir: 'runs' } } }] }
  const result = { role: 'tool', content: 'a.md\nb.md' }
  const a = turn({ id: 'a', at: 0, toolCalls: ['list_files'], textKept: true })
  const b = turn({ id: 'b', at: 400, textKept: true })
  const c = turn({ id: 'c', at: 900, textKept: true, prompt: { tokens: 1000, cached: 0, evaluated: 1000, prefillMs: 300, prefillTps: null, contextRequested: null } })
  const texts = new Map<string, LiveTurnText>([
    ['a', text([sys, user])],
    ['b', text([sys, user, asked, result], { content: 'Two files.', thinking: null, toolCalls: [] })],
    ['c', text([sys, { role: 'user', content: 'next step' }])],
  ])
  const [run] = buildRuns([a, b, c], texts)

  it('reads a continued conversation as one step and a restarted one as a new step', () => {
    expect(continues(texts.get('a'), texts.get('b'))).toBe(true)
    expect(continues(texts.get('b'), texts.get('c'))).toBe(false)
    expect(run!.steps).toHaveLength(2)
  })

  it('takes the answer from the next call when the observer did not keep it', () => {
    expect(answerOf(run!, 0, texts)).toEqual({ content: '', thinking: null, toolCalls: [{ name: 'list_files', arguments: { dir: 'runs' } }] })
  })

  it('prefers the kept answer, which is the only source for the last call of a step', () => {
    expect(answerOf(run!, 1, texts)!.content).toBe('Two files.')
    expect(answerOf(run!, 2, texts)).toBeNull()
  })

  it('pairs each tool call with the result the agent sent back', () => {
    expect(toolExchanges(run!, 0, texts)).toEqual([{ name: 'list_files', arguments: { dir: 'runs' }, result: 'a.md\nb.md' }])
  })
})
