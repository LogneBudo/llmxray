export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: OllamaModelDetails
}

export interface OllamaModelDetails {
  parent_model: string
  format: string
  family: string
  families: string[]
  parameter_size: string
  quantization_level: string
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
  modified_at: string
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  system?: string
  template?: string
  context?: number[]
  stream?: boolean
  raw?: boolean
  format?: 'json'
  options?: OllamaOptions
}

export interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  stream?: boolean
  format?: 'json'
  options?: OllamaOptions
  tools?: OllamaToolDefinition[]
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
}

export interface OllamaEmbedRequest {
  model: string
  input: string | string[]
}

export interface OllamaEmbedResponse {
  model: string
  embeddings: number[][]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
}
