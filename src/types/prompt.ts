export type PromptSectionType = 'system' | 'user' | 'context' | 'tools' | 'memory' | 'examples' | 'instructions' | 'unknown'

export interface PromptSection {
  id: string
  type: PromptSectionType
  label: string
  content: string
  startOffset: number
  endOffset: number
  tokenCount: number
  percentage: number
}

export interface PromptAnatomy {
  sessionId: string
  rawPrompt: string
  totalTokenCount: number
  sections: PromptSection[]
  messages?: Array<{
    role: string
    content: string
    tokenCount: number
  }>
}
