import type { QualityCheckResult, QualityReport, QualityStatus } from '@/types/quality'

const REFUSAL_PATTERNS: RegExp[] = [
  /as an ai( language)? model/i,
  /i cannot (help|assist|provide)/i,
  /i('m| am) not able to/i,
  /i('m| am) unable to/i,
  /i must (decline|refuse)/i,
  /it('s| is) not (appropriate|ethical)/i,
  /i don'?t have the ability/i,
  /my programming (prevents|doesn'?t allow)/i,
]

function buildNgrams(words: string[], n: number): string[] {
  const ngrams: string[] = []
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '))
  }
  return ngrams
}

export function detectRepetition(text: string): QualityCheckResult {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length < 8) {
    return { detector: 'repetition', status: 'pass', reason: 'quality.repetition.reason' }
  }

  const ngrams = buildNgrams(words, 4)
  if (ngrams.length === 0) {
    return { detector: 'repetition', status: 'pass', reason: 'quality.repetition.reason' }
  }

  const freq = new Map<string, number>()
  for (const ng of ngrams) {
    freq.set(ng, (freq.get(ng) ?? 0) + 1)
  }

  let repeated = 0
  for (const count of freq.values()) {
    if (count > 1) repeated += count
  }

  const ratio = repeated / ngrams.length
  if (ratio > 0.5) {
    return {
      detector: 'repetition',
      status: 'fail',
      reason: 'quality.repetition.reason',
      detail: `${(ratio * 100).toFixed(0)}% repeated 4-grams`,
    }
  }
  if (ratio > 0.3) {
    return {
      detector: 'repetition',
      status: 'warn',
      reason: 'quality.repetition.reason',
      detail: `${(ratio * 100).toFixed(0)}% repeated 4-grams`,
    }
  }

  return { detector: 'repetition', status: 'pass', reason: 'quality.repetition.reason' }
}

export function detectRefusal(text: string): QualityCheckResult {
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        detector: 'refusal',
        status: 'warn',
        reason: 'quality.refusal.reason',
        detail: `Matched: ${pattern.source}`,
      }
    }
  }
  return { detector: 'refusal', status: 'pass', reason: 'quality.refusal.reason' }
}

export function detectGibberish(text: string): QualityCheckResult {
  if (text.length <= 20) {
    return { detector: 'gibberish', status: 'pass', reason: 'quality.gibberish.reason' }
  }

  let nonAscii = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAscii++
  }

  const ratio = nonAscii / text.length
  if (ratio > 0.4) {
    return {
      detector: 'gibberish',
      status: 'warn',
      reason: 'quality.gibberish.reason',
      detail: `${(ratio * 100).toFixed(0)}% non-ASCII characters`,
    }
  }

  return { detector: 'gibberish', status: 'pass', reason: 'quality.gibberish.reason' }
}

export function detectEmpty(text: string): QualityCheckResult {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return {
      detector: 'empty',
      status: 'fail',
      reason: 'quality.empty.reason',
      detail: '0 words',
    }
  }
  if (words.length < 10) {
    return {
      detector: 'empty',
      status: 'warn',
      reason: 'quality.empty.reason',
      detail: `${words.length} words`,
    }
  }
  return { detector: 'empty', status: 'pass', reason: 'quality.empty.reason' }
}

export function detectTruncation(
  text: string,
  completionTokenCount: number,
  maxTokens: number | undefined,
  doneReason: string | undefined,
): QualityCheckResult {
  if (doneReason === 'length') {
    return {
      detector: 'truncation',
      status: 'warn',
      reason: 'quality.truncation.reason',
      detail: 'Model stopped due to token limit',
    }
  }

  if (maxTokens && maxTokens > 0) {
    const ratio = completionTokenCount / maxTokens
    const endsClean = /[.!?\n)\]"]$/.test(text.trim())
    if (ratio > 0.9 && !endsClean) {
      return {
        detector: 'truncation',
        status: 'warn',
        reason: 'quality.truncation.reason',
        detail: `Used ${(ratio * 100).toFixed(0)}% of token budget without clean ending`,
      }
    }
  }

  return { detector: 'truncation', status: 'pass', reason: 'quality.truncation.reason' }
}

function worstStatus(checks: QualityCheckResult[]): QualityStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  return 'pass'
}

export function analyzeResponseQuality(
  messageId: string,
  sessionId: string,
  text: string,
  completionTokenCount: number,
  maxTokens: number | undefined,
  doneReason: string | undefined,
): QualityReport {
  const checks: QualityCheckResult[] = [
    detectRepetition(text),
    detectRefusal(text),
    detectGibberish(text),
    detectEmpty(text),
    detectTruncation(text, completionTokenCount, maxTokens, doneReason),
  ]

  return {
    messageId,
    sessionId,
    overall: worstStatus(checks),
    checks,
    analyzedAt: Date.now(),
  }
}
