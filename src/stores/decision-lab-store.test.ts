import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useDecisionLabStore } from './decision-lab-store'
import { ollamaClient } from '@/services/ollama-client'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { decide: vi.fn() },
}))

/**
 * Only the daemon is mocked; the store drives the real decision-lab service.
 * The canned answer is what nimble returned live on Ollama 0.40.3.
 */
describe('decision-lab store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.decide).mockReset()
  })

  it('seeds one question of each type and is sendable once a model is picked', () => {
    const lab = useDecisionLabStore()
    lab.seedSample()
    expect(lab.questions.map((q) => q.type)).toEqual(['choice', 'noul', 'score'])
    expect(lab.canRun).toBe(false)

    lab.model = 'nimble'
    expect(lab.problems.size).toBe(0)
    expect(lab.canRun).toBe(true)
    expect(lab.request?.questions.severity).toEqual({
      type: 'score', instructions: 'How severe is the impact?', criteria: ['cosmetic', 'minor', 'major', 'full outage'],
    })
  })

  it('sends the built request verbatim and keeps the answers', async () => {
    const lab = useDecisionLabStore()
    lab.seedSample()
    lab.model = 'nimble'
    vi.mocked(ollamaClient.decide).mockResolvedValue({
      model: 'nimble',
      answers: { urgent: { type: 'noul', noul: 0.9897 } },
      usage: { input_tokens: 175, output_tokens: 1 },
    })

    await lab.run()

    expect(ollamaClient.decide).toHaveBeenCalledTimes(1)
    const sent = vi.mocked(ollamaClient.decide).mock.calls[0]![0]
    expect(sent.model).toBe('nimble')
    expect(Object.keys(sent.questions)).toEqual(['label', 'urgent', 'severity'])
    expect(lab.status).toBe('completed')
    expect(lab.result?.answers.urgent).toEqual({ type: 'noul', noul: 0.9897 })
    expect(lab.elapsedMs).not.toBeNull()
  })

  it('surfaces the daemon error text, as for a model without the decision capability', async () => {
    const lab = useDecisionLabStore()
    lab.seedSample()
    lab.model = 'qwen2.5:7b'
    vi.mocked(ollamaClient.decide).mockRejectedValue(new Error('registry.ollama.ai/library/qwen2.5:7b does not support decision'))

    await lab.run()

    expect(lab.status).toBe('error')
    expect(lab.error).toContain('does not support decision')
    expect(lab.result).toBeNull()
  })

  it('blocks the run while a draft is broken, and names the problem', () => {
    const lab = useDecisionLabStore()
    lab.seedSample()
    lab.model = 'nimble'
    lab.questions[0]!.criteriaText = 'just-one'
    expect(lab.problems.get(lab.questions[0]!.id)).toBe('candidates')
    expect(lab.canRun).toBe(false)

    lab.questions[0]!.criteriaText = 'a: A\nb: B'
    lab.questions[1]!.key = 'label'
    expect(lab.problems.get(lab.questions[1]!.id)).toBe('duplicateKey')
  })
})
