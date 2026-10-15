import type { LiveTurn } from '../src/types/live'

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

export function median(values: number[]): number | null
export function cacheShare(t: LiveTurn): number | null
export function messageTokensEst(t: LiveTurn): number | null
export function cacheFixSavingMs(t: LiveTurn): number | null
export function computeFindings(turns: LiveTurn[]): LiveFinding[]
export function summariseClients(turns: LiveTurn[]): LiveClientSummary[]
export function renderFinding(f: LiveFinding): string
