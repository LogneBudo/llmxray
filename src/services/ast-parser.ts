/**
 * AST-based TS/JS code <-> Tool Block parser using recast + @babel/parser.
 *
 * Each "block" = one exported async function = one LLM tool.
 * Bi-directional: parse source into ToolBlockData[], and generate source back.
 */

import * as recast from 'recast'
import { parse as babelParse } from '@babel/parser'
import type { ToolBlockData, ToolParam, LlmToolSchema } from '@/types/tool-canvas'

// ---------------------------------------------------------------------------
// UID generation — short stable IDs for block tracking
// ---------------------------------------------------------------------------

let uidCounter = 0
export function generateUid(): string {
  uidCounter++
  const rand = Math.random().toString(36).slice(2, 6)
  return `t${uidCounter}_${rand}`
}

// ---------------------------------------------------------------------------
// Code -> Blocks
// ---------------------------------------------------------------------------

export interface ParseResult {
  tools: ToolBlockData[]
  warnings: string[]
}

/**
 * Parse a TS/JS source string and extract all exported functions as tool blocks.
 * Non-function exports or unparseable code generate warnings but don't crash.
 */
export function parseCodeToTools(code: string): ParseResult {
  const tools: ToolBlockData[] = []
  const warnings: string[] = []

  if (!code.trim()) return { tools, warnings }

  let ast: any
  try {
    ast = recast.parse(code, {
      parser: {
        parse(source: string) {
          return babelParse(source, {
            sourceType: 'module',
            plugins: ['typescript'],
            allowAwaitOutsideFunction: true,
            tokens: true,
          })
        },
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    warnings.push(`Parse error: ${msg}`)
    return { tools, warnings }
  }

  const body = ast.program?.body ?? []

  for (const node of body) {
    // Handle: export async function toolName(params) { ... }
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const decl = node.declaration
      if (decl.type === 'FunctionDeclaration') {
        tools.push(extractFunctionBlock(decl, node))
        continue
      }
    }

    // Handle: async function toolName(params) { ... }  (non-exported)
    if (node.type === 'FunctionDeclaration') {
      tools.push(extractFunctionBlock(node))
      continue
    }

    // Handle: export const toolName = async (params) => { ... }
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      const varDecl = node.declaration.declarations[0]
      if (
        varDecl?.init?.type === 'ArrowFunctionExpression' ||
        varDecl?.init?.type === 'FunctionExpression'
      ) {
        tools.push(extractArrowOrExprBlock(varDecl, node))
        continue
      }
    }

    // Handle: const toolName = async (params) => { ... }
    if (node.type === 'VariableDeclaration') {
      const varDecl = node.declarations[0]
      if (
        varDecl?.init?.type === 'ArrowFunctionExpression' ||
        varDecl?.init?.type === 'FunctionExpression'
      ) {
        tools.push(extractArrowOrExprBlock(varDecl))
        continue
      }
    }

    // Anything else: warn but don't crash
    const src = recast.print(node).code
    if (src.trim()) {
      warnings.push(`Skipped non-tool code: ${src.slice(0, 80)}${src.length > 80 ? '...' : ''}`)
    }
  }

  return { tools, warnings }
}

/** `commentHolder` is the node the JSDoc is attached to: the `export` wrapper when there is one. */
function extractFunctionBlock(decl: any, commentHolder: any = decl): ToolBlockData {
  const name = decl.id?.name ?? 'unnamed'
  const parameters = flattenArgsObject(extractParams(decl.params))
  const body = blockStatements(decl.body)
  const { description, uid } = extractCommentAndUid(commentHolder.leadingComments?.length ? commentHolder : decl, name)

  return { uid, name, description, parameters, body }
}

function extractArrowOrExprBlock(varDecl: any, commentHolder: any = varDecl): ToolBlockData {
  const name = varDecl.id?.name ?? 'unnamed'
  const fn = varDecl.init
  const parameters = flattenArgsObject(extractParams(fn.params))
  const body =
    fn.body.type === 'BlockStatement'
      ? blockStatements(fn.body)
      : `return ${recast.print(fn.body).code}`
  const { description, uid } = extractCommentAndUid(commentHolder.leadingComments?.length ? commentHolder : varDecl, name)

  return { uid, name, description, parameters, body }
}

/**
 * The statements inside a function body, without the surrounding braces and
 * with the function's indentation removed. This is the shape the tool
 * executor runs (`new AsyncFunction('args', ..., body)`) and the shape the
 * canvas node edits, so it is the only shape a block ever stores.
 */
function blockStatements(blockNode: any): string {
  const printed = recast.print(blockNode).code.trim()
  const inner = printed.startsWith('{') && printed.endsWith('}') ? printed.slice(1, -1) : printed
  const lines = inner.replace(/^\n+|\s+$/g, '').split('\n')
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length)
  const common = indents.length ? Math.min(...indents) : 0
  return lines.map((l) => l.slice(Math.min(common, l.match(/^\s*/)![0].length))).join('\n')
}

