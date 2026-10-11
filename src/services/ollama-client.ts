import type {
  OllamaModel,
  OllamaModelInfo,
  OllamaRunningModel,
  OllamaGenerateRequest,
  OllamaChatRequest,
  OllamaGenerateChunk,
  OllamaChatChunk,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
  OllamaShowManifestsResponse,
} from '@/types/ollama'
import type { DecisionRequest, DecisionResponse } from '@/types/decision'

const DEFAULT_BASE_URL = '/api'

class OllamaClient {
  private baseUrl: string
  private openaiBaseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL
    this.openaiBaseUrl = this.deriveOpenaiBaseUrl(this.baseUrl)
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
    this.openaiBaseUrl = this.deriveOpenaiBaseUrl(url)
  }

  private deriveOpenaiBaseUrl(baseUrl: string): string {
    if (baseUrl === '/api') return '/v1'
    return baseUrl.replace(/\/api\/?$/, '/v1')
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/tags`)
    if (!res.ok) throw new Error(`Failed to list models: ${res.statusText}`)
    const data = await res.json() as { models: OllamaModel[] }
    return data.models
  }

  async showModel(name: string): Promise<OllamaModelInfo> {
    const res = await fetch(`${this.baseUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `model` is the documented field; `name` is the legacy alias, kept so
      // the call still resolves on older Ollama builds.
      body: JSON.stringify({ model: name, name }),
    })
    if (!res.ok) throw new Error(`Failed to show model: ${res.statusText}`)
    return res.json() as Promise<OllamaModelInfo>
  }

  async streamGenerate(
    req: OllamaGenerateRequest,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Generate failed: ${res.statusText}`)
    }
    if (!res.body) throw new Error('No response body for streaming')
    return res.body
  }

  async streamChat(
    req: OllamaChatRequest,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Chat failed: ${res.statusText}`)
    }
    if (!res.body) throw new Error('No response body for streaming')
    return res.body
  }

  /**
   * Stream chat via the OpenAI-compatible endpoint (/v1/chat/completions).
   * Returns real token logprobs — used by the benchmark runner.
   *
   * Ollama 0.32.6 aligned this endpoint with OpenAI's wire format: the final
   * `usage` totals are now only emitted when the request opts in via
   * `stream_options.include_usage`. Without it no chunk carries usage at all,
   * so we always ask for it — token counts and tokens/sec depend on it.
   */
  async streamChatOpenAI(
    params: {
      model: string
      messages: Array<{ role: string; content: string }>
      max_tokens?: number
      temperature?: number
      logprobs?: boolean
      top_logprobs?: number
      num_ctx?: number
      reasoning_effort?: 'low' | 'medium' | 'high'
      response_format?: { type: 'json_object' } | { type: 'json_schema'; json_schema: { name: string; schema: Record<string, unknown>; strict?: boolean } }
    },
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `OpenAI chat failed: ${res.statusText}`)
    }
    if (!res.body) throw new Error('No response body for streaming')
    return res.body
  }

  async generate(req: OllamaGenerateRequest): Promise<OllamaGenerateChunk> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Generate failed: ${res.statusText}`)
    }
    return res.json() as Promise<OllamaGenerateChunk>
  }

  async chat(req: OllamaChatRequest, signal?: AbortSignal): Promise<OllamaChatChunk> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Chat failed: ${res.statusText}`)
    }
    return res.json() as Promise<OllamaChatChunk>
  }

  async pullModel(
    name: string,
    onProgress?: (status: string, completed?: number, total?: number) => void,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
    })
    if (!res.ok) throw new Error(`Pull failed: ${res.statusText}`)
    if (!res.body) throw new Error('No response body for pull stream')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const chunk = JSON.parse(line) as { status: string; completed?: number; total?: number }
          onProgress?.(chunk.status, chunk.completed, chunk.total)
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async version(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/version`)
    if (!res.ok) throw new Error(`Failed to get version: ${res.statusText}`)
    const data = (await res.json()) as { version: string }
    return data.version
  }

  async ps(): Promise<OllamaRunningModel[]> {
    const res = await fetch(`${this.baseUrl}/ps`)
    if (!res.ok) throw new Error(`Failed to get running models: ${res.statusText}`)
    const data = (await res.json()) as { models: OllamaRunningModel[] }
    return data.models ?? []
  }

  /**
   * Every child manifest behind a model tag (Ollama 0.40 manifest lists). A
   * model upgraded in the background by 0.40.2 keeps its original `ggml`
   * manifest next to the new `llamacpp` one; the old one is the backup.
   */
  async showManifests(name: string): Promise<OllamaShowManifestsResponse> {
    const res = await fetch(`${this.baseUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, all_manifests: true }),
    })
    if (!res.ok) throw new Error(`Failed to show manifests: ${res.statusText}`)
    return res.json() as Promise<OllamaShowManifestsResponse>
  }

  /**
   * Delete a model by tag, or a single manifest by its digest — which is what
   * `ollama rm <digest>` does, and how Ollama's own notes remove the backups
   * kept by 0.40.2 upgrades. `model` is the documented field; `name` is the
   * legacy alias, kept for older daemons.
   */
  async deleteModel(nameOrDigest: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: nameOrDigest, name: nameOrDigest }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(detail || `Delete failed: ${res.statusText}`)
    }
  }

  /**
   * Ask a decision model (Ollama 0.35.1, `/v1/systemone`) one or more questions
   * about a state. Returns choices, probabilities and scores rather than text;
   * never streams. A model without the `decision` capability answers 400.
   */
  async decide(req: DecisionRequest, signal?: AbortSignal): Promise<DecisionResponse> {
    const res = await fetch(`${this.openaiBaseUrl}/systemone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      let message = detail || `Decision failed: ${res.statusText}`
      try {
        const parsed = JSON.parse(detail) as { error?: string }
        if (parsed.error) message = parsed.error
      } catch {
        // plain-text error body
      }
      throw new Error(message)
    }
    return res.json() as Promise<DecisionResponse>
  }

  async embed(req: OllamaEmbedRequest): Promise<OllamaEmbedResponse> {
    const res = await fetch(`${this.baseUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`Embed failed: ${res.statusText}`)
    return res.json() as Promise<OllamaEmbedResponse>
  }
}

export const ollamaClient = new OllamaClient()
