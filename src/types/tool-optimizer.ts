export interface ToolMapping {
  jsonPath: string
  returnKey: string
}

export interface ReturnSchema {
  type: 'object'
  properties: Record<string, { type: string }>
  required: string[]
}
