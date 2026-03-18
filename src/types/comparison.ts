import type { SessionStatus } from './session'
import type { SessionMetrics } from './metrics'
import type { OllamaOptions } from './ollama'

export interface ComparisonSlot {
  slotId: string
  model: string
  label: string
  system: string
  options: OllamaOptions
  language?: string       // target language code (e.g., 'en', 'fr', 'ar', 'zh')
  promptOverride?: string // per-slot prompt (falls back to shared prompt if not set)
  wasTranslated?: boolean // true only when the model translated this prompt
  detectedLanguage?: string | null // detected language of the prompt text
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
  effectivePrompt?: string // the actual prompt sent to this slot
  language?: string        // language tag from the slot
}
