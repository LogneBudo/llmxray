import type { LiveTurn } from '../src/types/live'

export type LiveFindingKind = 'context' | 'truncated' | 'prefix' | 'drop' | 'cpu' | 'tools'

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
  /**
   * Prefill time the turns would have skipped had their prompts stayed cached up to the new
   * message. An ESTIMATE: the message size is scaled from characters onto the daemon's token
   * count and prefill is taken as linear in the uncached tokens. Label it as such wherever shown.
   */
  cacheFixSavesMs: number | null
}

/** Where the 0.40.6 under-report is tracked. */
export const UNDER_REPORT_ISSUE: string
/** True when Ollama's loaded footprint is under half the model's file: impossible, so not to be drawn. */
export function underReportedMemory(reportedBytes: number | null | undefined, fileBytes: number | null | undefined): boolean
export function median(values: number[]): number | null
/** True when the daemon (re)loaded the model for this turn; such a turn proves nothing about the prompt. */
export function reloaded(t: LiveTurn): boolean
/** The context one request can use: its own num_ctx, else the loaded figure (which is num_ctx times the parallel slots). */
export function requestContext(t: LiveTurn): number | null
/** How the daemon cut a prompt that did not fit: the oldest messages ('history') or the start ('start'). */
export function truncation(t: LiveTurn): { mode: 'history' | 'start'; lost: number } | null
/** True when the daemon cut the prompt silently, either way. */
export function silentlyTruncated(t: LiveTurn): boolean
/** Tokens a prompt most likely had, from its characters (about 3.5 per token plus template overhead). An estimate. */
export function estimateTokens(t: LiveTurn): number
export function cacheShare(t: LiveTurn): number | null
export function messageTokensEst(t: LiveTurn): number | null
export function cacheFixSavingMs(t: LiveTurn): number | null
export function computeFindings(turns: LiveTurn[]): LiveFinding[]
export function summariseClients(turns: LiveTurn[]): LiveClientSummary[]
export function renderFinding(f: LiveFinding): string
