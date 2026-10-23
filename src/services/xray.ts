/**
 * The prompt X-ray: one turn's prompt as segments drawn to scale, each with
 * what it was (system prompt, tool schemas, earlier turns, the new message)
 * and what happened to it (already in the model's memory, read again, or cut
 * by the daemon and never seen). Pure functions over LiveTurn records; the
 * page only draws what comes out of here.
 *
 * Widths are the daemon's own token counts. The split inside a turn is scaled
 * from characters, and every consumer must say so: it is an estimate.
 */
import type { LiveTurn } from '@/types/live'
import { cacheShare, cacheFixSavingMs, truncation, estimateTokens, requestContext, reloaded } from '@/services/live-findings'

export type XrayPart = 'system' | 'tools' | 'history' | 'message'
export type XrayState = 'cached' | 'recomputed' | 'cut'

export interface XraySegment {
  part: XrayPart
  state: XrayState
  /** Characters of the canonical prompt in this segment. */
  chars: number
  /** Tokens, scaled from characters onto the daemon's count. An estimate. */
  tokens: number
}

export type XrayNote =
  | { kind: 'first' }
  | { kind: 'reloaded'; loadMs: number }
  | { kind: 'break'; part: XrayPart; breakChar: number; breakTokens: number | null; costMs: number | null }
  | { kind: 'tools-added'; tools: number; toolTokens: number }
  | { kind: 'cut'; mode: 'history' | 'start'; lostTokens: number; context: number; systemLost: boolean; toolsLost: boolean }

export interface XrayTurn {
  turn: LiveTurn
  /** Prompt tokens as the daemon counted them; null when it did not say. */
  tokens: number | null
  /** Share of the prompt that was already in memory, 0..1, or null. */
  cachedShare: number | null
  prefillMs: number | null
  segments: XraySegment[]
  note: XrayNote | null
}

export interface XrayConversation {
  key: string
  clientLabel: string
  clientId: string
  model: string
  turns: XrayTurn[]
  /** Widest prompt in tokens, the scale of the chart. */
  maxTokens: number
  totals: { prefillMs: number; avoidableMs: number; cutTurns: number }
}

/** Canonical order of the parts, the same order the proxy builds the prompt in. */
const ORDER: XrayPart[] = ['system', 'tools', 'history', 'message']

function partChars(t: LiveTurn): Record<XrayPart, number> {
  return {
    system: t.anatomy.systemChars,
    tools: t.anatomy.toolsChars,
    history: t.anatomy.historyChars,
    message: t.anatomy.messageChars,
  }
}

/**
 * Where in the canonical prompt the cached run ends. The prefix break is exact
 * when the proxy measured one; otherwise the cached share scaled onto characters.
 */
function cachedChars(t: LiveTurn, total: number): number {
  const share = cacheShare(t)
  if (share == null || share <= 0) return 0
  if (t.prefix && !t.prefix.identical) return Math.min(total, Math.max(0, t.prefix.breakChar))
  if (t.prefix?.identical) return Math.round(total * Math.min(1, share))
  return Math.round(total * Math.min(1, share))
}

/**
 * The character range the daemon cut silently: the oldest messages, right after the system prompt
 * and tools, or the start of the prompt. Empty when nothing was cut.
 */
function cutRange(t: LiveTurn, total: number): { from: number; to: number; mode: 'history' | 'start' } | null {
  const cut = truncation(t)
  if (!cut) return null
  const est = estimateTokens(t)
  const lostChars = Math.min(total, Math.round(total * (cut.lost / est)))
  if (cut.mode === 'start') return { from: 0, to: lostChars, mode: 'start' }
  const from = t.anatomy.systemChars + t.anatomy.toolsChars
  return { from, to: Math.min(from + t.anatomy.historyChars, from + lostChars), mode: 'history' }
}

