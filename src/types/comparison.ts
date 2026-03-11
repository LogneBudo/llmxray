import type { SessionStatus } from './session'
import type { SessionMetrics } from './metrics'

export interface ComparisonRun {
  id: string
  prompt: string
  models: string[]
  createdAt: number
  status: 'running' | 'completed' | 'partial'
  executions: ComparisonExecution[]
}

export interface ComparisonExecution {
  model: string
  sessionId: string
  status: SessionStatus
  outputText: string
  metrics: SessionMetrics | null
}
