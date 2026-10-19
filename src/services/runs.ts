/**
 * Runs: one client's model calls, end to end, as a waterfall. A run is a client's calls that
 * follow each other closely; a step inside it begins wherever the agent started a fresh
 * conversation. Each call is split into the phases Ollama reports (waiting, loading, prompt,
 * answer); the time between one call's answer and the next call is the agent's own time, which
 * is tool time when the model asked for tools. Pure functions over LiveTurn records and, when
 * Keep text is on, their kept text; the page only draws what comes out of here.
 *
 * Tool time is measured from outside the agent: nothing inside a tool is traced.
 */
import type { LiveTurn, LiveTurnText, LiveAnswer } from '@/types/live'
import { reloaded } from '@/services/live-findings'

/** Calls of one client further apart than this belong to different runs. */
export const RUN_GAP_MS = 2 * 60_000
/** A prompt this small with an empty cache is not a "lost cache": there was little to keep. */
const SMALL_PROMPT = 500

export type PhaseKey = 'queue' | 'load' | 'prompt' | 'answer'
export interface Phase { key: PhaseKey; ms: number }

export interface RunCall {
  kind: 'call'
  /** 0-based position of the call in its run. */
  index: number
  turn: LiveTurn
  start: number
  ms: number
  phases: Phase[]
  /** Share of the prompt served from the cache, 0..1, or null when the daemon did not say. */
  cachedShare: number | null
  flags: Array<'loaded' | 'cache-empty' | 'rejected' | 'cut' | 'error'>
}

export interface RunGap {
  kind: 'tools' | 'agent'
  /** The call this gap follows. */
  after: number
  start: number
  ms: number
  /** Tool names the model asked for in the call before the gap. */
  tools: string[]
}

export type RunRow = RunCall | RunGap
export interface RunStep { n: number; rows: RunRow[] }

export interface RunFindings {
  loadMs: number
  /** Calls that found an empty cache on a prompt worth keeping (reloads excluded: they explain it). */
  emptyCache: number
  emptyCachePrefillMs: number
  rejected: number
  errors: number
}

export interface Run {
  /** The first call's turn id: stable while the run grows. */
  id: string
  clientId: string
  clientLabel: string
  models: string[]
  start: number
  end: number
  calls: RunCall[]
  steps: RunStep[]
  tokensIn: number
  tokensOut: number
  cachedTokens: number
  modelMs: number
  findings: RunFindings
}

const MODEL_MODES = new Set(['chat', 'agent', 'completion'])

function phasesOf(t: LiveTurn): Phase[] {
  const load = t.loadMs ?? 0
  const prompt = t.prompt.prefillMs ?? 0
  const answer = t.gen.ms ?? 0
  // What the daemon did not account for (network, streaming, waiting) is shown as waiting, so the bar adds up.
  const queue = Math.max(0, t.durationMs - load - prompt - answer)
  return [
    { key: 'queue', ms: queue },
    { key: 'load', ms: load },
    { key: 'prompt', ms: prompt },
    { key: 'answer', ms: answer },
  ]
}

function shareOf(t: LiveTurn): number | null {
  return t.prompt.tokens ? (t.prompt.cached ?? 0) / t.prompt.tokens : null
}

function flagsOf(t: LiveTurn, index: number): RunCall['flags'] {
  const f: RunCall['flags'] = []
  if (reloaded(t)) f.push('loaded')
  if (t.contextExceeded) f.push('rejected')
  else if (t.error) f.push('error')
  const share = shareOf(t)
  if (index > 0 && share === 0 && (t.prompt.tokens ?? 0) > SMALL_PROMPT && !reloaded(t)) f.push('cache-empty')
  return f
}

/** The conversation a request carried, for any of the three protocols; empty when none was kept. */
export function messagesOf(text: LiveTurnText | null | undefined): unknown[] {
  const req = text?.request as { messages?: unknown[] } | undefined
  return Array.isArray(req?.messages) ? req!.messages! : []
}

/** True when `next` carries `prev`'s whole conversation and more: the same conversation, continued. */
export function continues(prev: LiveTurnText | null | undefined, next: LiveTurnText | null | undefined): boolean | null {
  const a = messagesOf(prev), b = messagesOf(next)
  if (!a.length || !b.length) return null
  if (b.length <= a.length) return false
  return a.every((m, i) => JSON.stringify(m) === JSON.stringify(b[i]))
}

/**
 * Group a client's calls into runs and steps. With kept text, a step begins where the next
 * request stops carrying the previous conversation; without it, where a prompt worth keeping
 * found the cache empty with the model still loaded.
 */
export function buildRuns(turns: LiveTurn[], texts: Map<string, LiveTurnText> = new Map()): Run[] {
  const byClient = new Map<string, LiveTurn[]>()
  for (const t of turns) {
    if (!MODEL_MODES.has(t.mode)) continue
    const list = byClient.get(t.client.id) ?? []
    list.push(t)
    byClient.set(t.client.id, list)
  }
  const runs: Run[] = []
  for (const list of byClient.values()) {
    list.sort((a, b) => a.at - b.at)
    let group: LiveTurn[] = []
    const flush = () => { if (group.length) runs.push(runOf(group, texts)); group = [] }
    for (const t of list) {
      const last = group[group.length - 1]
      if (last && t.at - (last.at + last.durationMs) > RUN_GAP_MS) flush()
      group.push(t)
    }
    flush()
  }
  return runs.sort((a, b) => b.start - a.start)
}

