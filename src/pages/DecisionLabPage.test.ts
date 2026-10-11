import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick } from 'vue'
import DecisionLabPage from './DecisionLabPage.vue'
import { useDecisionLabStore } from '@/stores/decision-lab-store'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: {
    decide: vi.fn(),
    listModels: vi.fn().mockResolvedValue([]),
    showModel: vi.fn().mockImplementation(() => new Promise(() => {})),
  },
}))

import { ollamaClient } from '@/services/ollama-client'

/** Renders the real page: a missing i18n key or an undefined field fails here. */
function mountPage() {
  return mount(DecisionLabPage, { global: { stubs: { RouterLink: true } } })
}

describe('DecisionLabPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders, seeds the sample, and says when no decision model is installed', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Decision Lab')
    expect(wrapper.text()).toContain('No decision model is installed.')
    const lab = useDecisionLabStore()
    expect(lab.questions).toHaveLength(3)
    // Instructions live in inputs, so check the rendered value rather than text content
    const values = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(values).toContain('How severe is the impact?')
  })

  it('lists only decision models in the selector, never chat models', async () => {
    vi.mocked(ollamaClient.listModels).mockResolvedValueOnce([
      { name: 'nimble:latest', model: 'nimble:latest', modified_at: '', size: 1, digest: 'a', capabilities: ['decision'],
        details: { parent_model: '', format: 'gguf', family: 'qwen35', families: ['qwen35'], parameter_size: '9B', quantization_level: 'Q8_0' } },
      { name: 'qwen2.5:7b', model: 'qwen2.5:7b', modified_at: '', size: 1, digest: 'b', capabilities: ['completion', 'tools'],
        details: { parent_model: '', format: 'gguf', family: 'qwen2', families: ['qwen2'], parameter_size: '7B', quantization_level: 'Q4_K_M' } },
    ])
    const wrapper = mountPage()
    await flushPromises()
    const options = wrapper.findAll('select').at(0)!.findAll('option').map((o) => o.text())
    expect(options).toEqual(['nimble:latest'])
    expect(useDecisionLabStore().model).toBe('nimble:latest')
  })

  it('draws one bar per candidate and marks the chosen one, from a live-shaped answer', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const lab = useDecisionLabStore()
    lab.result = {
      model: 'nimble',
      answers: {
        label: { type: 'choice', choice: 'bug', probabilities: { billing: 0.0381, bug: 0.9073, account: 0.0545 }, confidence: 0.6619 },
        urgent: { type: 'noul', noul: 0.9897 },
      },
      usage: { input_tokens: 592, output_tokens: 3 },
    }
    lab.elapsedMs = 1234
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('chosen: bug')
    expect(text).toContain('90.7%')
    expect(text).toContain('yes')
    expect(text).toContain('592 input tokens')
    expect(text).toContain('1.23 s')
  })

  it('flags a broken question and disables Decide', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const lab = useDecisionLabStore()
    lab.model = 'nimble'
    lab.questions[0]!.criteriaText = 'only-one'
    await nextTick()

    expect(wrapper.text()).toContain('Needs between 2 and 26 candidates.')
    const run = wrapper.findAll('button').find((b) => b.text().includes('Decide'))!
    expect(run.attributes('disabled')).toBeDefined()
  })
})