export function xrayTurn(t: LiveTurn, previous: LiveTurn | null): XrayTurn {
  const chars = partChars(t)
  const total = ORDER.reduce((n, p) => n + chars[p], 0)
  const tokens = t.prompt.tokens
  const perChar = tokens != null && total > 0 ? tokens / total : 0

  const cut = cutRange(t, total)
  const cached = cut ? 0 : cachedChars(t, total)

  // Walk the parts in canonical order and split each at the state boundaries.
  const segments: XraySegment[] = []
  let pos = 0
  for (const part of ORDER) {
    const len = chars[part]
    if (len <= 0) continue
    const boundaries = [pos, pos + len]
    for (const b of cut ? [cut.from, cut.to] : [cached]) if (b > pos && b < pos + len) boundaries.push(b)
    boundaries.sort((a, b) => a - b)
    for (let i = 0; i < boundaries.length - 1; i++) {
      const a = boundaries[i]!
      const z = boundaries[i + 1]!
      if (z <= a) continue
      const state: XrayState = cut && a >= cut.from && a < cut.to ? 'cut' : a < cached ? 'cached' : 'recomputed'
      segments.push({ part, state, chars: z - a, tokens: Math.round((z - a) * perChar) })
    }
    pos += len
  }

  const note = noteFor(t, previous, cut, total, perChar)
  return { turn: t, tokens, cachedShare: cacheShare(t), prefillMs: t.prompt.prefillMs, segments, note }
}

function partAt(t: LiveTurn, charPos: number): XrayPart {
  const chars = partChars(t)
  let pos = 0
  for (const part of ORDER) {
    pos += chars[part]
    if (charPos < pos) return part
  }
  return 'message'
}

function noteFor(
  t: LiveTurn,
  previous: LiveTurn | null,
  cut: { from: number; to: number; mode: 'history' | 'start' } | null,
  total: number,
  perChar: number,
): XrayNote | null {
  if (cut && cut.to > cut.from) {
    const chars = partChars(t)
    return {
      kind: 'cut',
      mode: cut.mode,
      lostTokens: truncation(t)?.lost ?? 0,
      context: requestContext(t) ?? 0,
      systemLost: chars.system > 0 && cut.from < chars.system,
      toolsLost: chars.tools > 0 && cut.from < chars.system + chars.tools && cut.to > chars.system,
    }
  }
  if (!previous) return { kind: 'first' }
  if (reloaded(t)) return { kind: 'reloaded', loadMs: t.loadMs ?? 0 }
  if (previous.toolsOffered === 0 && t.toolsOffered > 0) {
    return { kind: 'tools-added', tools: t.toolsOffered, toolTokens: Math.round(t.anatomy.toolsChars * perChar) }
  }
  const share = cacheShare(t)
  if (t.prefix && !t.prefix.identical && share != null && share < 0.5 && total > 0) {
    return {
      kind: 'break',
      part: partAt(t, t.prefix.breakChar),
      breakChar: t.prefix.breakChar,
      breakTokens: t.prefix.breakTokensEst,
      costMs: cacheFixSavingMs(t),
    }
  }
  return null
}

/** Turns grouped by client and model, oldest first: the nearest thing the proxy has to a conversation. */
export function xrayConversations(turns: LiveTurn[]): XrayConversation[] {
  const groups = new Map<string, LiveTurn[]>()
  for (const t of turns) {
    if (t.mode !== 'chat' && t.mode !== 'agent') continue
    const key = `${t.client.id}|${t.model}`
    const arr = groups.get(key)
    if (arr) arr.push(t)
    else groups.set(key, [t])
  }
  const out: XrayConversation[] = []
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.seq - b.seq)
    const xturns: XrayTurn[] = []
    for (let i = 0; i < sorted.length; i++) xturns.push(xrayTurn(sorted[i]!, i > 0 ? sorted[i - 1]! : null))
    const maxTokens = Math.max(1, ...xturns.map((x) => x.tokens ?? x.segments.reduce((n, s) => n + s.tokens, 0)))
    const totals = {
      prefillMs: xturns.reduce((n, x) => n + (x.prefillMs ?? 0), 0),
      avoidableMs: xturns.reduce((n, x) => n + (x.note?.kind === 'break' ? (x.note.costMs ?? 0) : 0), 0),
      cutTurns: xturns.filter((x) => x.note?.kind === 'cut').length,
    }
    out.push({ key, clientLabel: sorted[0]!.client.label, clientId: sorted[0]!.client.id, model: sorted[0]!.model, turns: xturns, maxTokens, totals })
  }
  // Most recent activity first.
  return out.sort((a, b) => b.turns[b.turns.length - 1]!.turn.at - a.turns[a.turns.length - 1]!.turn.at)
}
