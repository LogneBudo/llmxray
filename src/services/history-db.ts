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
