/**
 * Decision models — Ollama 0.35.1, `/v1/systemone`, after TypeSafe's Jev API.
 *
 * A decision model does not write text. Given a `state` and one or more
 * questions, it returns a choice with a probability per candidate, the
 * probability that a condition holds, or a score over an ordered scale. The
 * probabilities are the model's own output distribution, not a parse of prose,
 * which is what makes them worth showing.
 *
 * Shapes below were verified live against Ollama 0.40.3 with `nimble`.
 */

/** Pick one of several named candidates. `criteria` maps candidate -> description. 2–26 candidates. */
export interface ChoiceQuestion {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

/** Probability that a condition holds (a "noul" — null/true probability). */
export interface NoulQuestion {
  type: 'noul'
  instructions: string
}

/** Score along an ORDERED scale. `criteria` is an array of descriptions, lowest first. */
export interface ScoreQuestion {
  type: 'score'
  instructions: string
  criteria: string[]
}

export type DecisionQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion
export type DecisionQuestionType = DecisionQuestion['type']

export interface DecisionRequest {
  model: string
  /** The situation every question is asked about. */
  state: string
  /** Base64 images, shared by all questions (multimodal decision models only, 0.35.1+). */
  images?: string[]
  /** 1–64 questions, keyed by the name the answer comes back under. */
  questions: Record<string, DecisionQuestion>
}

export interface ChoiceAnswer {
  type: 'choice'
  choice: string
  /** Probability per candidate; sums to ~1. */
  probabilities: Record<string, number>
  confidence: number
}

export interface NoulAnswer {
  type: 'noul'
  /** Probability the condition holds, 0..1. */
  noul: number
}

export interface ScoreAnswer {
  type: 'score'
  /** Expected position on the scale, 0-based, fractional. */
  score: number
  /** Index -> description, as sent. */
  legend: Record<string, string>
  /** Probability per index. */
  probabilities: Record<string, number>
  confidence: number
}

export type DecisionAnswer = ChoiceAnswer | NoulAnswer | ScoreAnswer

export interface DecisionResponse {
  model: string
  answers: Record<string, DecisionAnswer>
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/** A question as edited on the Decision Lab page, before it is sent. */
export interface DecisionQuestionDraft {
  id: string
  /** The key the answer comes back under. */
  key: string
  type: DecisionQuestionType
  instructions: string
  /** choice: one "name: description" per line. score: one description per line, lowest first. */
  criteriaText: string
}

export type DecisionLabStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
