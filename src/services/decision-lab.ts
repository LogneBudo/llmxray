import type {
  DecisionQuestion,
  DecisionQuestionDraft,
  DecisionRequest,
  DecisionAnswer,
} from '@/types/decision'

/** Ollama's own limits on `/v1/systemone`, as its error messages state them. */
export const MIN_CANDIDATES = 2
export const MAX_CANDIDATES = 26
export const MAX_QUESTIONS = 64

export type DraftCheck = { ok: true; question: DecisionQuestion } | { ok: false; error: string }

/**
 * Turn an edited question into the wire shape, or say precisely what is wrong.
 * `choice` criteria are one `name: description` per line; `score` criteria are
 * one description per line, lowest first — Ollama wants an ARRAY there, and a
 * map is rejected with "score criteria must be an array of descriptions".
 */
export function draftToQuestion(draft: DecisionQuestionDraft): DraftCheck {
  const instructions = draft.instructions.trim()
  if (!instructions) return { ok: false, error: 'instructions' }

  if (draft.type === 'noul') {
    return { ok: true, question: { type: 'noul', instructions } }
  }

  const lines = draft.criteriaText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (draft.type === 'score') {
    if (lines.length < MIN_CANDIDATES || lines.length > MAX_CANDIDATES) return { ok: false, error: 'candidates' }
    return { ok: true, question: { type: 'score', instructions, criteria: lines } }
  }

  const criteria: Record<string, string> = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    const name = (idx === -1 ? line : line.slice(0, idx)).trim()
    const desc = idx === -1 ? '' : line.slice(idx + 1).trim()
    if (!name) continue
    criteria[name] = desc || name
  }
  const count = Object.keys(criteria).length
  if (count < MIN_CANDIDATES || count > MAX_CANDIDATES) return { ok: false, error: 'candidates' }
  return { ok: true, question: { type: 'choice', instructions, criteria } }
}

/** Keys must be non-empty and unique — the answer comes back under them. */
export function draftKeyProblem(draft: DecisionQuestionDraft, all: DecisionQuestionDraft[]): string | null {
  const key = draft.key.trim()
  if (!key) return 'key'
  if (all.some((d) => d.id !== draft.id && d.key.trim() === key)) return 'duplicateKey'
  return null
}

/** Assemble the request, or return null when any draft is not sendable. */
export function buildDecisionRequest(
  model: string,
  state: string,
  drafts: DecisionQuestionDraft[],
): DecisionRequest | null {
  if (!model || !state.trim() || drafts.length === 0 || drafts.length > MAX_QUESTIONS) return null
  const questions: Record<string, DecisionQuestion> = {}
  for (const d of drafts) {
    if (draftKeyProblem(d, drafts)) return null
    const check = draftToQuestion(d)
    if (!check.ok) return null
    questions[d.key.trim()] = check.question
  }
  return { model, state: state.trim(), questions }
}

/** Probability bars for any answer type, highest first, with the winner marked. */
export interface ProbabilityBar {
  label: string
  probability: number
  winner: boolean
}

export function answerBars(answer: DecisionAnswer): ProbabilityBar[] {
  if (answer.type === 'noul') {
    return [
      { label: 'yes', probability: answer.noul, winner: answer.noul >= 0.5 },
      { label: 'no', probability: 1 - answer.noul, winner: answer.noul < 0.5 },
    ]
  }
  if (answer.type === 'choice') {
    return Object.entries(answer.probabilities)
      .map(([label, probability]) => ({ label, probability, winner: label === answer.choice }))
      .sort((a, b) => b.probability - a.probability)
  }
  // score: keep the scale ORDER, since position is the meaning
  const top = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0]?.[0]
  return Object.keys(answer.legend)
    .sort((a, b) => Number(a) - Number(b))
    .map((idx) => ({
      label: answer.legend[idx] ?? idx,
      probability: answer.probabilities[idx] ?? 0,
      winner: idx === top,
    }))
}
