/** A run of one prompt against the daemon, with what the KV cache gave back. */
export interface CacheProbe {
  /** Human label for the variant this probe measured. */
  label: string
  /** The prompt text that was sent (system message body). */
  text: string
  /** Total prompt tokens, cached ones included — Ollama keeps this the total. */
  promptTokens: number
  /**
   * Prompt tokens served from the KV cache. Undefined when the daemon does not
   * report `prompt_eval_cached_count` (before Ollama 0.33.3) — which is not the
   * same as zero, and the UI must not present it as such.
   */
  cachedTokens?: number
  /** Prompt tokens the model actually had to evaluate. */
  evaluatedTokens: number
  /** Time spent evaluating the uncached tokens, in ms. */
  prefillMs: number
  /** Cached share of the prompt, 0..1. Undefined when unreported. */
  reuse?: number
}

/** A span of text that changes between runs and so breaks cache reuse. */
export interface VolatileSegment {
  kind: 'timestamp' | 'date' | 'time' | 'uuid' | 'number'
  text: string
  /** Character offsets into the prompt. */
  start: number
  end: number
}

export interface CacheLabRun {
  model: string
  startedAt: number
  probes: CacheProbe[]
  /** Populated when the hoist experiment ran: baseline vs volatile-moved-to-end. */
  verdict?: CacheLabVerdict
}

export interface CacheLabVerdict {
  /** Tokens the rewrite saved from being re-evaluated each turn. */
  tokensSaved: number
  /** Prefill milliseconds saved each turn. */
  msSaved: number
  /** Speed-up factor on prefill, e.g. 3.5 for 3.5x. */
  speedup: number
}

export type CacheLabStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
