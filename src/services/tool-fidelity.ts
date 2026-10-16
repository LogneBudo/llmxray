/**
 * Tool-call fidelity: does a local model call tools the way an agent needs?
 * The scorer is pure and reads the daemon's answer as it is; the runner sends
 * each case to each model through the same /api/chat an agent would use.
 */
import { ollamaClient } from '@/services/ollama-client'
import { AFTER_RESULT_MESSAGES, TOOL_CASES, type ArgRule, type ToolCase } from '@/data/tool-fidelity/cases'
import type { OllamaChatChunk, OllamaChatMessage, OllamaToolCall } from '@/types/ollama'

export type Outcome =
  | 'valid'
  | 'wrong-tool'
  | 'hallucinated-tool'
  | 'missing-args'
  | 'bad-args'
  | 'in-prose'
  | 'no-call'
  | 'unneeded-call'
  | 'wrong-count'
  | 'error'

export interface CaseResult {
  caseId: string
  model: string
  outcome: Outcome
  /** Short sentence a person can read: which argument, which tool. */
  detail: string
  calls: { name: string; arguments: Record<string, unknown> }[]
  content: string
  /** The model's reasoning, when the daemon returned it separately. */
  thinking: string
  ms: number
}

export interface ModelSummary {
  model: string
  cases: number
  valid: number
  byOutcome: Partial<Record<Outcome, number>>
  /** 0..100 */
  score: number
}

/** A tool call written into the answer text instead of emitted as a call. */
export function callInProse(content: string, toolNames: string[]): string | null {
  const text = content.trim()
  if (!text) return null
  for (const name of toolNames) {
    // {"name": "read_file", ...}, "function": {"name": "read_file"}, read_file({...}), <tool_call>...
    const patterns = [
      new RegExp(`"name"\\s*:\\s*"${name}"`),
      new RegExp(`\\b${name}\\s*\\(`),
      new RegExp(`<tool_call>[\\s\\S]*${name}`),
      new RegExp(`\\[TOOL_CALLS?\\][\\s\\S]*${name}`),
    ]
    if (patterns.some((p) => p.test(text))) return name
  }
  return null
}

function argValue(args: Record<string, unknown>, key: string): unknown {
  if (key in args) return args[key]
  // Some models wrap arguments once more, or send them as a JSON string.
  if (typeof args === 'string') {
    try { return (JSON.parse(args as unknown as string) as Record<string, unknown>)[key] } catch { return undefined }
  }
  return undefined
}

function checkRule(value: unknown, rule: ArgRule): boolean {
  switch (rule.kind) {
    case 'present':
      return value !== undefined && value !== null && value !== ''
    case 'equals':
      return value === rule.value || (typeof rule.value === 'number' && Number(value) === rule.value && typeof value === 'number')
    case 'contains':
      return typeof value === 'string' && value.includes(rule.value)
    case 'minLength':
      return typeof value === 'string' && value.length >= rule.value
    case 'type':
      return rule.value === 'array' ? Array.isArray(value) : rule.value === 'object' ? typeof value === 'object' && value !== null && !Array.isArray(value) : typeof value === rule.value
    case 'oneOf':
      return rule.value.includes(value)
  }
}

function normaliseCalls(calls: OllamaToolCall[] | undefined): { name: string; arguments: Record<string, unknown> }[] {
  return (calls ?? []).map((c) => {
    const fn = (c as { function?: { name?: string; arguments?: unknown } }).function ?? {}
    let args: unknown = fn.arguments ?? {}
    if (typeof args === 'string') {
      try { args = JSON.parse(args) } catch { args = { _raw: args } }
    }
    return { name: String(fn.name ?? ''), arguments: (args && typeof args === 'object' ? args : {}) as Record<string, unknown> }
  })
}

