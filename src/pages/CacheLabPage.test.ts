import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick } from 'vue'
import CacheLabPage from './CacheLabPage.vue'
import { useCacheLabStore } from '@/stores/cache-lab-store'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { chat: vi.fn(), listModels: vi.fn().mockResolvedValue([]) },
}))

/**
 * Renders the real page. A template that references a missing i18n key or an
 * undefined field fails here rather than in front of a user — inspection of the
 * source would not catch either.
 */
function mountPage() {
  return mount(CacheLabPage, {
    global: { stubs: { RouterLink: true } },
  })
}

describe('CacheLabPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without crashing and shows the title', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Cache Lab')
  })

  it('diagnoses the sample prompt it seeds itself with', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const lab = useCacheLabStore()

    // The seeded sample carries a leading timestamp on purpose
    expect(lab.volatileSegments.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('timestamp')
  })

  it('reports a clean prompt rather than inventing a problem', async () => {
    const wrapper = mountPage()
    const lab = useCacheLabStore()
    lab.systemPrompt = 'You are a careful assistant.'
    await nextTick()

    expect(wrapper.text()).toContain('the whole prompt can stay cached')
  })

  it('shows measured rows once probes exist, and marks unreported cache as such', async () => {
    const wrapper = mountPage()
    const lab = useCacheLabStore()
    lab.probes = [
      {
        label: 'original', text: 'x', promptTokens: 324, cachedTokens: 4,
        evaluatedTokens: 320, prefillMs: 64.6, reuse: 4 / 324,
      },
      {
        label: 'rewritten', text: 'y', promptTokens: 324, cachedTokens: undefined,
        evaluatedTokens: 324, prefillMs: 18.6, reuse: undefined,
      },
    ]
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('324')
    // The unreported row must not be rendered as a confident 0%
    expect(text).toContain('not reported')
  })

  it('renders the measured verdict when one exists', async () => {
    const wrapper = mountPage()
    const lab = useCacheLabStore()
    lab.probes = [
      {
        label: 'original', text: 'x', promptTokens: 324, cachedTokens: 4,
        evaluatedTokens: 320, prefillMs: 64.6, reuse: 4 / 324,
      },
      {
        label: 'rewritten', text: 'y', promptTokens: 324, cachedTokens: 290,
        evaluatedTokens: 34, prefillMs: 18.6, reuse: 290 / 324,
      },
    ]
    lab.verdict = { tokensSaved: 286, msSaved: 46.0, speedup: 3.47 }
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('286')
    expect(text).toContain('3.47')
  })
})
