export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: OllamaModelDetails
  /**
   * Reported by /api/tags since Ollama 0.32 — previously only available via
   * /api/show. When present it is authoritative and spares a per-model call.
   */
  capabilities?: OllamaCapability[]
}

export interface OllamaModelDetails {
  parent_model: string
  format: string
  family: string
  families: string[]
  parameter_size: string
  quantization_level: string
  /** Added to /api/tags in Ollama 0.32 — training context window, in tokens. */
  context_length?: number
  /** Added to /api/tags in Ollama 0.32 — embedding vector width. */
  embedding_length?: number
  /**
   * Which runtime serves this model (`ggml`, `llamacpp`, `mlx`), added in
   * Ollama 0.40. A model tag that is a manifest list is reported as one
   * /api/tags row PER child manifest, and `runner` is what tells them apart,
   * so two rows may share a `name`.
   */
  runner?: string
}

/**
 * Capability strings Ollama reports; the list is open-ended, so string is allowed.
 * `decision` (Ollama 0.35.1) marks models that answer on `/v1/systemone` with
 * choices and probabilities instead of text — they report it as their ONLY
 * capability and must not be offered for chat, tools or thinking.
 */
export type OllamaCapability =
  | 'completion'
  | 'tools'
  | 'vision'
  | 'thinking'
  | 'embedding'
  | 'insert'
  | 'audio'
  | 'decision'
  | (string & {})

/**
 * The `think` parameter. Ollama accepts a boolean (model default effort) or a
 * named effort level. 'low' | 'medium' | 'high' | 'max' are the legacy names,
 * validated for models that carry no thinking metadata; since Ollama 0.34.3 a
 * model may advertise its own level names via /api/show (`thinking.values`),
 * and those are passed through as-is.
 */
export type OllamaThink = boolean | 'low' | 'medium' | 'high' | 'max' | (string & {})

/**
 * The thinking controls a model honours, advertised by /api/show since Ollama
 * 0.34.3. Only present for models whose metadata declares them; absent means
 * the daemon said nothing, not that the model cannot think.
 */
export interface OllamaThinkingControls {
  /** Accepted `think` values: booleans for an on/off model, strings for named levels. */
  values: Array<string | boolean>
  /** The value used when `think` is omitted. */
  default?: string | boolean
}

/** One child manifest of a manifest-list model, from /api/show (Ollama 0.40). */
export interface OllamaManifestSummary {
  digest?: string
  runner?: string
  format?: string
  selected?: boolean
}

/**
 * `/api/show` with `all_manifests: true` (Ollama 0.40): one entry per child
 * manifest, each a full show response plus the `runner` that serves it. A
 * plain model answers with a single entry whose `runner` may be absent.
 */
export interface OllamaShowManifestsResponse {
  license?: string
  manifests: Array<Partial<OllamaModelInfo> & { runner?: string; digest?: string }>
}

export interface OllamaModelInfo {
  license: string
  modelfile: string
  parameters: string
  template: string
  details: OllamaModelDetails
  model_info: Record<string, string | number | null>
  tensors?: { count?: number; tensors?: unknown[] }
  capabilities?: string[]
  /** Thinking levels and default, when the model declares them (Ollama 0.34.3+). */
  thinking?: OllamaThinkingControls
  /** Child manifests of a manifest-list model (Ollama 0.40+). */
  manifests?: OllamaManifestSummary[]
  /** Minimum Ollama version the model needs, when the manifest states one. */
  requires?: string
  modified_at: string
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  suffix?: string
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  format?: 'json' | Record<string, unknown>
  options?: OllamaOptions
  think?: OllamaThink
  /** Ask for each token's log probability; streamed back per chunk. */
  logprobs?: boolean
}

export interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  stream?: boolean
  format?: 'json' | Record<string, unknown>
  options?: OllamaOptions
  tools?: OllamaToolDefinition[]
  logprobs?: boolean
  think?: OllamaThink
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  images?: string[]
  tool_calls?: OllamaToolCall[]
}

export interface OllamaToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface OllamaToolCall {
  function: {
    name: string
    arguments: Record<string, unknown>
  }
}

export interface OllamaOptions {
  num_predict?: number
  temperature?: number
  top_p?: number
  top_k?: number
  seed?: number
  num_ctx?: number
  repeat_penalty?: number
  stop?: string[]
  mirostat?: number
  mirostat_eta?: number
  mirostat_tau?: number
  logprobs?: boolean
  top_logprobs?: number
}

