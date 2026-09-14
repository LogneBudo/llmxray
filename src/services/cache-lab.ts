import { ollamaClient } from './ollama-client'
import type { CacheProbe, VolatileSegment, CacheLabVerdict } from '@/types/cache-lab'

const NS_TO_MS = 1_000_000

/**
 * Patterns for text that differs run to run. Ordered longest-match-first so a
 * full timestamp is claimed before its date and time halves are matched
 * separately, and a UUID before the digit runs inside it.
 */
const VOLATILE_PATTERNS: Array<{ kind: VolatileSegment['kind']; re: RegExp }> = [
  { kind: 'timestamp', re: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?/g },
  { kind: 'uuid', re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  { kind: 'date', re: /\b\d{4}-\d{2}-\d{2}\b/g },
  { kind: 'time', re: /\b\d{2}:\d{2}(:\d{2})?\b/g },
  { kind: 'number', re: /\b\d{4,}\b/g },
]

/**
 * Find spans that look like they change between requests. These are what break
 * prompt-cache reuse when they sit near the START of a prompt: the cache only
 * survives on a shared prefix, so one volatile token early forfeits everything
 * after it.
 *
 * Deliberately a detector, not a judge — it reports candidates and the lab
 * MEASURES whether moving them helps. Nothing here estimates a saving.
 */
export function findVolatileSegments(text: string): VolatileSegment[] {
  const found: VolatileSegment[] = []

  for (const { kind, re } of VOLATILE_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const start = m.index
      const end = start + m[0].length
      // Skip anything already claimed by an earlier, longer pattern
      if (found.some((f) => start < f.end && end > f.start)) continue
      found.push({ kind, text: m[0], start, end })
    }
  }

  return found.sort((a, b) => a.start - b.start)
}

/** Length of the shared leading run of characters between two strings. */
export function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) i++
  return i
}

/** Cached share of a prompt, 0..1. Undefined when the daemon reported nothing. */
export function reuseRatio(promptTokens: number, cachedTokens?: number): number | undefined {
  if (cachedTokens === undefined || promptTokens <= 0) return undefined
  return Math.min(cachedTokens, promptTokens) / promptTokens
}

/**
 * Rewrite a prompt so every volatile span moves to the end, preserving their
 * order and the surrounding text. The stable part becomes a shared prefix the
 * cache can keep across runs.
 */
export function hoistVolatileToEnd(text: string, segments: VolatileSegment[]): string {
  if (segments.length === 0) return text

  const ordered = [...segments].sort((a, b) => a.start - b.start)
  let stable = ''
  let cursor = 0
  for (const seg of ordered) {
    stable += text.slice(cursor, seg.start)
    cursor = seg.end
  }
  stable += text.slice(cursor)

  const moved = ordered.map((s) => s.text).join(' ')
  return `${stable.replace(/\s+/g, ' ').trim()}\n\n${moved}`
}

/** What the rewrite bought, measured — never estimated. */
export function compareProbes(baseline: CacheProbe, rewritten: CacheProbe): CacheLabVerdict {
  const tokensSaved = baseline.evaluatedTokens - rewritten.evaluatedTokens
  const msSaved = baseline.prefillMs - rewritten.prefillMs
  const speedup = rewritten.prefillMs > 0 ? baseline.prefillMs / rewritten.prefillMs : 0
  return { tokensSaved, msSaved, speedup }
}

/** Read one probe's numbers out of a completed non-streaming chat response. */
export function probeFromChunk(
  label: string,
  text: string,
  chunk: {
    prompt_eval_count?: number
    prompt_eval_cached_count?: number
    prompt_eval_duration?: number
  },
): CacheProbe {
  const promptTokens = chunk.prompt_eval_count ?? 0
  const reported = chunk.prompt_eval_cached_count
  const cachedTokens = reported === undefined ? undefined : Math.min(reported, promptTokens)

  return {
    label,
    text,
    promptTokens,
    cachedTokens,
    evaluatedTokens: promptTokens - (cachedTokens ?? 0),
    prefillMs: (chunk.prompt_eval_duration ?? 0) / NS_TO_MS,
    reuse: reuseRatio(promptTokens, cachedTokens),
  }
}

/**
 * Produce the "next turn" of a prompt: the same layout, with every volatile
 * span carrying a DIFFERENT value of the same shape (digits and hex are
 * rotated by one). The result is not semantically meaningful — a date may come
 * out impossible — and does not need to be. It exists to reproduce the one
 * thing that matters to the cache: the value changed, the layout did not.
 */
export function mutateVolatile(text: string): string {
  const segs = findVolatileSegments(text)
  if (segs.length === 0) return text

  let out = ''
  let cursor = 0
  for (const seg of segs) {
    out += text.slice(cursor, seg.start)
    out += seg.text.replace(/[0-9a-f]/gi, (ch) => {
      if (/[0-9]/.test(ch)) return String((Number(ch) + 1) % 10)
      const shifted = ((parseInt(ch, 16) + 1) % 16).toString(16)
      return ch === ch.toUpperCase() ? shifted.toUpperCase() : shifted
    })
    cursor = seg.end
  }
  out += text.slice(cursor)
  return out
}

/**
 * Send one prompt and read back what the cache gave. Generation is held to a
 * single token: the lab measures PREFILL, and decoding is pure overhead here.
 */
async function measure(
  model: string,
  system: string,
  user: string,
  label: string,
  signal?: AbortSignal,
): Promise<CacheProbe> {
  const chunk = await ollamaClient.chat(
    {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      options: { num_predict: 1, temperature: 0 },
    },
    signal,
  )

  return probeFromChunk(label, system, chunk)
}

/**
 * Measure how much cache each LAYOUT keeps when its volatile values change.
 *
 * This is the question that matters, and it is not the same as "how much does
 * variant B reuse of variant A". Real traffic re-sends the same layout every
 * turn with a fresh timestamp or session id; what decides throughput is whether
 * that layout keeps its prefix when the value moves. So each layout is sent
 * TWICE — once with its own values, once mutated — and it is the SECOND send
 * that is measured.
 *
 * Measuring the first send instead would only report how well a prompt matches
 * itself, which is ~100% for every layout and tells you nothing.
 */
export async function probeLayouts(
  model: string,
  layouts: Array<{ label: string; text: string }>,
  user: string,
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<CacheProbe[]> {
  const results: CacheProbe[] = []

  for (let i = 0; i < layouts.length; i++) {
    if (signal?.aborted) break
    const layout = layouts[i]!

    // Turn 1: seat this layout in the cache with its original values
    await measure(model, layout.text, user, '__turn1__', signal)
    if (signal?.aborted) break

    // Turn 2: same layout, values changed — this is the measurement
    const next = mutateVolatile(layout.text)
    results.push(await measure(model, next, user, layout.label, signal))
    onProgress?.(i + 1, layouts.length)
  }

  return results
}
