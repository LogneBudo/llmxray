import { nanoid } from 'nanoid'
import { ollamaClient } from './ollama-client'
import { canvasAiDB } from './canvas-ai-db'
import type { AiPhase, AiInsight, AiTrainingPair } from '@/types/canvas-ai'
import type { ToolParam } from '@/types/tool-canvas'
import type { OllamaChatMessage } from '@/types/ollama'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function buildIdentityPrompt(): string {
  return `You are a code generator for LLMxRay, a local LLM observatory.
You generate the BODY of an \`async function(args)\` that runs in a browser environment (Vite/Vue app).

Available in scope:
- \`args\` — typed parameter object (described per-tool)
- \`fetch()\` — standard browser fetch
- \`getGoogleToken()\` — returns a Bearer token for Google OAuth2 APIs

Coding standards (MUST follow):
- Always wrap logic in try/catch with descriptive error messages: throw new Error('Failed to fetch X: ' + e.message)
- Use \`await fetch(url, options)\` — never XMLHttpRequest, axios, or other patterns
- Always set a timeout: \`signal: AbortSignal.timeout(10000)\`
- Return structured data (object or array), never raw strings
- Never use \`import\` or \`require\` — all dependencies are pre-available
- Prefer \`const\` over \`let\`; never use \`var\`
- Use template literals for URL construction

Forbidden:
- console.log (throw for errors instead)
- Hardcoded API keys or secrets
- eval(), document.write()

Output ONLY the function body (no function signature, no wrapping).`
}

function serializeToolContext(
  toolName: string,
  description: string,
  parameters: ToolParam[],
): string {
  const paramLines = parameters.map(
    (p) => `  - ${p.name}: ${p.type}${p.description ? ` — ${p.description}` : ''}`,
  )
  return [
    `Tool name: ${toolName}`,
    `Description: ${description}`,
    paramLines.length > 0 ? `Parameters (via args object):\n${paramLines.join('\n')}` : 'No parameters.',
  ].join('\n')
}

function summarizeProbeResponse(data: unknown, maxBytes = 2048): string {
  const full = JSON.stringify(data, null, 2)
  if (full.length <= maxBytes) return full
  return full.slice(0, maxBytes) + '\n... (truncated)'
}

function probeResponseToSchema(data: unknown, depth = 0, maxDepth = 4): string {
  if (depth >= maxDepth) return '"..."'
  if (data === null) return 'null'
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return `[${probeResponseToSchema(data[0], depth + 1, maxDepth)}]`
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).slice(0, 20)
    const lines = entries.map(
      ([k, v]) => `  "${'  '.repeat(depth)}${k}": ${inferType(v, depth + 1, maxDepth)}`,
    )
    return `{\n${lines.join(',\n')}\n}`
  }
  return `"${typeof data}"`
}

function inferType(value: unknown, depth: number, maxDepth: number): string {
  if (value === null) return '"null"'
  if (Array.isArray(value)) {
    if (value.length === 0) return '"array"'
    return `[${inferType(value[0], depth + 1, maxDepth)}]`
  }
  if (typeof value === 'object') {
    if (depth >= maxDepth) return '"{object}"'
    return probeResponseToSchema(value, depth, maxDepth)
  }
  return `"${typeof value}"`
}

function extractJsonFromResponse(text: string): unknown {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()

  // Try direct parse
  try {
    return JSON.parse(stripped)
  } catch { /* continue */ }

  // Try extracting first JSON object
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch { /* continue */ }
  }

  return null
}

/** Clean up AI-suggested code: unescape literals, strip function wrappers, normalize whitespace */
function cleanSuggestedCode(raw: string): string {
  let code = raw

  // Unescape literal \n \t sequences that the model returned as strings
  code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t')

  // Strip markdown code fences
  code = code.replace(/^```(?:typescript|javascript|ts|js)?\s*\n?/gm, '').replace(/```\s*$/gm, '')

  // Strip function wrapper (async function name(...) { ... })
  const fnMatch = code.match(/^(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\n?([\s\S]*)\}\s*$/)
  if (fnMatch) {
    code = fnMatch[1]!
    // Remove one level of indentation
    const lines = code.split('\n')
    const indent = lines.find((l) => l.trim())?.match(/^(\s+)/)?.[1]?.length ?? 0
    if (indent > 0) {
      code = lines.map((l) => l.startsWith(' '.repeat(indent)) ? l.slice(indent) : l).join('\n')
    }
  }

  return code.trim()
}

function stripImports(code: string): string {
  return code
    .split('\n')
    .filter((line) => !line.match(/^\s*(import|require)\b/))
    .join('\n')
}

async function saveTrainingPair(
  phase: AiPhase,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  response: string,
  toolName: string,
): Promise<string> {
  const pair: AiTrainingPair = {
    id: nanoid(),
    timestamp: Date.now(),
    phase,
    model,
    systemPrompt,
    userPrompt,
    response,
    accepted: false,
    toolName,
  }
  await canvasAiDB.savePair(pair)
  return pair.id
}

