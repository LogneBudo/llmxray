import type { OllamaChatMessage, OllamaOptions } from './ollama'
import type { SessionMetrics } from './metrics'

export type SessionStatus = 'idle' | 'streaming' | 'completed' | 'error' | 'cancelled'
export type SessionMode = 'generate' | 'chat'

export interface Session {
  id: string
  mode: SessionMode
  model: string
  status: SessionStatus
  createdAt: number
  prompt: string
  messages: OllamaChatMessage[]
  options: OllamaOptions
  outputText: string
  metrics: SessionMetrics | null
  error?: string
  doneReason?: string
}
