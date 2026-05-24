import type {
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  AnthropicStreamEvent,
} from '@/types/anthropic'

/**
 * Anthropic Messages API client.
 *
 * Targets Ollama's local /v1/messages endpoint by default (no cloud, no API key).
 * Verified live against Ollama 0.24.0 — returns canonical Anthropic envelopes
 * including request_id in errors.
 *
 * The Vite dev server proxies /v1 to localhost:11434, so a relative '/v1' baseUrl works.
 */
const DEFAULT_BASE_URL = '/v1'

class AnthropicClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  async messages(req: AnthropicMessagesRequest, signal?: AbortSignal): Promise<AnthropicMessagesResponse> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Anthropic messages failed: ${res.statusText}`)
    }
    return res.json() as Promise<AnthropicMessagesResponse>
  }

  async streamMessages(
    req: AnthropicMessagesRequest,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Anthropic stream failed: ${res.statusText}`)
    }
    if (!res.body) throw new Error('No response body for streaming')
    return res.body
  }
}

export const anthropicClient = new AnthropicClient()

/**
 * Parse the Anthropic SSE event format. Each event has both an `event:` line and a
 * `data:` line — we only need the parsed `data:` JSON, since each data payload
 * already carries a `type` discriminator.
 */
export async function readAnthropicSSE(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AnthropicStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data) as AnthropicStreamEvent
          onEvent(parsed)
        } catch {
          // skip malformed
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
