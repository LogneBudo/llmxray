import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import TokenStreamDisplay from './TokenStreamDisplay.vue'
import { useTokenStore } from '@/stores/token-store'
import type { StreamToken } from '@/types/token'
import { exportTokenStreamAsCsv } from '@/utils/share-session'

vi.mock('@/utils/download', () => ({ downloadCsv: vi.fn(), downloadJson: vi.fn(), downloadMarkdown: vi.fn() }))
import { downloadCsv } from '@/utils/download'

function token(i: number, text: string, logprob?: number): StreamToken {
  return {
    id: `t${i}`,
    index: i,
    text,
    timestamp: 1000 + i,
    // What the stream handler stores: exp(logprob) when Ollama sent one, a timing figure otherwise.
    confidence: logprob != null ? Math.exp(logprob) : 0.9,
    ...(logprob != null ? { logprob } : {}),
    cumulativeText: text,
    interTokenLatencyMs: 40 + i,
  }
}

function mountWith(tokens: StreamToken[]) {
  const store = useTokenStore()
  for (const t of tokens) store.pushToken('s1', t)
  return mount(TokenStreamDisplay, { props: { sessionId: 's1' } })
}

describe('the token view names what its colours mean', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calls it probability when Ollama sent logprobs', async () => {
    const w = mountWith([token(0, 'Paris', -0.05), token(1, ' is', -0.4)])
    await flushPromises()
    expect(w.text()).toContain('Probability')
    expect(w.text()).toContain("the model's own probability for each token")
    await w.findAll('span[title]')[0]!.trigger('mouseenter')
    expect(w.text()).toContain('Probability: 95%')
  })

  it('calls it pace, not confidence, when there were no logprobs, and shows no percentage', async () => {
    const w = mountWith([token(0, 'Paris'), token(1, ' is')])
    await flushPromises()
    const text = w.text()
    expect(text).toContain('Pace')
    expect(text).toContain('not confidence (Ollama sent no probabilities)')
    expect(text).toContain('Slow')
    expect(text).not.toMatch(/confidence:/i)
    const chip = w.findAll('span[title]')[0]!
    expect(chip.attributes('title')).toBe('Token #0 | Latency: 40 ms')
    await chip.trigger('mouseenter')
    expect(w.text()).not.toContain('Probability:')
    expect(w.text()).toContain('Latency: 40 ms')
  })

  it('exports a probability only from a real logprob, and leaves it empty otherwise', () => {
    exportTokenStreamAsCsv([token(0, 'Paris', Math.log(0.5)), token(1, ' is')], 's1')
    const [headers, rows] = vi.mocked(downloadCsv).mock.calls.at(-1)!
    expect(headers[2]).toBe('Probability')
    expect(rows[0]![2]).toBe('50.0%')
    expect(rows[1]![2]).toBe('')
  })
})
