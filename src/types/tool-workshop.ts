import type { OllamaToolDefinition } from './ollama'
import type { ToolMapping, ReturnSchema } from './tool-optimizer'
import type { ProbeConfig } from './tool-canvas'

// --- Canvas Metadata (persisted with tool) ---

export interface CanvasMeta {
  mappings?: ToolMapping[]
  probeConfig?: ProbeConfig
  returnSchema?: ReturnSchema
  position?: { x: number; y: number }
}

// --- Action Block Types ---

export type BlockType = 'http_request' | 'extract_field' | 'template' | 'return_value'

export interface ToolActionBlock {
  id: string
  type: BlockType
  label: string
  config: HttpRequestConfig | ExtractFieldConfig | TemplateConfig | ReturnValueConfig
  order: number
}

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers: Record<string, string>
  body: string
  outputVariable: string
}

export interface ExtractFieldConfig {
  input: string
  fieldPath: string
  outputVariable: string
}

export interface TemplateConfig {
  template: string
  outputVariable: string
}

export interface ReturnValueConfig {
  expression: string
}

// --- Tool Implementation ---

export interface ToolImplementation {
  mode: 'visual' | 'code'
  blocks: ToolActionBlock[]
  code: string
}

// --- Workshop Tool ---

export type ToolCategory = 'api' | 'data' | 'utility' | 'custom' | 'google'

export interface ToolTestResult {
  success: boolean
  output: unknown
  error?: string
  durationMs: number
}

export interface OptimizedFromMeta {
  originalToolName: string
  selectedPaths: string[]
  sampleResponse: unknown
}

export interface WorkshopTool {
  id: string
  definition: OllamaToolDefinition
  implementation: ToolImplementation
  enabled: boolean
  category: ToolCategory
  createdAt: number
  updatedAt: number
  lastTestedAt: number | null
  testResult: ToolTestResult | null
  optimizedFrom?: OptimizedFromMeta
  canvasMeta?: CanvasMeta
}

// --- Tool Execution ---

export interface ToolExecutionResult {
  success: boolean
  result: unknown
  durationMs: number
  error?: string
}

// --- Block Defaults ---

export function createDefaultBlock(type: BlockType): ToolActionBlock {
  const base = { id: '', type, label: '', order: 0 }
  switch (type) {
    case 'http_request':
      return { ...base, label: 'HTTP Request', config: { method: 'GET', url: '', headers: {}, body: '', outputVariable: 'response' } as HttpRequestConfig }
    case 'extract_field':
      return { ...base, label: 'Extract Field', config: { input: 'response', fieldPath: '', outputVariable: 'value' } as ExtractFieldConfig }
    case 'template':
      return { ...base, label: 'Format Text', config: { template: '', outputVariable: 'text' } as TemplateConfig }
    case 'return_value':
      return { ...base, label: 'Return Value', config: { expression: '' } as ReturnValueConfig }
  }
}

export function createEmptyImplementation(): ToolImplementation {
  return { mode: 'code', blocks: [], code: '' }
}
