import Dexie, { type Table } from 'dexie'

/**
 * A unified research log entry. Every experiment in LLMxRay
 * (benchmark, comparison, chat, training) gets an entry here.
 * Existing data stores keep working — this is an append-only overlay.
 */
export interface HistoryEntry {
  id?: number
  type: 'benchmark' | 'comparison' | 'chat' | 'training' | 'session'
  timestamp: number
  model: string
  language?: string
  tags: string[]

  // Common metrics
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  ttftMs?: number
  tokensPerSecond?: number
  durationMs?: number

  // Benchmark
  benchmarkSuites?: string[]
  accuracy?: number
  correctCount?: number
  totalQuestions?: number

  // Comparison
  languages?: string[]
  tokenTaxRatio?: number
  slotCount?: number

  // Chat
  conversationId?: string
  messageCount?: number

  // Training
  phase?: string
  accepted?: boolean

  // Drill-down reference
  sourceId: string
  sourceDb: string

  // Human-readable summary for search
  summary: string
}

class HistoryDatabase extends Dexie {
  entries!: Table<HistoryEntry>

  constructor() {
    super('llmxray-history')
    this.version(1).stores({
      entries: '++id, type, timestamp, model, language, accuracy, tokenTaxRatio, *tags, [type+model], [type+timestamp]',
    })
  }
}

export const historyDB = new HistoryDatabase()

export const RETENTION_KEY = 'llmxray-history-retention'
export type Retention = 'forever' | '30d' | '90d' | '1y'

/** The oldest timestamp a setting keeps, or null for keep everything. */
export function retentionCutoff(retention: string | null | undefined, now = Date.now()): number | null {
  const day = 86_400_000
  switch (retention) {
    case '30d':
      return now - 30 * day
    case '90d':
      return now - 90 * day
    case '1y':
      return now - 365 * day
    default:
      return null
  }
}

/** Delete entries older than the retention setting. Returns how many went. */
export async function pruneHistory(retention?: string | null, now = Date.now()): Promise<number> {
  let setting = retention
  if (setting === undefined) {
    try {
      setting = localStorage.getItem(RETENTION_KEY)
    } catch {
      setting = null
    }
  }
  const cutoff = retentionCutoff(setting, now)
  if (cutoff == null) return 0
  return historyDB.entries.where('timestamp').below(cutoff).delete()
}
