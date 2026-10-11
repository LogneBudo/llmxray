import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick } from 'vue'
import EmbeddingsPage from './EmbeddingsPage.vue'
import type { OllamaModel } from '@/types/ollama'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: {
    embed: vi.fn(),
    listModels: vi.fn(),
    showModel: vi.fn().mockImplementation(() => new Promise(() => {})),
  },
}))
vi.mock('@/stores/storage-store', () => ({
  useStorageStore: () => ({ origin: null, getDatabaseById: () => undefined, refreshIfStale: vi.fn() }),
}))

import { ollamaClient } from '@/services/ollama-client'

function model(name: string, capabilities: string[]): OllamaModel {
  return {
    name, model: name, modified_at: '', size: 1, digest: name, capabilities,
    details: { parent_model: '', format: 'gguf', family: 'x', families: ['x'], parameter_size: '', quantization_level: '', embedding_length: 768 },
  }
}

/** As the daemon lists them on 0.40.3: embeddinggemma-2 is embedding+vision+audio, nomic is embedding only. */
const MODELS = [
  model('nomic-embed-text:latest', ['embedding']),
  model('embeddinggemma-2:latest', ['embedding', 'vision', 'audio']),
]

function mountPage() {
  return mount(EmbeddingsPage, { global: { stubs: { RouterLink: true, StorageGauge: true } } })
}

describe('EmbeddingsPage — image input is capability-gated', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.listModels).mockResolvedValue(MODELS)
  })

  it('offers no image control for a text-only embedding model', async () => {
    const wrapper = mountPage()
    await flushPromises()
    // First model in the list is the text-only one
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('nomic-embed-text:latest')
    expect(wrapper.text()).not.toContain('Attach an image')
  })

  it('offers the image control, in the playground and on both similarity sides, for embedding+vision', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('select').setValue('embeddinggemma-2:latest')
    await nextTick()

    const attachLabels = wrapper.findAll('label').filter((l) => l.text().includes('Attach an image'))
    expect(attachLabels).toHaveLength(3)
    expect(wrapper.text()).toContain('This model embeds images too')
  })

  it('shows the prompt tokens an embedding cost once a result exists', async () => {
    vi.mocked(ollamaClient.embed).mockResolvedValue({
      model: 'embeddinggemma-2:latest', embeddings: [Array.from({ length: 768 }, () => 0.1)], prompt_eval_count: 265,
    })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('select').setValue('embeddinggemma-2:latest')
    await wrapper.find('textarea').setValue('a cat on a windowsill')
    const embedBtn = wrapper.findAll('button').find((b) => b.text() === 'Embed')!
    await embedBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('265 prompt tokens')
  })
})
