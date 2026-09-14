/**
 * Anthropic Messages API types — for the /v1/messages endpoint Ollama exposes locally.
 * Verified against Ollama 0.24.0 on 2026-05-24. No cloud, no API key needed when targeting
 * a local Ollama daemon; the same shape works against Anthropic's hosted API too.
 */

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  // tool_use fields
  id?: string
  name?: string
  input?: Record<string, unknown>
  // tool_result fields
  tool_use_id?: string
  content?: string | AnthropicContentBlock[]
}

export interface AnthropicMessagesRequest {
  model: string
  messages: AnthropicMessage[]
  max_tokens: number
  system?: string
  stream?: boolean
  temperature?: number
  top_p?: number
  top_k?: number
  stop_sequences?: string[]
}

export interface AnthropicUsage {
  /**
   * Prompt tokens that were actually evaluated. From Ollama 0.33.3 this is
   * the total MINUS `cache_read_input_tokens`, not the total — verified live
   * against 0.33.3, where an identical prompt reported 38 cold and 1 warm.
   * Sum `input_tokens + cache_read_input_tokens` for the prompt size.
   */
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  /** Prompt tokens served from the KV cache (Ollama 0.33.3+). */
  cache_read_input_tokens?: number
}

export interface AnthropicMessagesResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: AnthropicContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
  stop_sequence: string | null
  usage: AnthropicUsage
}

// ---- Streaming SSE event envelope ----

export type AnthropicStreamEvent =
  | { type: 'message_start'; message: AnthropicMessagesResponse }
  | { type: 'content_block_start'; index: number; content_block: AnthropicContentBlock }
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string } }
  | { type: 'content_block_stop'; index: number }
  // `message_delta` carries the full usage shape, not just output_tokens —
  // on Ollama 0.33.3 it is where the settled input/cache split arrives, while
  // `message_start` reports only a provisional input count.
  | { type: 'message_delta'; delta: { stop_reason: string | null; stop_sequence: string | null }; usage: Partial<AnthropicUsage> & { output_tokens: number } }
  | { type: 'message_stop' }
  | { type: 'ping' }
  | { type: 'error'; error: { type: string; message: string } }

export interface AnthropicErrorResponse {
  type: 'error'
  error: { type: string; message: string }
  request_id?: string
}