export interface OllamaLogprob {
  token: string
  logprob: number
  bytes?: number[]
  top_logprobs?: Array<{ token: string; logprob: number; bytes?: number[] }>
}

export interface OllamaGenerateChunk {
  model: string
  created_at: string
  response: string
  done: boolean
  done_reason?: string
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  /**
   * Prompt tokens served from the KV cache, added in Ollama 0.33.3. The
   * sibling `prompt_eval_duration` covers ONLY the uncached tokens, while
   * `prompt_eval_count` remains the total — so a prefill rate must divide by
   * `prompt_eval_count - prompt_eval_cached_count`, never by the raw count.
   * Omitted by daemons older than 0.33.3 and by runners that do not report it.
   */
  prompt_eval_cached_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  logprobs?: OllamaLogprob[]
}

export interface OllamaChatChunk {
  model: string
  created_at: string
  message: {
    role: 'assistant'
    content: string
    thinking?: string
    tool_calls?: OllamaToolCall[]
  }
  done: boolean
  done_reason?: string
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  /**
   * Prompt tokens served from the KV cache, added in Ollama 0.33.3. The
   * sibling `prompt_eval_duration` covers ONLY the uncached tokens, while
   * `prompt_eval_count` remains the total — so a prefill rate must divide by
   * `prompt_eval_count - prompt_eval_cached_count`, never by the raw count.
   * Omitted by daemons older than 0.33.3 and by runners that do not report it.
   */
  prompt_eval_cached_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  logprobs?: OllamaLogprob[]
}

// OpenAI-compatible types (for /v1/chat/completions — supports logprobs)
export interface OpenAIChatChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
      reasoning?: string  // Ollama extension for thinking models
    }
    finish_reason: string | null
    logprobs?: {
      content: OllamaLogprob[]
    } | null
  }>
  /**
   * Present only on the final chunk, and only when the request sent
   * `stream_options.include_usage`. That chunk carries an EMPTY `choices`
   * array, so read usage before any `choices[0]` guard.
   */
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    /** Cache breakdown of `prompt_tokens`, added in Ollama 0.33.3. */
    prompt_tokens_details?: {
      /** Prompt tokens served from the KV cache. `prompt_tokens` stays the total. */
      cached_tokens?: number
    }
  }
  /**
   * Server-side performance figures, added in Ollama 0.35.1 alongside `usage`.
   * DO NOT use `prompt_per_second` or `prompt_per_token_ms` for prefill
   * throughput: `prompt_n` is the TOTAL prompt (cached tokens included) while
   * `prompt_ms` times only the UNCACHED tokens — the very formula that
   * inflated prefill by the cache hit ratio in 0.33.3. Measured live on
   * 0.40.3: 3875 tok/s reported for a prompt with 30 of 31 tokens cached.
   * The decode half (`predicted_*`) has no such flaw.
   */
  timings?: OpenAITimings
}

/** The `timings` block Ollama's OpenAI-compatible endpoints attach (0.35.1+). */
export interface OpenAITimings {
  prompt_n: number
  prompt_ms: number
  prompt_per_token_ms: number
  prompt_per_second: number
  predicted_n: number
  predicted_ms: number
  predicted_per_token_ms: number
  predicted_per_second: number
}

export interface OllamaRunningModel {
  name: string
  model: string
  size: number
  digest: string
  details: OllamaModelDetails
  expires_at: string
  size_vram: number
  context_length: number
  /** Which runtime loaded the model (`llamacpp`, `mlx`), reported since Ollama 0.40. */
  runner?: string
}

/**
 * One item of a multimodal embedding request (Ollama 0.40+). Each object owns
 * its own media; a batch may mix plain strings with these.
 */
export interface OllamaEmbedInputItem {
  text?: string
  /** Base64-encoded image bytes. */
  image?: string
  /** Base64-encoded audio bytes. */
  audio?: string
}

export interface OllamaEmbedRequest {
  model: string
  input: string | OllamaEmbedInputItem | Array<string | OllamaEmbedInputItem>
  /**
   * Truncate the output vector to this width (Matryoshka embeddings). Only
   * meaningful for models trained for it; Ollama returns the full width otherwise.
   */
  dimensions?: number
  /** Truncate input that exceeds the context window. Ollama defaults to true. */
  truncate?: boolean
}

export interface OllamaEmbedResponse {
  model: string
  embeddings: number[][]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
}
