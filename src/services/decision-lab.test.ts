import { draftToQuestion, buildDecisionRequest, draftKeyProblem, answerBars } from './decision-lab'
import type { DecisionQuestionDraft, DecisionResponse } from '@/types/decision'

function draft(over: Partial<DecisionQuestionDraft>): DecisionQuestionDraft {
  return { id: 'x', key: 'q', type: 'choice', instructions: 'Which?', criteriaText: 'a: A\nb: B', ...over }
}

describe('decision-lab — building what /v1/systemone accepts', () => {
  it('maps choice criteria to a name -> description object', () => {
    const r = draftToQuestion(draft({ criteriaText: 'billing: Payments and refunds\nbug: Software errors\naccount: Login' }))
    expect(r).toEqual({
      ok: true,
      question: {
        type: 'choice', instructions: 'Which?',
        criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: 'Login' },
      },
    })
  })

  it('sends score criteria as an ARRAY, lowest first — a map is what Ollama rejects', () => {
    const r = draftToQuestion(draft({ type: 'score', criteriaText: 'cosmetic\nminor\nmajor\nfull outage' }))
    expect(r.ok && r.question).toEqual({ type: 'score', instructions: 'Which?', criteria: ['cosmetic', 'minor', 'major', 'full outage'] })
  })

  it('needs no criteria for a noul question', () => {
    expect(draftToQuestion(draft({ type: 'noul', criteriaText: '' }))).toEqual({
      ok: true, question: { type: 'noul', instructions: 'Which?' },
    })
  })

  it('refuses what the daemon would refuse: no instructions, or fewer than 2 candidates', () => {
    expect(draftToQuestion(draft({ instructions: '  ' }))).toEqual({ ok: false, error: 'instructions' })
    expect(draftToQuestion(draft({ criteriaText: 'only-one' }))).toEqual({ ok: false, error: 'candidates' })
    expect(draftToQuestion(draft({ type: 'score', criteriaText: 'one' }))).toEqual({ ok: false, error: 'candidates' })
  })

  it('flags an empty or duplicated answer key', () => {
    const a = draft({ id: 'a', key: 'label' })
    const b = draft({ id: 'b', key: 'label' })
    expect(draftKeyProblem(a, [a, b])).toBe('duplicateKey')
    expect(draftKeyProblem(draft({ key: ' ' }), [])).toBe('key')
    expect(draftKeyProblem(a, [a])).toBeNull()
  })

  it('builds the full request only when every draft is sendable', () => {
    const ok = buildDecisionRequest('nimble', ' state ', [draft({ key: 'label' })])
    expect(ok).toEqual({ model: 'nimble', state: 'state', questions: { label: { type: 'choice', instructions: 'Which?', criteria: { a: 'A', b: 'B' } } } })

    expect(buildDecisionRequest('', 'state', [draft({})])).toBeNull()
    expect(buildDecisionRequest('nimble', '', [draft({})])).toBeNull()
    expect(buildDecisionRequest('nimble', 'state', [])).toBeNull()
    expect(buildDecisionRequest('nimble', 'state', [draft({ criteriaText: 'one' })])).toBeNull()
  })
})

/** Verbatim answer from nimble on Ollama 0.40.3 for the sample ticket. */
const LIVE: DecisionResponse = {
  model: 'nimble',
  answers: {
    label: { type: 'choice', choice: 'bug', probabilities: { billing: 0.0381, bug: 0.9073, account: 0.0545 }, confidence: 0.6619 },
    urgent: { type: 'noul', noul: 0.9897 },
    severity: {
      type: 'score', score: 2.3708,
      legend: { '0': 'cosmetic', '1': 'minor', '2': 'major', '3': 'full outage' },
      probabilities: { '0': 0.0051, '1': 0.0223, '2': 0.5693, '3': 0.4033 },
      confidence: 0.4239,
    },
  },
  usage: { input_tokens: 592, output_tokens: 3 },
}

describe('decision-lab — bars from a live answer', () => {
  it('sorts choice candidates by probability and marks the chosen one', () => {
    const bars = answerBars(LIVE.answers.label!)
    expect(bars.map((b) => b.label)).toEqual(['bug', 'account', 'billing'])
    expect(bars[0]).toMatchObject({ winner: true, probability: 0.9073 })
  })

  it('turns a noul into a yes/no pair that sums to one', () => {
    const bars = answerBars(LIVE.answers.urgent!)
    expect(bars[0]).toMatchObject({ label: 'yes', winner: true })
    expect(bars[0]!.probability + bars[1]!.probability).toBeCloseTo(1, 10)
  })

  it('keeps a score scale in order and marks the most likely step, not the mean', () => {
    const bars = answerBars(LIVE.answers.severity!)
    expect(bars.map((b) => b.label)).toEqual(['cosmetic', 'minor', 'major', 'full outage'])
    // score 2.37 sits between "major" and "full outage"; the mode is "major"
    expect(bars.find((b) => b.winner)?.label).toBe('major')
  })
})
