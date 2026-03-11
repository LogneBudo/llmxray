import type { SessionStatus } from './session'
import type { SessionMetrics } from './metrics'
import type { OllamaOptions } from './ollama'

export interface ComparisonSlot {
  slotId: string
  model: string
  label: string
  system: string
  options: OllamaOptions
}

export interface ComparisonRun {
  id: string
  prompt: string
  slots: ComparisonSlot[]
  createdAt: number
  status: 'running' | 'completed' | 'partial'
  executions: ComparisonExecution[]
}

export interface ComparisonExecution {
  slotId: string
  model: string
  label: string
  sessionId: string
  status: SessionStatus
  outputText: string
  metrics: SessionMetrics | null
}
