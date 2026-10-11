import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { nanoid } from 'nanoid'
import { ollamaClient } from '@/services/ollama-client'
import { buildDecisionRequest, draftKeyProblem, draftToQuestion } from '@/services/decision-lab'
import type { DecisionLabStatus, DecisionQuestionDraft, DecisionQuestionType, DecisionResponse } from '@/types/decision'

/**
 * The sample that ships on the page: a support ticket, asked three ways. It is
 * the request that was run live against nimble on Ollama 0.40.3 — one question
 * of each type the endpoint accepts.
 */
export const SAMPLE_STATE = 'Our checkout has returned 500 errors since 9am. Customers cannot pay.'

export function sampleQuestions(): DecisionQuestionDraft[] {
  return [
    {
      id: nanoid(), key: 'label', type: 'choice',
      instructions: 'Which label fits this ticket?',
      criteriaText: 'billing: Payments and refunds\nbug: Software errors\naccount: Login and account access',
    },
    { id: nanoid(), key: 'urgent', type: 'noul', instructions: 'Is this ticket urgent?', criteriaText: '' },
    {
      id: nanoid(), key: 'severity', type: 'score',
      instructions: 'How severe is the impact?',
      criteriaText: 'cosmetic\nminor\nmajor\nfull outage',
    },
  ]
}

export const useDecisionLabStore = defineStore('decisionLab', () => {
  const model = ref('')
  const state = ref('')
  const questions = ref<DecisionQuestionDraft[]>([])

  const status = ref<DecisionLabStatus>('idle')
  const error = ref<string | null>(null)
  const result = ref<DecisionResponse | null>(null)
  const elapsedMs = ref<number | null>(null)

  let controller: AbortController | null = null

  /** Per-draft problem keys (i18n names), empty when sendable. */
  const problems = computed(() => {
    const out = new Map<string, string>()
    for (const d of questions.value) {
      const keyProblem = draftKeyProblem(d, questions.value)
      if (keyProblem) { out.set(d.id, keyProblem); continue }
      const check = draftToQuestion(d)
      if (!check.ok) out.set(d.id, check.error)
    }
    return out
  })

  const request = computed(() => buildDecisionRequest(model.value, state.value, questions.value))
  const isRunning = computed(() => status.value === 'running')
  const canRun = computed(() => request.value !== null && !isRunning.value)

  function seedSample(): void {
    if (!state.value) state.value = SAMPLE_STATE
    if (questions.value.length === 0) questions.value = sampleQuestions()
  }

  function addQuestion(type: DecisionQuestionType = 'choice'): void {
    const n = questions.value.length + 1
    questions.value.push({ id: nanoid(), key: `q${n}`, type, instructions: '', criteriaText: '' })
  }

  function removeQuestion(id: string): void {
    questions.value = questions.value.filter((q) => q.id !== id)
  }

  async function run(): Promise<void> {
    const req = request.value
    if (!req || isRunning.value) return

    controller = new AbortController()
    status.value = 'running'
    error.value = null
    result.value = null
    elapsedMs.value = null
    const startedAt = performance.now()

    try {
      result.value = await ollamaClient.decide(req, controller.signal)
      elapsedMs.value = performance.now() - startedAt
      status.value = 'completed'
    } catch (e) {
      if (controller.signal.aborted) {
        status.value = 'cancelled'
        return
      }
      error.value = e instanceof Error ? e.message : String(e)
      status.value = 'error'
    } finally {
      controller = null
    }
  }

  function cancel(): void {
    controller?.abort()
  }

  function reset(): void {
    result.value = null
    error.value = null
    elapsedMs.value = null
    status.value = 'idle'
  }

  return {
    model, state, questions,
    status, error, result, elapsedMs,
    problems, request, isRunning, canRun,
    seedSample, addQuestion, removeQuestion, run, cancel, reset,
  }
})
