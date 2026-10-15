/**
 * The shared box: what each tool asked the daemon for, and what that cost the
 * other tools. Pure functions over LiveTurn records.
 *
 * Attribution rules, kept simple enough to state on the page:
 * - A model (re)load on a turn is caused by whoever unloaded it. If the previous
 *   request to the same model asked for keep_alive 0, that tool caused it. If
 *   another model was used in between, the tool that brought that model in
 *   caused it. Otherwise the model sat idle longer than keep_alive: nobody's fault.
 * - Queue wait on a turn is paid to whichever request the daemon was still
 *   serving when this one arrived.
 * - A tool's cost to the others is the sum of what the others paid for its causes.
 *   What a tool costs itself is shown but not counted against it.
 */
import type { LiveTurn } from '@/types/live'
import { reloaded, requestContext } from '@/services/live-findings'

export type Cause = 'keepalive' | 'switch' | 'idle' | 'first'

export interface LedgerEvent {
  at: number
  kind: 'load' | 'wait'
  clientId: string
  clientLabel: string
  model: string
  ms: number
  cause: Cause | null
  /** Who caused it, when it was another tool. */
  byClientId: string | null
  byClientLabel: string | null
}

export interface LedgerRow {
  clientId: string
  clientLabel: string
  requests: number
  models: string[]
  /** keep_alive values this tool sent, most frequent first; empty when it never set one. */
  keepAlive: string[]
  unloadsEveryTime: boolean
  /** Largest context this tool asked for, and the largest prompt it actually sent. */
  maxContext: number | null
  maxPromptTokens: number | null
  /** Reloads and waits this tool caused for OTHER tools, in ms. */
  costToOthersMs: number
  reloadsCausedForOthers: number
  /** What this tool itself paid, in ms. */
  waitedMs: number
  reloadsPaidMs: number
  /** Who this tool waited behind. */
  waitedBehind: { clientId: string; clientLabel: string; ms: number }[]
  /** The one change that would help most, if any. */
  fix: 'keepalive' | 'context' | null
}

export interface SlotChange {
  at: number
  from: number
  to: number
  model: string
  /** The tool whose request first ran with the new count. */
  clientLabel: string
}

export interface Ledger {
  from: number
  to: number
  rows: LedgerRow[]
  events: LedgerEvent[]
  totalCostMs: number
  slots: { max: number | null; min: number | null; changes: SlotChange[] }
}

/** keep_alive as the request sent it, rendered the way a user would write it. */
export function keepAliveText(v: number | string | null | undefined): string | null {
  if (v == null) return null
  if (typeof v === 'number') return v === 0 ? '0' : v < 0 ? 'forever' : `${v}s`
  return String(v)
}

export function unloadsNow(v: number | string | null | undefined): boolean {
  if (v == null) return false
  if (typeof v === 'number') return v === 0
  return /^\s*0+\s*[a-z]*\s*$/i.test(String(v))
}

/** How many requests the daemon could serve at once, read from the figures it reports. */
export function slotsOf(t: LiveTurn): number | null {
  const loaded = t.fit?.contextLength
  const asked = t.prompt.contextRequested
  if (!loaded || !asked || asked <= 0) return null
  return Math.max(1, Math.min(16, Math.round(loaded / asked)))
}

function mostFrequent(values: string[]): string[] {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v)
}

