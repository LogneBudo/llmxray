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
  textDir?: string
}

/** Prompt text kept for a turn, only when the user switched it on. */
export interface LiveTurnText {
  request: unknown
  canonical: string
  snippet: { before: string; after: string } | null
}
