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
    '\n\nAnalyze the following tool code for issues:\n' +
    '- Missing try/catch\n' +
    '- No timeout on fetch calls\n' +
    '- Hardcoded URLs that should be parameters\n' +
    '- Potential secret/key leaks\n' +
    '- Unused parameters\n' +
    '- Missing error handling\n\n' +
    'Respond with JSON: {"insights": [{"severity": "info|warning|error", "title": "<short>", "description": "<detail>", "suggestedCode": "<optional fix>"}]}'

  const userPrompt = [
    serializeToolContext(params.toolName, '', params.parameters),
    '',
    'Current code:',
    params.code,
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

    return { insights: parsed.insights, trainingPairId }
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
