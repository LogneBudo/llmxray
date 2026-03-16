export type AiPhase = 'draft' | 'insights' | 'automap' | 'fix'

export interface AiDraft {
  toolId: string
  phase: AiPhase
  code: string
  explanation: string
  loading: boolean
  error?: string
  trainingPairId?: string
  intentText?: string
}

export interface AiInsight {
  severity: 'info' | 'warning' | 'error'
  title: string
  description: string
  suggestedCode?: string
}

export interface AiInsightsResult {
  toolId: string
  insights: AiInsight[]
  codeHash: string
}

export interface AiAutoMapSuggestion {
  toolId: string
  paths: string[]
  reasoning: string
}

export interface AiTrainingPair {
  id: string
  timestamp: number
  phase: AiPhase
  model: string
  systemPrompt: string
  userPrompt: string
  response: string
  accepted: boolean
  toolName: string
  tags?: string[]
}