export function scoreCase(c: ToolCase, chunk: OllamaChatChunk): Pick<CaseResult, 'outcome' | 'detail' | 'calls' | 'content' | 'thinking'> {
  const calls = normaliseCalls(chunk.message?.tool_calls)
  const content = chunk.message?.content ?? ''
  const thinking = chunk.message?.thinking ?? ''
  const offered = c.tools.map((t) => t.function.name)
  const base = { calls, content, thinking }

  if (c.expectCall === null) {
    if (calls.length === 0) {
      const prose = callInProse(content, offered)
      return prose ? { ...base, outcome: 'in-prose', detail: `wrote a ${prose} call into the answer instead of answering` } : { ...base, outcome: 'valid', detail: 'answered without calling a tool, as it should' }
    }
    const unknown = calls.find((k) => !offered.includes(k.name))
    if (unknown) return { ...base, outcome: 'hallucinated-tool', detail: `called ${unknown.name}, which was never offered` }
    return { ...base, outcome: 'unneeded-call', detail: `called ${calls[0]!.name} when no tool was needed` }
  }

  if (calls.length === 0) {
    const prose = callInProse(content, offered)
    if (prose) return { ...base, outcome: 'in-prose', detail: `wrote the ${prose} call into the answer text; the framework never sees it` }
    return { ...base, outcome: 'no-call', detail: `answered in words instead of calling ${c.expectCall}` }
  }
  const unknown = calls.find((k) => !offered.includes(k.name))
  if (unknown) return { ...base, outcome: 'hallucinated-tool', detail: `called ${unknown.name}, which was never offered` }
  const right = calls.filter((k) => k.name === c.expectCall)
  if (!right.length) return { ...base, outcome: 'wrong-tool', detail: `called ${calls[0]!.name} instead of ${c.expectCall}` }
  if (c.expectCalls != null && right.length !== c.expectCalls) return { ...base, outcome: 'wrong-count', detail: `made ${right.length} ${c.expectCall} call${right.length === 1 ? '' : 's'}, expected ${c.expectCalls}` }

  for (const call of right) {
    for (const [key, rules] of Object.entries(c.args ?? {})) {
      const value = argValue(call.arguments, key)
      if (value === undefined && rules.some((r) => r.kind === 'present')) return { ...base, outcome: 'missing-args', detail: `the ${key} argument is missing` }
      for (const rule of rules) {
        if (!checkRule(value, rule)) {
          const what = rule.kind === 'type' ? `${key} is not a ${rule.value}` : rule.kind === 'minLength' ? `${key} was shortened (${typeof value === 'string' ? value.length : 0} of at least ${rule.value} characters)` : rule.kind === 'equals' ? `${key} is ${JSON.stringify(value)}, expected ${JSON.stringify(rule.value)}` : rule.kind === 'contains' ? `${key} does not contain "${rule.value}"` : `${key} is wrong`
          return { ...base, outcome: 'bad-args', detail: what }
        }
      }
    }
  }
  return { ...base, outcome: 'valid', detail: `called ${c.expectCall} with the right arguments` }
}

export function messagesFor(c: ToolCase): OllamaChatMessage[] {
  if (c.user === '__after_result__') return AFTER_RESULT_MESSAGES as OllamaChatMessage[]
  const msgs: OllamaChatMessage[] = []
  if (c.system) msgs.push({ role: 'system', content: c.system })
  msgs.push({ role: 'user', content: c.user })
  return msgs
}

export async function runCase(c: ToolCase, model: string, signal?: AbortSignal): Promise<CaseResult> {
  const started = performance.now()
  try {
    const chunk = await ollamaClient.chat({ model, messages: messagesFor(c), tools: c.tools, stream: false, options: { temperature: 0 } }, signal)
    return { caseId: c.id, model, ...scoreCase(c, chunk), ms: performance.now() - started }
  } catch (e) {
    return { caseId: c.id, model, outcome: 'error', detail: (e as Error).message.slice(0, 160), calls: [], content: '', thinking: '', ms: performance.now() - started }
  }
}

export interface RunCallbacks {
  onResult?: (r: CaseResult, done: number, total: number) => void
}

export async function runToolFidelity(models: string[], cases: ToolCase[] = TOOL_CASES, cb: RunCallbacks = {}, signal?: AbortSignal): Promise<CaseResult[]> {
  const out: CaseResult[] = []
  const total = models.length * cases.length
  for (const model of models) {
    for (const c of cases) {
      if (signal?.aborted) return out
      const r = await runCase(c, model, signal)
      out.push(r)
      cb.onResult?.(r, out.length, total)
    }
  }
  return out
}

export function summarise(results: CaseResult[]): ModelSummary[] {
  const byModel = new Map<string, CaseResult[]>()
  for (const r of results) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r])
  return [...byModel.entries()]
    .map(([model, rs]) => {
      const byOutcome: Partial<Record<Outcome, number>> = {}
      for (const r of rs) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1
      const valid = byOutcome.valid ?? 0
      return { model, cases: rs.length, valid, byOutcome, score: rs.length ? Math.round((valid / rs.length) * 100) : 0 }
    })
    .sort((a, b) => b.score - a.score)
}