function runOf(turns: LiveTurn[], texts: Map<string, LiveTurnText>): Run {
  const calls: RunCall[] = turns.map((t, i) => ({
    kind: 'call', index: i, turn: t, start: t.at, ms: t.durationMs, phases: phasesOf(t), cachedShare: shareOf(t), flags: flagsOf(t, i),
  }))
  const steps: RunStep[] = []
  calls.forEach((c, i) => {
    const prev = calls[i - 1]
    let fresh = i === 0
    if (prev) {
      const cont = continues(texts.get(prev.turn.id), texts.get(c.turn.id))
      fresh = cont === null ? c.flags.includes('cache-empty') : !cont
    }
    if (fresh) steps.push({ n: steps.length + 1, rows: [] })
    const rows = steps[steps.length - 1]!.rows
    rows.push(c)
    const next = calls[i + 1]
    if (next) {
      const start = c.start + c.ms
      const ms = next.start - start
      const tools = c.turn.toolCalls
      if (ms > 0) rows.push({ kind: tools.length ? 'tools' : 'agent', after: i, start, ms, tools })
    }
  })
  const findings: RunFindings = { loadMs: 0, emptyCache: 0, emptyCachePrefillMs: 0, rejected: 0, errors: 0 }
  for (const c of calls) {
    findings.loadMs += c.turn.loadMs ?? 0
    if (c.flags.includes('cache-empty')) { findings.emptyCache += 1; findings.emptyCachePrefillMs += c.turn.prompt.prefillMs ?? 0 }
    if (c.flags.includes('rejected')) findings.rejected += 1
    if (c.flags.includes('error')) findings.errors += 1
  }
  const first = turns[0]!, last = turns[turns.length - 1]!
  return {
    id: first.id,
    clientId: first.client.id,
    clientLabel: first.client.label,
    models: [...new Set(turns.map((t) => t.model))],
    start: first.at,
    end: last.at + last.durationMs,
    calls,
    steps,
    tokensIn: turns.reduce((s, t) => s + (t.prompt.tokens ?? 0), 0),
    tokensOut: turns.reduce((s, t) => s + (t.gen.tokens ?? 0), 0),
    cachedTokens: turns.reduce((s, t) => s + (t.prompt.cached ?? 0), 0),
    modelMs: turns.reduce((s, t) => s + t.durationMs, 0),
    findings,
  }
}

/** The run that holds a turn, for links from Live and the X-ray. */
export function runOfTurn(runs: Run[], turnId: string): Run | null {
  return runs.find((r) => r.calls.some((c) => c.turn.id === turnId)) ?? null
}

/** A short address for a row inside a run: call-3, tools-3 (the gap after call 3). */
export function rowKey(row: RunRow): string {
  return row.kind === 'call' ? `call-${row.index + 1}` : `${row.kind}-${row.after + 1}`
}

export interface ToolExchange { name: string; arguments: unknown; result: string | null }

/**
 * What the model answered in call `i`: the kept answer when the observer has it, else the
 * assistant message the agent carried into the next call of the same conversation.
 */
export function answerOf(run: Run, i: number, texts: Map<string, LiveTurnText>): LiveAnswer | null {
  const t = run.calls[i]?.turn
  if (!t) return null
  const kept = texts.get(t.id)?.answer
  if (kept) return kept
  const next = run.calls[i + 1]?.turn
  if (!next || !continues(texts.get(t.id), texts.get(next.id))) return null
  const msg = messagesOf(texts.get(next.id))[messagesOf(texts.get(t.id)).length] as { role?: string; content?: unknown; tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }> } | undefined
  if (msg?.role !== 'assistant') return null
  return {
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? ''),
    thinking: null,
    toolCalls: (msg.tool_calls ?? []).map((c) => ({ name: c.function?.name ?? 'tool', arguments: c.function?.arguments ?? null })),
  }
}

/** The tools call `i` asked for, each with the result the agent sent back in the next call. */
export function toolExchanges(run: Run, i: number, texts: Map<string, LiveTurnText>): ToolExchange[] {
  const answer = answerOf(run, i, texts)
  const calls = answer?.toolCalls ?? run.calls[i]?.turn.toolCalls.map((name) => ({ name, arguments: null })) ?? []
  const t = run.calls[i]?.turn, next = run.calls[i + 1]?.turn
  let results: string[] = []
  if (t && next && continues(texts.get(t.id), texts.get(next.id))) {
    const after = messagesOf(texts.get(next.id)).slice(messagesOf(texts.get(t.id)).length + 1) as Array<{ role?: string; content?: unknown }>
    results = after.filter((m) => m.role === 'tool').map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
  }
  return calls.map((c, k) => ({ name: c.name, arguments: c.arguments, result: results[k] ?? null }))
}
