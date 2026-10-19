/**
 * One model turn seen on the observe port. Mirrors the record built in
 * server/observe.mjs; numbers come from the daemon's own final chunk, never
 * from an estimate, except where a field says `Est`.
 */
export interface LiveClient {
  id: string
  label: string
  userAgent: string
}

export type LiveMode = 'agent' | 'chat' | 'completion' | 'embedding'

export type LiveProtocol =
  | 'ollama-chat'
  | 'ollama-generate'
  | 'ollama-embed'
  | 'openai-chat'
  | 'openai-completions'
  | 'openai-embeddings'
  | 'anthropic-messages'

export interface LivePrefixBreak {
  /** Character offset in the canonical prompt where this turn stopped matching the previous one. */
  breakChar: number
  /** 0..1 share of the prompt that was still identical. */
  breakShare: number
  /** The break scaled onto the daemon's token count. Null when the daemon reported no count. */
  breakTokensEst: number | null
  identical: boolean
}

export interface LiveFit {
  contextLength: number | null
  size: number
  sizeVram: number
  /** Share of the loaded model that sits in system RAM instead of VRAM, 0..1. */
  cpuShare: number | null
  runner: string | null
}

export interface LiveTurn {
  id: string
  seq: number
  at: number
  durationMs: number
  path: string
  protocol: LiveProtocol
  mode: LiveMode
  client: LiveClient
  model: string
  stream: boolean
  /** What the request asked the daemon to do with the model afterwards: seconds, a duration string, 0 to unload, -1 to keep. */
  keepAlive?: number | string | null
  /** The daemon's own total for this request (load + prompt + generation), when it said. */
  totalMs?: number | null
  /** Time the request spent waiting before the daemon worked on it. An estimate: our wall time minus the daemon's. */
  queueMs?: number | null
  status: number
  error: string | null
  /** Set when the daemon rejected the request because the prompt was larger than the loaded context. */
  contextExceeded: { promptTokens: number; contextLength: number } | null
  /** Time the daemon spent loading the model for this turn, when it said. A reload explains an empty cache. */
  loadMs?: number | null
  prompt: {
    tokens: number | null
    cached: number | null
    evaluated: number | null
    prefillMs: number | null
    /** Uncached tokens per second: the real prefill rate. */
    prefillTps: number | null
    contextRequested: number | null
  }
  gen: {
    tokens: number | null
    ms: number | null
    tps: number | null
    doneReason: string | null
  }
  toolCalls: string[]
  toolsOffered: number
  toolNames: string[]
  anatomy: {
    systemChars: number
    toolsChars: number
    historyChars: number
    messageChars: number
    totalChars: number
    messages: number
  }
  prefix: LivePrefixBreak | null
  fit: LiveFit | null
  textKept: boolean
}

export interface LiveStatus {
  keepText: boolean
  port: number
  host: string
  listening: boolean
  /** Why the port is not open, when it is not. */
  error?: string | null
  ollamaUrl: string
  startedAt: number
  turns: number
  /** Where turn records, and kept text, are written. */
  textDir?: string
  /** Days a record or kept prompt stays on disk before it is deleted. */
  retentionDays?: number
  /** Turns put back from disk when the server started. */
  restored?: number
}

/** The OpenTelemetry export as the server reports it. Header values never come back, only names. */
export interface LiveExport {
  address: string
  headerNames: string[]
  includeText: boolean
  enabled: boolean
  /** Where the settings came from: the Live page (file), OTEL_* variables (env), or nowhere yet. */
  source: 'file' | 'env' | 'none'
  url: string | null
  state: 'off' | 'sending' | 'failing'
  sent: number
  runs: number
  failed: number
  lastSentAt: number | null
  lastError: string | null
}

export interface LiveExportTest {
  ok: boolean
  url?: string
  error?: string
}

/** What the model answered, joined from the stream: kept only when Keep text is on. */
export interface LiveAnswer {
  content: string
  thinking: string | null
  toolCalls: Array<{ name: string; arguments: unknown }>
}

/** Prompt text kept for a turn, only when the user switched it on. */
export interface LiveTurnText {
  request: unknown
  canonical: string
  snippet: { before: string; after: string } | null
  /** Missing on text kept before LiveTurnText carried answers. */
  answer?: LiveAnswer | null
}
