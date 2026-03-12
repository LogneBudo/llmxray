import type { ToolActionBlock, HttpRequestConfig, ExtractFieldConfig, TemplateConfig, ReturnValueConfig } from '@/types/tool-workshop'
import { nanoid } from 'nanoid'

export interface CodeToBlocksResult {
  blocks: ToolActionBlock[]
  warnings: string[]
  canConvert: boolean
}

/**
 * Attempt to convert tool implementation code into visual blocks.
 * This is heuristic — it handles common patterns (fetch + return, simple expressions)
 * and returns canConvert: false for complex code (loops, conditionals, multiple fetches, etc.).
 */
export function parseCodeToBlocks(code: string): CodeToBlocksResult {
  const trimmed = code.trim()
  if (!trimmed) {
    return { blocks: [], warnings: [], canConvert: true }
  }

  // --- Phase 1: Check for incompatible patterns ---
  const incompatible = detectIncompatiblePatterns(trimmed)
  if (incompatible.length > 0) {
    return { blocks: [], warnings: incompatible, canConvert: false }
  }

  // --- Phase 2: Parse statements into blocks ---
  const blocks: ToolActionBlock[] = []
  const warnings: string[] = []
  const state: ParserState = { tokenVar: null, httpOutputVar: null }

  // Normalize: join lines, split by statement boundaries
  const statements = extractStatements(trimmed)

  for (const stmt of statements) {
    const s = stmt.trim()
    if (!s || s.startsWith('//')) continue

    if (tryParseGoogleToken(s, state)) continue
    if (tryParseFetch(s, state, blocks)) continue
    if (tryParseJsonText(s, state, blocks)) continue
    if (tryParseFieldAccess(s, state, blocks)) continue
    if (tryParseTemplateLiteral(s, blocks)) continue
    if (tryParseReturn(s, blocks, warnings)) continue

    // Unrecognized statement
    warnings.push(`Skipped statement: ${s.length > 60 ? s.slice(0, 60) + '...' : s}`)
  }

  // Assign order and IDs
  blocks.forEach((b, i) => {
    b.id = nanoid()
    b.order = i
  })

  if (blocks.length === 0) {
    warnings.push('No recognizable patterns found in code')
  }

  return { blocks, warnings, canConvert: blocks.length > 0 }
}

// --- Types ---

interface ParserState {
  tokenVar: string | null
  httpOutputVar: string | null
}

// --- Phase 1: Incompatible pattern detection ---