/**
 * A tool written as `name(args: { a: string, b: number })` has two parameters,
 * a and b, not one parameter called args. The generated source uses that
 * signature because the body reads `args.a`, so the parser accepts it back.
 */
function flattenArgsObject(params: ToolParam[]): ToolParam[] {
  if (params.length === 1 && params[0]!.members && params[0]!.members.length > 0) {
    return params[0]!.members
  }
  return params
}

function extractParams(params: any[]): ToolParam[] {
  return params.map((p: any) => {
    let paramName = 'unknown'
    let paramType = 'any'
    let typeNode: any = null

    if (p.type === 'Identifier') {
      paramName = p.name
      typeNode = p.typeAnnotation?.typeAnnotation
      if (typeNode) paramType = resolveTypeName(typeNode)
    } else if (p.type === 'AssignmentPattern' && p.left?.type === 'Identifier') {
      paramName = p.left.name
      typeNode = p.left.typeAnnotation?.typeAnnotation
      if (typeNode) paramType = resolveTypeName(typeNode)
    } else if (p.type === 'ObjectPattern') {
      paramName = 'params'
      typeNode = p.typeAnnotation?.typeAnnotation
      if (typeNode) paramType = resolveTypeName(typeNode)
    }

    const result: ToolParam = { name: paramName, type: paramType }

    // Extract inline object type members for schema generation
    if (typeNode?.type === 'TSTypeLiteral') {
      result.members = extractTypeLiteralMembers(typeNode)
    }

    // Extract string literal union enum values
    if (typeNode?.type === 'TSUnionType') {
      const enumVals = extractEnumValues(typeNode)
      if (enumVals) result.enumValues = enumVals
    }

    return result
  })
}

/** Extract members from an inline object type: { text: string, count: number } */
function extractTypeLiteralMembers(typeNode: any): ToolParam[] {
  if (!typeNode.members) return []
  return typeNode.members
    .filter((m: any) => m.type === 'TSPropertySignature')
    .map((m: any) => {
      const name = m.key?.name ?? m.key?.value ?? 'unknown'
      const memberTypeNode = m.typeAnnotation?.typeAnnotation
      const type = resolveTypeName(memberTypeNode)
      const param: ToolParam = { name, type }

      if (memberTypeNode?.type === 'TSTypeLiteral') {
        param.members = extractTypeLiteralMembers(memberTypeNode)
      }

      if (memberTypeNode?.type === 'TSUnionType') {
        const enumVals = extractEnumValues(memberTypeNode)
        if (enumVals) param.enumValues = enumVals
      }

      return param
    })
}

/** Extract enum values from a union of string literals: "a" | "b" | "c" -> ["a", "b", "c"] */
function extractEnumValues(unionNode: any): string[] | undefined {
  const types = unionNode.types ?? []
  const allLiterals = types.every(
    (t: any) => t.type === 'TSLiteralType' && typeof t.literal?.value === 'string',
  )
  if (!allLiterals || types.length === 0) return undefined
  return types.map((t: any) => t.literal.value as string)
}

function resolveTypeName(typeNode: any): string {
  if (!typeNode) return 'any'
  switch (typeNode.type) {
    case 'TSStringKeyword':
      return 'string'
    case 'TSNumberKeyword':
      return 'number'
    case 'TSBooleanKeyword':
      return 'boolean'
    case 'TSAnyKeyword':
      return 'any'
    case 'TSObjectKeyword':
      return 'object'
    case 'TSTypeLiteral':
      return 'object'
    case 'TSTypeReference':
      return typeNode.typeName?.name ?? 'any'
    case 'TSArrayType':
      return `${resolveTypeName(typeNode.elementType)}[]`
    case 'TSUnionType': {
      const enumVals = extractEnumValues(typeNode)
      if (enumVals) return 'string'
      return typeNode.types?.map((t: any) => resolveTypeName(t)).join(' | ') ?? 'any'
    }
    case 'TSLiteralType': {
      const v = typeNode.literal?.value
      return typeof v === 'string' ? 'string' : typeof v === 'number' ? 'number' : 'any'
    }
    default:
      return 'any'
  }
}

