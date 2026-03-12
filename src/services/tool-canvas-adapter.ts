/**
 * Conversion layer between WorkshopTool (Pinia store) and ToolBlockData (canvas nodes).
 */

import type { WorkshopTool } from '@/types/tool-workshop'
import type { ToolBlockData, ToolParam } from '@/types/tool-canvas'
import type { OllamaToolDefinition } from '@/types/ollama'

/**
 * Convert a WorkshopTool from the store into a ToolBlockData for canvas rendering.
 */
export function workshopToolToBlock(tool: WorkshopTool): ToolBlockData {
  const fn = tool.definition.function

  // Convert JSON Schema properties → ToolParam[]
  const parameters: ToolParam[] = []
  const props = fn.parameters?.properties ?? {}

  for (const [name, schema] of Object.entries(props)) {
    const param: ToolParam = {
      name,
      type: jsonSchemaTypeToTs(schema.type),
      description: schema.description,
    }
    if (schema.enum) {
      param.enumValues = schema.enum
    }
    parameters.push(param)
  }

  return {
    uid: tool.id,
    name: fn.name,
    description: fn.description,
    parameters,
    body: tool.implementation.code || '{\n  // TODO\n}',
    mappings: tool.canvasMeta?.mappings,
    probeConfig: tool.canvasMeta?.probeConfig,
    returnSchema: tool.canvasMeta?.returnSchema,
  }
}

/**
 * Convert canvas block edits back into a partial WorkshopTool update.
 */
export function blockToWorkshopToolPatch(
  block: ToolBlockData,
  original: WorkshopTool,
): Partial<WorkshopTool> {
  // Rebuild definition from block
  const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {}
  const required: string[] = []

  for (const p of block.parameters) {
    if (p.members && p.members.length > 0) {
      // Expand inline object type members
      for (const m of p.members) {
        const prop: { type: string; description?: string; enum?: string[] } = {
          type: tsTypeToJsonSchema(m.type),
        }
        if (m.description) prop.description = m.description
        if (m.enumValues) prop.enum = m.enumValues
        properties[m.name] = prop
        required.push(m.name)
      }
    } else {
      const prop: { type: string; description?: string; enum?: string[] } = {
        type: tsTypeToJsonSchema(p.type),
      }
      if (p.description) prop.description = p.description
      if (p.enumValues) prop.enum = p.enumValues
      properties[p.name] = prop
      required.push(p.name)
    }
  }

  const definition: OllamaToolDefinition = {
    type: 'function',
    function: {
      name: block.name,
      description: block.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  }

  const implementation = {
    ...original.implementation,
    code: block.body,
  }

  const canvasMeta = {
    ...original.canvasMeta,
    mappings: block.mappings,
    probeConfig: block.probeConfig,
    returnSchema: block.returnSchema,
  }

  return { definition, implementation, canvasMeta }
}

function jsonSchemaTypeToTs(type?: string): string {
  if (!type) return 'any'
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'any[]'
    case 'object':
      return 'object'
    default:
      return 'any'
  }
}

function tsTypeToJsonSchema(tsType: string): string {
  const lower = tsType.toLowerCase()
  if (lower === 'number' || lower === 'integer') return 'number'
  if (lower === 'boolean') return 'boolean'
  if (lower.endsWith('[]')) return 'array'
  if (lower === 'object') return 'object'
  return 'string'
}
