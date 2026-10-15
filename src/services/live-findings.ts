import type { LiveTurn } from '@/types/live'

/**
 * Plain-sentence findings over the turns seen so far. Each one is backed by a
 * specific turn the page can jump to. Thresholds are deliberately conservative:
 * a finding that fires on one noisy turn is worse than none.
 */
export type LiveFindingKind = 'context' | 'prefix' | 'drop' | 'cpu' | 'tools'

export interface LiveFinding {
  kind: LiveFindingKind
  severity: 'error' | 'warning'
  /** The turn that proves it; the newest in its group. */
  turnId: string
  params: Record<string, string | number>
}

export interface LiveClientSummary {
  clientId: string
  label: string
  modes: string[]
  turns: number
  tokens: number
  toolCalls: number
  prefillMs: number
  /** Prefill time the turns would have skipped had their prompts stayed cached up to the new message. */
  cacheFixSavesMs: number | null
}

const MIN_TURNS = 3
const LOW_CACHE_SHARE = 0.5
const MIN_WASTED_TOKENS = 500
/** A turn's cached share must fall this far below the previous turn's to count as a drop. */
const DROP_POINTS = 0.4
const CPU_SHARE_FLOOR = 0.05
const TOOLS_SHARE_FLOOR = 0.25

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2
}

/** Cached share of a turn's prompt, or null when the daemon did not say. */
export function cacheShare(t: LiveTurn): number | null {
  if (t.prompt.tokens == null || t.prompt.cached == null || t.prompt.tokens <= 0) return null
  return Math.min(t.prompt.cached, t.prompt.tokens) / t.prompt.tokens
}

/** Tokens of the current message, scaled from characters onto the daemon's count. */
export function messageTokensEst(t: LiveTurn): number | null {
  if (t.prompt.tokens == null || t.anatomy.totalChars <= 0) return null
  return Math.round((t.anatomy.messageChars / t.anatomy.totalChars) * t.prompt.tokens)
}

/**
 * Prefill time a turn would have saved if everything but the new message had
 * been served from cache. Linear in the uncached tokens, which prefill is to a
 * good approximation; still an estimate, and labelled as one in the UI.
 */
export function cacheFixSavingMs(t: LiveTurn): number | null {
  // A first turn (or a cold load) has no previous prompt to share a prefix with:
  // nothing about its ordering could have been cached, so it is not a saving.
  if (!t.prefix) return null
  const evaluated = t.prompt.evaluated
  const msgTokens = messageTokensEst(t)
  if (evaluated == null || msgTokens == null || t.prompt.prefillMs == null || evaluated <= 0) return null
  const avoidable = Math.max(0, evaluated - msgTokens)
  return (avoidable / evaluated) * t.prompt.prefillMs
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    const arr = m.get(k)
    if (arr) arr.push(it)
    else m.set(k, [it])
  }
  return m
}

