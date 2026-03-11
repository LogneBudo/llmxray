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
} from '@/types/ollama'

const DEFAULT_BASE_URL = '/api'

class OllamaClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
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
      body: JSON.stringify({ name }),
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
    if (!res.ok) throw new Error(`Generate failed: ${res.statusText}`)
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
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
    if (!res.body) throw new Error('No response body for streaming')
    return res.body
  }

  async generate(req: OllamaGenerateRequest): Promise<OllamaGenerateChunk> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    })
    if (!res.ok) throw new Error(`Generate failed: ${res.statusText}`)
    return res.json() as Promise<OllamaGenerateChunk>
  }

  async chat(req: OllamaChatRequest): Promise<OllamaChatChunk> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    })
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
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
