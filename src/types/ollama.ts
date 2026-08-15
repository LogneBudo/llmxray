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
}

/** Capability strings Ollama reports; the list is open-ended, so string is allowed. */
export type OllamaCapability =
  | 'completion'
  | 'tools'
  | 'vision'
  | 'thinking'
  | 'embedding'
  | 'insert'
  | (string & {})

/**
 * The `think` parameter. Ollama accepts a boolean (model default effort) or a
 * named effort level; 'low' | 'medium' | 'high' were added alongside 'max'.
 */
export type OllamaThink = boolean | 'low' | 'medium' | 'high' | 'max'

export interface OllamaModelInfo {
  license: string
  modelfile: string
  parameters: string
  template: string
  details: OllamaModelDetails
  model_info: Record<string, string | number | null>
  tensors?: { count?: number; tensors?: unknown[] }
  capabilities?: string[]
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
  }
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
}

export interface OllamaEmbedRequest {
  model: string
  input: string | string[]
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