export function buildLedger(turns: LiveTurn[]): Ledger | null {
  const all = [...turns].sort((a, b) => a.seq - b.seq)
  if (!all.length) return null

  const rows = new Map<string, LedgerRow>()
  const rowOf = (t: LiveTurn): LedgerRow => {
    let r = rows.get(t.client.id)
    if (!r) {
      r = {
        clientId: t.client.id, clientLabel: t.client.label, requests: 0, models: [], keepAlive: [], unloadsEveryTime: false,
        maxContext: null, maxPromptTokens: null, costToOthersMs: 0, reloadsCausedForOthers: 0, waitedMs: 0, reloadsPaidMs: 0,
        waitedBehind: [], fix: null,
      }
      rows.set(t.client.id, r)
    }
    return r
  }
  const keepAliveSeen = new Map<string, string[]>()
  const waitedBehind = new Map<string, Map<string, { label: string; ms: number }>>()
  const events: LedgerEvent[] = []
  const lastByModel = new Map<string, LiveTurn>()
  let previous: LiveTurn | null = null

  // Slots over time.
  const slotChanges: SlotChange[] = []
  let slotMax: number | null = null
  let slotMin: number | null = null
  let lastSlots: number | null = null

  for (const t of all) {
    const r = rowOf(t)
    r.requests += 1
    if (!r.models.includes(t.model)) r.models.push(t.model)
    const ka = keepAliveText(t.keepAlive)
    if (ka != null) {
      const arr = keepAliveSeen.get(t.client.id) ?? []
      arr.push(ka)
      keepAliveSeen.set(t.client.id, arr)
    }
    const ctx = requestContext(t)
    if (ctx != null) r.maxContext = Math.max(r.maxContext ?? 0, ctx)
    if (t.prompt.tokens != null) r.maxPromptTokens = Math.max(r.maxPromptTokens ?? 0, t.prompt.tokens)

    // Reload: who unloaded the model?
    if (reloaded(t)) {
      const ms = t.loadMs ?? 0
      const sameModelBefore = lastByModel.get(t.model) ?? null
      let cause: Cause = 'first'
      let by: LiveTurn | null = null
      if (sameModelBefore) {
        if (unloadsNow(sameModelBefore.keepAlive)) {
          cause = 'keepalive'
          by = sameModelBefore
        } else if (previous && previous.model !== t.model) {
          cause = 'switch'
          by = previous
        } else {
          cause = 'idle'
        }
      }
      r.reloadsPaidMs += ms
      const other = by && by.client.id !== t.client.id ? by : null
      if (other) {
        const o = rowOf(other)
        o.costToOthersMs += ms
        o.reloadsCausedForOthers += 1
      }
      events.push({ at: t.at, kind: 'load', clientId: t.client.id, clientLabel: t.client.label, model: t.model, ms, cause, byClientId: other?.client.id ?? null, byClientLabel: other?.client.label ?? null })
    }

    // Queue wait: whose request was the daemon still on?
    if (t.queueMs != null && t.queueMs > 250) {
      const running = [...all].filter((o) => o.id !== t.id && o.at < t.at && o.at + o.durationMs > t.at).sort((a, b) => b.at - a.at)[0] ?? null
      r.waitedMs += t.queueMs
      const other = running && running.client.id !== t.client.id ? running : null
      if (other) {
        rowOf(other).costToOthersMs += t.queueMs
        const m = waitedBehind.get(t.client.id) ?? new Map()
        const e = m.get(other.client.id) ?? { label: other.client.label, ms: 0 }
        e.ms += t.queueMs
        m.set(other.client.id, e)
        waitedBehind.set(t.client.id, m)
      }
      events.push({ at: t.at, kind: 'wait', clientId: t.client.id, clientLabel: t.client.label, model: t.model, ms: t.queueMs, cause: null, byClientId: other?.client.id ?? null, byClientLabel: other?.client.label ?? null })
    }

    // Slots.
    const slots = slotsOf(t)
    if (slots != null) {
      slotMax = Math.max(slotMax ?? slots, slots)
      slotMin = Math.min(slotMin ?? slots, slots)
      if (lastSlots != null && slots !== lastSlots) slotChanges.push({ at: t.at, from: lastSlots, to: slots, model: t.model, clientLabel: t.client.label })
      lastSlots = slots
    }

    lastByModel.set(t.model, t)
    previous = t
  }

  for (const r of rows.values()) {
    const seen = keepAliveSeen.get(r.clientId) ?? []
    r.keepAlive = mostFrequent(seen)
    r.unloadsEveryTime = seen.length > 0 && seen.every((v) => unloadsNow(v))
    r.waitedBehind = [...(waitedBehind.get(r.clientId) ?? new Map()).entries()].map(([clientId, e]) => ({ clientId, clientLabel: e.label, ms: e.ms })).sort((a, b) => b.ms - a.ms)
    if (r.unloadsEveryTime) r.fix = 'keepalive'
    else if (r.maxContext != null && r.maxPromptTokens != null && r.maxContext >= 16_384 && r.maxContext > 4 * r.maxPromptTokens) r.fix = 'context'
  }

  const list = [...rows.values()].sort((a, b) => b.costToOthersMs - a.costToOthersMs || b.requests - a.requests)
  return {
    from: all[0]!.at,
    to: all[all.length - 1]!.at + all[all.length - 1]!.durationMs,
    rows: list,
    events: events.sort((a, b) => a.at - b.at),
    totalCostMs: list.reduce((n, r) => n + r.costToOthersMs, 0),
    slots: { max: slotMax, min: slotMin, changes: slotChanges },
  }
}
