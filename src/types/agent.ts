export type AgentNodeType = 'start' | 'llm_call' | 'tool_call' | 'decision' | 'output' | 'error'

export interface AgentNode {
  id: string
  type: AgentNodeType
  label: string
  sessionId: string
  stepIndex: number
  state: Record<string, unknown>
  timestamp: number
  durationMs?: number
  metadata?: Record<string, unknown>
  x?: number
  y?: number
}

export interface AgentEdge {
  id: string
  source: string
  target: string
  label?: string
  stateDiff?: StateDiffEntry[]
}

export interface StateDiffEntry {
  path: string
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'removed' | 'changed'
}

export interface AgentGraph {
  sessionId: string
  nodes: AgentNode[]
  edges: AgentEdge[]
}