function detectIncompatiblePatterns(code: string): string[] {
  const issues: string[] = []

  // Count fetch calls
  const fetchCount = (code.match(/\bfetch\s*\(/g) || []).length
  if (fetchCount > 1) {
    issues.push('Code contains multiple fetch() calls — visual blocks support only one HTTP request')
  }

  // Loops
  if (/\bfor\s*\(/.test(code) || /\bwhile\s*\(/.test(code)) {
    issues.push('Code contains loops (for/while) which cannot be represented as visual blocks')
  }
  if (/\.forEach\s*\(/.test(code) || /\.map\s*\(/.test(code) || /\.filter\s*\(/.test(code) || /\.reduce\s*\(/.test(code)) {
    issues.push('Code contains array methods (.map/.forEach/.filter/.reduce) which cannot be represented as visual blocks')
  }

  // Conditionals
  if (/\bif\s*\(/.test(code) || /\bswitch\s*\(/.test(code)) {
    issues.push('Code contains conditional logic (if/switch) which cannot be represented as visual blocks')
  }

  // Dynamic code generation
  if (/\bnew\s+Function\s*\(/.test(code) || /\bDOMParser\b/.test(code) || /\beval\s*\(/.test(code)) {
    issues.push('Code contains dynamic code generation which cannot be represented as visual blocks')
  }

  // Error handling
  if (/\bthrow\s/.test(code)) {
    issues.push('Code contains throw statements which cannot be represented as visual blocks')
  }
  if (/\btry\s*\{/.test(code) || /\bcatch\s*\(/.test(code)) {
    issues.push('Code contains try/catch which cannot be represented as visual blocks')
  }

  return issues
}

// --- Statement extraction ---

function extractStatements(code: string): string[] {
  // Split by newlines, but rejoin lines that are clearly continuations
  // (e.g., multiline fetch calls, object literals)
  const lines = code.split('\n')
  const statements: string[] = []
  let current = ''
  let braceDepth = 0
  let parenDepth = 0

  for (const line of lines) {
    const trimLine = line.trim()
    if (!trimLine) continue

    current += (current ? '\n' : '') + trimLine

    // Track brace/paren depth
    for (const ch of trimLine) {
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth--
      if (ch === '(') parenDepth++
      if (ch === ')') parenDepth--
    }

    // Statement is complete when both depths are 0
    if (braceDepth <= 0 && parenDepth <= 0) {
      statements.push(current)
      current = ''
      braceDepth = 0
      parenDepth = 0
    }
  }

  // Flush remaining
  if (current.trim()) {
    statements.push(current)
  }

  return statements
}

// --- Pattern matchers ---

function tryParseGoogleToken(stmt: string, state: ParserState): boolean {
  const m = stmt.match(/const\s+(\w+)\s*=\s*await\s+getGoogleToken\s*\(\)/)
  if (!m) return false
  state.tokenVar = m[1]!
  return true
}

function tryParseFetch(stmt: string, state: ParserState, blocks: ToolActionBlock[]): boolean {
  // Match: const X = await fetch(url) or const X = await fetch(url, { ... })
  const m = stmt.match(/const\s+(\w+)\s*=\s*await\s+fetch\s*\(/)
  if (!m) return false

  const varName = m[1]!
  state.httpOutputVar = varName

  // Extract URL — everything between fetch( and the first , or )
  const afterFetch = stmt.slice(stmt.indexOf('fetch(') + 6)
  const urlExpr = extractFirstArg(afterFetch)
  const url = convertUrlExpression(urlExpr)

  // Extract method
  const methodMatch = stmt.match(/method\s*:\s*['"](\w+)['"]/)
  const method = (methodMatch?.[1]?.toUpperCase() || 'GET') as HttpRequestConfig['method']

  // Extract headers
  const headers: Record<string, string> = {}
  const headersMatch = stmt.match(/headers\s*:\s*\{([^}]*)\}/)
  if (headersMatch) {
    const headerContent = headersMatch[1]!
    const headerPairs = headerContent.match(/['"]?(\w[\w-]*)['"]?\s*:\s*([^,}]+)/g)
    if (headerPairs) {
      for (const pair of headerPairs) {
        const kv = pair.match(/['"]?(\w[\w-]*)['"]?\s*:\s*(.+)/)
        if (kv) {
          const key = kv[1]!.trim()
          let val = kv[2]!.trim()
          // Convert token variable references
          if (state.tokenVar && val.includes(state.tokenVar)) {
            val = val.replace(new RegExp(`['"]Bearer\\s*['"]\\s*\\+\\s*${state.tokenVar}`), 'Bearer {{google_token}}')
            val = val.replace(new RegExp(`\\$\\{${state.tokenVar}\\}`), '{{google_token}}')
            if (val.includes(state.tokenVar)) val = `Bearer {{google_token}}`
          }
          // Clean up quotes
          val = val.replace(/^['"]|['"]$/g, '').trim()
          if (val) headers[key] = val
        }
      }
    }
  }

  // Extract body
  const bodyMatch = stmt.match(/body\s*:\s*(.+?)(?:,\s*\w+\s*:|}\s*\))/)
  let body = ''
  if (bodyMatch) {
    body = bodyMatch[1]!.trim()
    // Simplify JSON.stringify(...) to the inner expression
    const jsonMatch = body.match(/JSON\.stringify\((.+)\)/)
    if (jsonMatch) body = jsonMatch[1]!.trim()
  }

  const config: HttpRequestConfig = {
    method,
    url,
    headers,
    body,
    outputVariable: varName,
  }

  blocks.push({
    id: '',
    type: 'http_request',
    label: `HTTP ${method} Request`,
    config,
    order: 0,
  })

  return true
}

function tryParseJsonText(stmt: string, state: ParserState, blocks: ToolActionBlock[]): boolean {
  const m = stmt.match(/const\s+(\w+)\s*=\s*await\s+(\w+)\.(json|text)\s*\(\)/)
  if (!m) return false

  const newVar = m[1]!
  const sourceVar = m[2]!

  // If source matches the http_request output, just rename it
  // (the block executor auto-parses JSON responses)
  const httpBlock = blocks.find(b => b.type === 'http_request' && (b.config as HttpRequestConfig).outputVariable === sourceVar)
  if (httpBlock) {
    (httpBlock.config as HttpRequestConfig).outputVariable = newVar
    state.httpOutputVar = newVar
  }

  return true
}

function tryParseFieldAccess(stmt: string, _state: ParserState, blocks: ToolActionBlock[]): boolean {
  // Match: const X = Y.a.b.c (but not await, not function calls)
  const m = stmt.match(/^const\s+(\w+)\s*=\s*(\w+)((?:\.\w+)+)\s*$/)
  if (!m) return false

  const outVar = m[1]!
  const sourceVar = m[2]!
  const fieldPath = m[3]!.slice(1) // remove leading dot

  const config: ExtractFieldConfig = {
    input: sourceVar,
    fieldPath,
    outputVariable: outVar,
  }

  blocks.push({
    id: '',
    type: 'extract_field',
    label: 'Extract Field',
    config,
    order: 0,
  })

  return true
}

function tryParseTemplateLiteral(stmt: string, blocks: ToolActionBlock[]): boolean {
  const m = stmt.match(/^const\s+(\w+)\s*=\s*`([^`]+)`\s*$/)
  if (!m) return false

  const outVar = m[1]!
  let template = m[2]!

  // Convert ${expr} to {{expr}} — only simple variable references
  template = template.replace(/\$\{(\w+(?:\.\w+)*)\}/g, '{{$1}}')
  // Convert ${args.X} to {{X}}
  template = template.replace(/\{\{args\.(\w+)\}\}/g, '{{$1}}')

  const config: TemplateConfig = {
    template,
    outputVariable: outVar,
  }

  blocks.push({
    id: '',
    type: 'template',
    label: 'Format Text',
    config,
    order: 0,
  })

  return true
}

function tryParseReturn(stmt: string, blocks: ToolActionBlock[], warnings: string[]): boolean {
  const m = stmt.match(/^return\s+(.+)$/s)
  if (!m) return false

  let expression = m[1]!.trim()

  // Convert args.X to {{X}} in simple cases
  expression = expression.replace(/\bargs\.(\w+)\b/g, '{{$1}}')

  // Warn about complex expressions
  if (expression.includes('(') || expression.includes('[') || expression.includes('{')) {
    warnings.push('Return expression contains complex logic — it may not evaluate correctly in visual mode')
  }

  const config: ReturnValueConfig = { expression }

  blocks.push({
    id: '',
    type: 'return_value',
    label: 'Return Value',
    config,
    order: 0,
  })

  return true
}

// --- Helpers ---

/**
 * Extract the first argument from a function call string (handles nested parens).
 */
function extractFirstArg(str: string): string {
  let depth = 0
  let result = ''
  for (const ch of str) {
    if (ch === '(') depth++
    if (ch === ')') {
      if (depth === 0) break
      depth--
    }
    if (ch === ',' && depth === 0) break
    result += ch
  }
  return result.trim()
}

/**
 * Convert a JS URL expression to block interpolation format.
 * Examples:
 *   args.url → {{url}}
 *   'https://api.com/' + args.query → https://api.com/{{query}}
 *   `https://api.com/${args.q}` → https://api.com/{{q}}
 */
function convertUrlExpression(expr: string): string {
  let url = expr.trim()

  // Handle template literal
  if (url.startsWith('`') && url.endsWith('`')) {
    url = url.slice(1, -1)
    url = url.replace(/\$\{args\.(\w+)\}/g, '{{$1}}')
    url = url.replace(/\$\{(\w+)\}/g, '{{$1}}')
    return url
  }

  // Handle simple args.X
  if (url.match(/^args\.(\w+)$/)) {
    return `{{${url.replace('args.', '')}}}`
  }

  // Handle string concatenation: 'literal' + args.X + 'literal' + ...
  url = url
    .replace(/['"]\s*\+\s*args\.(\w+)\s*\+\s*['"]/g, '{{$1}}')
    .replace(/['"]\s*\+\s*args\.(\w+)/g, '{{$1}}')
    .replace(/args\.(\w+)\s*\+\s*['"]/g, '{{$1}}')
    .replace(/\bargs\.(\w+)\b/g, '{{$1}}')

  // Handle string concatenation with non-args variables
  url = url
    .replace(/['"]\s*\+\s*(\w+)\s*\+\s*['"]/g, '{{$1}}')
    .replace(/['"]\s*\+\s*(\w+)/g, '{{$1}}')
    .replace(/(\w+)\s*\+\s*['"]/g, '{{$1}}')

  // Clean up remaining quotes
  url = url.replace(/^['"]|['"]$/g, '')

  return url
}