// ---------------------------------------------------------------------------
// Export 1 — Generate Draft
// ---------------------------------------------------------------------------

export interface GenerateDraftParams {
  model: string
  toolName: string
  description: string
  parameters: ToolParam[]
  probeResponseSample?: unknown
  intent: string
  signal?: AbortSignal
}

export interface GenerateDraftResult {
  code: string
  explanation: string
  trainingPairId: string
  error?: string
}

export async function generateDraft(
  params: GenerateDraftParams,
): Promise<GenerateDraftResult> {
  const systemPrompt =
    buildIdentityPrompt() +
    '\n\nRespond with JSON: {"code": "<function body>", "explanation": "<brief explanation>"}'

  const userParts = [
    `Intent: ${params.intent}`,
    '',
    serializeToolContext(params.toolName, params.description, params.parameters),
  ]

  if (params.probeResponseSample) {
    userParts.push(
      '',
      'API response structure:',
      probeResponseToSchema(params.probeResponseSample),
      '',
      'Sample (truncated):',
      summarizeProbeResponse(params.probeResponseSample),
    )
  }

  const userPrompt = userParts.join('\n')

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    const res = await ollamaClient.chat({
      model: params.model,
      messages,
      format: 'json',
      stream: false,
    })

    const parsed = extractJsonFromResponse(res.message.content) as {
      code?: string
      explanation?: string
    } | null

    const trainingPairId = await saveTrainingPair(
      'draft',
      params.model,
      systemPrompt,
      userPrompt,
      res.message.content,
      params.toolName,
    )

    if (!parsed || !parsed.code) {
      return {
        code: '',
        explanation: '',
        trainingPairId,
        error: 'AI could not generate a valid response',
      }
    }

    return {
      code: stripImports(parsed.code),
      explanation: parsed.explanation ?? '',
      trainingPairId,
    }
  } catch (e) {
    return {
      code: '',
      explanation: '',
      trainingPairId: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Export 2 — Analyze Tool Code
// ---------------------------------------------------------------------------

export interface AnalyzeToolCodeParams {
  model: string
  toolName: string
  code: string
  parameters: ToolParam[]
  signal?: AbortSignal
}

export interface AnalyzeToolCodeResult {
  insights: AiInsight[]
  trainingPairId: string
  error?: string
}

export async function analyzeToolCode(
  params: AnalyzeToolCodeParams,
): Promise<AnalyzeToolCodeResult> {
  const systemPrompt =
    buildIdentityPrompt() +
    '\n\nYou are a precise code reviewer. Analyze the tool code below and report ONLY issues you can directly verify in the code.' +
    '\n\nRULES:' +
    '\n- ONLY report an issue if you can point to a specific line or pattern in the code that proves it.' +
    '\n- Do NOT guess or assume. If the code does not contain fetch() calls, do NOT flag "no timeout on fetch".' +
    '\n- If the code does not contain URLs, do NOT flag "hardcoded URL".' +
    '\n- If the code does not contain API keys/tokens/secrets, do NOT flag "secret leaks".' +
    '\n- If all declared parameters are used in the code, do NOT flag "unused parameters".' +
    '\n- If the code already has try/catch, do NOT flag "missing try/catch".' +
    '\n- If you find zero issues, return {"insights": []}.' +
    '\n- When providing suggestedCode, include the COMPLETE function body (all lines), not just the changed part. Do NOT wrap it in a function declaration — just the body code that goes inside the function.' +
    '\n\nRespond with JSON: {"insights": [{"severity": "info|warning|error", "title": "<short>", "description": "<explain what specific code causes this issue>", "suggestedCode": "<complete fixed function body>"}]}'

  const paramNames = params.parameters.map((p) => p.name)
  const userPrompt = [
    serializeToolContext(params.toolName, '', params.parameters),
    '',
    `Declared parameters: ${paramNames.length > 0 ? paramNames.join(', ') : '(none)'}`,
    '',
    'Current code:',
    '```',
    params.code,
    '```',
  ].join('\n')

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    const res = await ollamaClient.chat({
      model: params.model,
      messages,
      format: 'json',
      stream: false,
    })

    const parsed = extractJsonFromResponse(res.message.content) as {
      insights?: AiInsight[]
    } | null

    const trainingPairId = await saveTrainingPair(
      'insights',
      params.model,
      systemPrompt,
      userPrompt,
      res.message.content,
      params.toolName,
    )

    if (!parsed || !Array.isArray(parsed.insights)) {
      return { insights: [], trainingPairId, error: 'AI could not generate a valid response' }
    }

    // Clean up suggested code from each insight
    for (const insight of parsed.insights) {
      if (insight.suggestedCode) {
        insight.suggestedCode = cleanSuggestedCode(insight.suggestedCode)
      }
    }

    // Post-filter: remove hallucinated insights that don't match the actual code
    const code = params.code.toLowerCase()
    const validInsights = parsed.insights.filter((insight) => {
      const title = insight.title.toLowerCase()
      // Don't flag fetch issues if no fetch() in code
      if ((title.includes('fetch') || title.includes('timeout')) && !code.includes('fetch(') && !code.includes('fetch (')) return false
      // Don't flag URL issues if no URL-like string in code
      if (title.includes('url') && !code.includes('http://') && !code.includes('https://') && !code.includes('://')) return false
      // Don't flag secret/key issues if no obvious patterns
      if ((title.includes('secret') || title.includes('key') || title.includes('leak')) && !code.includes('key') && !code.includes('token') && !code.includes('secret') && !code.includes('password') && !code.includes('api_')) return false
      // Don't flag unused parameters if parameters are referenced
      if (title.includes('unused param')) {
        const allUsed = paramNames.every((p) => code.includes(p.toLowerCase()))
        if (allUsed) return false
      }
      // Don't flag missing try/catch if already present
      if (title.includes('try') && title.includes('catch') && code.includes('try') && code.includes('catch')) return false
      return true
    })

    return { insights: validInsights, trainingPairId }
  } catch (e) {
    return {
      insights: [],
      trainingPairId: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Export 3 — Suggest Mappings
// ---------------------------------------------------------------------------

export interface SuggestMappingsParams {
  model: string
  toolName: string
  description: string
  probeResponseSample: unknown
  signal?: AbortSignal
}

export interface SuggestMappingsResult {
  paths: string[]
  reasoning: string
  trainingPairId: string
  error?: string
}

export async function suggestMappings(
  params: SuggestMappingsParams,
): Promise<SuggestMappingsResult> {
  const systemPrompt =
    buildIdentityPrompt() +
    '\n\nGiven an API response structure and the tool\'s purpose, suggest the most relevant JSON dot-paths to extract.\n' +
    'Respond with JSON: {"paths": ["path.to.field", ...], "reasoning": "<why these fields>"}'

  const userPrompt = [
    `Tool: ${params.toolName}`,
    `Purpose: ${params.description}`,
    '',
    'API response structure (keys + types):',
    probeResponseToSchema(params.probeResponseSample),
  ].join('\n')

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    const res = await ollamaClient.chat({
      model: params.model,
      messages,
      format: 'json',
      stream: false,
    })

    const parsed = extractJsonFromResponse(res.message.content) as {
      paths?: string[]
      reasoning?: string
    } | null

    const trainingPairId = await saveTrainingPair(
      'automap',
      params.model,
      systemPrompt,
      userPrompt,
      res.message.content,
      params.toolName,
    )

    if (!parsed || !Array.isArray(parsed.paths)) {
      return { paths: [], reasoning: '', trainingPairId, error: 'AI could not generate a valid response' }
    }

    return {
      paths: parsed.paths,
      reasoning: parsed.reasoning ?? '',
      trainingPairId,
    }
  } catch (e) {
    return {
      paths: [],
      reasoning: '',
      trainingPairId: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Export 4 — Generate Fix
// ---------------------------------------------------------------------------

export interface GenerateFixParams {
  model: string
  toolName: string
  code: string
  parameters: ToolParam[]
  error: string
  arguments: Record<string, unknown>
  originalIntent?: string
  signal?: AbortSignal
}

export interface GenerateFixResult {
  fixedCode: string
  explanation: string
  trainingPairId: string
  error?: string
}

export async function generateFix(
  params: GenerateFixParams,
): Promise<GenerateFixResult> {
  const systemPrompt =
    buildIdentityPrompt() +
    '\n\nThe tool failed during execution. Fix the code while preserving the original intent.\n' +
    'Respond with JSON: {"fixedCode": "<corrected function body>", "explanation": "<what was wrong and what you fixed>"}'

  const userParts = [
    serializeToolContext(params.toolName, '', params.parameters),
  ]

  if (params.originalIntent) {
    userParts.push('', `Original intent: ${params.originalIntent}`)
  }

  userParts.push(
    '',
    'Current code:',
    params.code,
    '',
    `Error: ${params.error}`,
    '',
    'Arguments passed:',
    JSON.stringify(params.arguments, null, 2),
  )

  const userPrompt = userParts.join('\n')

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    const res = await ollamaClient.chat({
      model: params.model,
      messages,
      format: 'json',
      stream: false,
    })

    const parsed = extractJsonFromResponse(res.message.content) as {
      fixedCode?: string
      explanation?: string
    } | null

    const trainingPairId = await saveTrainingPair(
      'fix',
      params.model,
      systemPrompt,
      userPrompt,
      res.message.content,
      params.toolName,
    )

    if (!parsed || !parsed.fixedCode) {
      return {
        fixedCode: '',
        explanation: '',
        trainingPairId,
        error: 'AI could not generate a valid response',
      }
    }

    return {
      fixedCode: stripImports(parsed.fixedCode),
      explanation: parsed.explanation ?? '',
      trainingPairId,
    }
  } catch (e) {
    return {
      fixedCode: '',
      explanation: '',
      trainingPairId: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Export 5 — Export Training Data
// ---------------------------------------------------------------------------

export async function exportTrainingData(acceptedOnly = true): Promise<void> {
  await canvasAiDB.exportAsJsonl(acceptedOnly)
}