export function computeFindings(turns: LiveTurn[]): LiveFinding[] {
  const findings: LiveFinding[] = []
  const chatTurns = turns.filter((t) => (t.mode === 'chat' || t.mode === 'agent') && !t.error)

  // 0. Requests the daemon refused because the prompt is larger than the loaded
  //    context. One such turn is proof enough; it is deterministic, not noisy.
  for (const [, group] of groupBy(turns.filter((t) => t.contextExceeded), (t) => `${t.client.id}|${t.model}`)) {
    const latest = group[group.length - 1]!
    findings.push({
      kind: 'context',
      severity: 'error',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        model: latest.model,
        tokens: latest.contextExceeded!.promptTokens,
        context: latest.contextExceeded!.contextLength,
        rejected: group.length,
      },
    })
  }

  // 1. A client whose prompts keep breaking the cache early.
  for (const [, group] of groupBy(chatTurns, (t) => `${t.client.id}|${t.model}`)) {
    const measured = group.filter((t) => cacheShare(t) != null && t.prompt.evaluated != null)
    if (measured.length < MIN_TURNS) continue
    const share = median(measured.map((t) => cacheShare(t)!))!
    const wasted = median(measured.map((t) => t.prompt.evaluated!))!
    if (share >= LOW_CACHE_SHARE || wasted < MIN_WASTED_TOKENS) continue
    const latest = measured[measured.length - 1]!
    const breakTokens = median(measured.map((t) => t.prefix?.breakTokensEst ?? NaN))
    const promptTokens = median(measured.map((t) => t.prompt.tokens!))!
    findings.push({
      kind: 'prefix',
      severity: 'error',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        model: latest.model,
        tokens: Math.round(wasted),
        promptTokens: Math.round(promptTokens),
        share: Math.round(share * 100),
        breakTokens: breakTokens == null ? -1 : Math.round(breakTokens),
      },
    })
  }

  // 1b. The one turn where a client that was cached stopped being cached.
  //     Per turn, not a median: a session average hides exactly this turn.
  //     Only the latest drop per client+model is reported, so a client that
  //     breaks every turn is covered by the prefix finding above, not by a
  //     flag on each of them.
  for (const [, group] of groupBy(chatTurns, (t) => `${t.client.id}|${t.model}`)) {
    const measured = group.filter((t) => cacheShare(t) != null && t.prompt.tokens != null)
    let drop: { turn: LiveTurn; from: number; to: number } | null = null
    for (let i = 1; i < measured.length; i++) {
      const prev = cacheShare(measured[i - 1]!)!
      const cur = cacheShare(measured[i]!)!
      const t = measured[i]!
      if (prev >= LOW_CACHE_SHARE && prev - cur >= DROP_POINTS && t.prompt.tokens! >= MIN_WASTED_TOKENS) {
        drop = { turn: t, from: prev, to: cur }
      }
    }
    if (!drop) continue
    const breakTokens = drop.turn.prefix?.breakTokensEst ?? null
    findings.push({
      kind: 'drop',
      severity: 'warning',
      turnId: drop.turn.id,
      params: {
        client: drop.turn.client.label,
        model: drop.turn.model,
        from: Math.round(drop.from * 100),
        to: Math.round(drop.to * 100),
        promptTokens: Math.round(drop.turn.prompt.tokens!),
        breakTokens: breakTokens == null ? -1 : Math.round(breakTokens),
      },
    })
  }

  // 2. A model that no longer fits on the GPU.
  const byModel = groupBy(
    turns.filter((t) => t.fit?.cpuShare != null),
    (t) => t.model,
  )
  for (const [model, group] of byModel) {
    const latest = group[group.length - 1]!
    const cpu = latest.fit!.cpuShare!
    if (cpu < CPU_SHARE_FLOOR) continue
    findings.push({
      kind: 'cpu',
      severity: 'warning',
      turnId: latest.id,
      params: {
        model,
        cpu: Math.round(cpu * 100),
        context: latest.fit!.contextLength ?? -1,
        runner: latest.fit!.runner ?? '',
      },
    })
  }

  // 3. A client whose tool schemas dominate the prompt. Rejected turns count
  //    here too: the schemas are what made the prompt too big.
  const toolTurns = turns.filter((t) => (t.mode === 'chat' || t.mode === 'agent') && t.toolsOffered > 0 && (!t.error || t.contextExceeded))
  for (const [, group] of groupBy(toolTurns, (t) => t.client.id)) {
    const shares = group
      .filter((t) => t.anatomy.totalChars > 0)
      .map((t) => t.anatomy.toolsChars / t.anatomy.totalChars)
    const share = median(shares)
    if (share == null || share < TOOLS_SHARE_FLOOR) continue
    const latest = group[group.length - 1]!
    const used = new Set(group.flatMap((t) => t.toolCalls))
    findings.push({
      kind: 'tools',
      severity: 'warning',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        share: Math.round(share * 100),
        offered: latest.toolsOffered,
        used: used.size,
        turns: group.length,
      },
    })
  }

  return findings
}

export function summariseClients(turns: LiveTurn[]): LiveClientSummary[] {
  const out: LiveClientSummary[] = []
  for (const [clientId, group] of groupBy(turns, (t) => t.client.id)) {
    let tokens = 0
    let toolCalls = 0
    let prefillMs = 0
    let saves = 0
    let savesKnown = false
    const modes = new Set<string>()
    for (const t of group) {
      tokens += (t.prompt.tokens ?? 0) + (t.gen.tokens ?? 0)
      toolCalls += t.toolCalls.length
      prefillMs += t.prompt.prefillMs ?? 0
      modes.add(t.mode)
      const s = cacheFixSavingMs(t)
      if (s != null) {
        saves += s
        savesKnown = true
      }
    }
    out.push({
      clientId,
      label: group[0]!.client.label,
      modes: [...modes],
      turns: group.length,
      tokens,
      toolCalls,
      prefillMs,
      cacheFixSavesMs: savesKnown ? saves : null,
    })
  }
  return out.sort((a, b) => b.turns - a.turns)
}