/**
 * Extract description and @id from leading JSDoc comment.
 * Format: /** Description text @id abc123 *​/
 * If no @id found, generates a new UID.
 */
function extractCommentAndUid(
  node: any,
  fallbackName: string,
): { description: string; uid: string } {
  const comments = node.leadingComments
  if (!comments || comments.length === 0) {
    return { description: `Tool: ${fallbackName}`, uid: generateUid() }
  }

  const last = comments[comments.length - 1]
  let text = last.value?.trim() ?? ''

  // Clean up JSDoc-style comment markers
  text = text
    .replace(/^\*+\s*/gm, '')
    .replace(/\s*\*+$/gm, '')
    .replace(/^\/\*+\s*/, '')
    .replace(/\s*\*+\/$/, '')
    .trim()

  // Extract @id tag
  const idMatch = text.match(/@id\s+(\S+)/)
  const uid = idMatch ? idMatch[1]! : generateUid()

  // Strip @id from description
  const description = text.replace(/@id\s+\S+/, '').trim() || `Tool: ${fallbackName}`

  return { description, uid }
}

// ---------------------------------------------------------------------------
// Blocks -> Code
// ---------------------------------------------------------------------------

/**
 * Generate TS source code from an array of tool blocks.
 * Each block becomes an exported async function.
 */
export function toolsToCode(tools: ToolBlockData[]): string {
  return tools
    .map((tool) => {
      // The body reads its inputs as `args.<name>`, so the signature says so.
      const members = tool.parameters.map((p) => `${p.name}: ${paramTsType(p)}`).join('; ')
      const params = tool.parameters.length > 0 ? `args: { ${members} }` : ''

      const descText =
        tool.description && tool.description !== `Tool: ${tool.name}` ? tool.description : ''
      const idTag = tool.uid ? ` @id ${tool.uid}` : ''
      const comment = descText || idTag ? `/** ${descText}${idTag} */\n` : ''

      return `${comment}export async function ${tool.name}(${params}) {\n${indentStatements(tool.body)}\n}`
    })
    .join('\n\n')
}

/** The TS type a parameter is declared with; enums become a string-literal union. */
function paramTsType(p: ToolParam): string {
  if (p.enumValues && p.enumValues.length > 0) {
    return p.enumValues.map((v) => JSON.stringify(v)).join(' | ')
  }
  return p.type && p.type !== 'any' ? p.type : 'string'
}

/** Function-body statements indented one level, whether stored bare or still wrapped in braces. */
function indentStatements(body: string): string {
  const trimmed = body.trim()
  const bare = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1).trim() : trimmed
  if (!bare) return '  // TODO'
  return bare
    .split('\n')
    .map((l) => (l.trim() ? `  ${l}` : ''))
    .join('\n')
}

// ---------------------------------------------------------------------------
// Schema generation (Ollama / OpenAI compatible)
// ---------------------------------------------------------------------------

/** Map TS type strings to JSON Schema types */
function tsTypeToJsonSchema(tsType: string): string {
  const lower = tsType.toLowerCase()
  if (lower === 'number' || lower === 'integer') return 'number'
  if (lower === 'boolean') return 'boolean'
  if (lower.endsWith('[]')) return 'array'
  if (lower === 'object') return 'object'
  return 'string'
}

/** Convert a ToolParam to a JSON schema property */
function paramToSchemaProperty(p: ToolParam): {
  type: string
  description?: string
  enum?: string[]
} {
  const prop: { type: string; description?: string; enum?: string[] } = {
    type: tsTypeToJsonSchema(p.type),
  }
  if (p.description) prop.description = p.description
  if (p.enumValues) prop.enum = p.enumValues
  return prop
}

/**
 * Generate an OpenAI-compatible tools manifest from tool blocks.
 * Inline object params are expanded into top-level properties.
 */
export function generateToolSchemas(tools: ToolBlockData[]): LlmToolSchema[] {
  return tools.map((tool) => {
    const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {}
    const required: string[] = []

    for (const p of tool.parameters) {
      if (p.members && p.members.length > 0) {
        for (const m of p.members) {
          properties[m.name] = paramToSchemaProperty(m)
          required.push(m.name)
        }
      } else {
        properties[p.name] = paramToSchemaProperty(p)
        required.push(p.name)
      }
    }

    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties,
          required,
        },
        ...(tool.returnSchema ? { returns: tool.returnSchema } : {}),
      },
    }
  })
}
