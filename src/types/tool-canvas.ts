import type { ToolMapping, ReturnSchema } from './tool-optimizer'

/** A single parameter of an LLM tool function */
export interface ToolParam {
  name: string
  type: string // TS type as string, e.g. 'string', 'number', 'any'
  description?: string
  members?: ToolParam[] // For inline object types: { text: string, ... }
  enumValues?: string[] // For string literal unions: "a" | "b" | "c"
}

/** Probe configuration stored on a block for re-probing */
export interface ProbeConfig {
  url: string
  method: string
  headers: Record<string, string>
  secretHeaders?: string[] // Header keys whose values are secrets
}

/** Data for one visual tool block — maps to one exported async function */
export interface ToolBlockData {
  uid: string // Stable ID — survives renames, used to match UI blocks to code
  name: string
  description: string
  parameters: ToolParam[]
  body: string // The function body as raw TS/JS source
  mappings?: ToolMapping[]
  probeConfig?: ProbeConfig
  returnSchema?: ReturnSchema
}

/** OpenAI-compatible tool schema for Ollama/LM Studio */
export interface LlmToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, { type: string; description?: string; enum?: string[] }>
      required: string[]
    }
    returns?: ReturnSchema
  }
}

export type { ToolMapping, ReturnSchema }
