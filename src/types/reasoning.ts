export type ReasoningStepType = 'thought' | 'observation' | 'action' | 'conclusion' | 'reflection'

export interface ReasoningStep {
  id: string
  index: number
  type: ReasoningStepType
  content: string
  startTokenIndex: number
  endTokenIndex: number
  timestamp: number
  durationMs: number
  children?: ReasoningStep[]
}

export interface ReasoningChain {
  sessionId: string
  steps: ReasoningStep[]
  totalSteps: number
  currentDepth: number
}
