import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import ChatInput from './ChatInput.vue'

// The parser is held open, so the attached PDF stays "being read" until the test lets it go.
let finishParsing: (text: string) => void = () => {}
vi.mock('@/services/document-parser', () => ({
  detectFormat: () => 'pdf',
  parseDocument: () => new Promise<string>((resolve) => { finishParsing = resolve }),
}))
vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { listModels: vi.fn().mockResolvedValue([]) },
}))

function mountInput() {
  return mount(ChatInput, {
    props: { isStreaming: false, selectedModel: 'llama3:latest', isVisionModel: false },
  })
}

async function attachPdf(wrapper: ReturnType<typeof mountInput>) {
  const file = new File(['%PDF-1.4'], 'brief.pdf', { type: 'application/pdf' })
  await wrapper.trigger('drop', { dataTransfer: { files: [file] } })
  await flushPromises()
}

describe('ChatInput', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not send on Enter while an attached file is still being read', async () => {
    const wrapper = mountInput()
    await attachPdf(wrapper)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('What does it say?')

    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
    expect((textarea.element as HTMLTextAreaElement).value).toBe('What does it say?')

    finishParsing('LLMxRay reads PDF files')
    await flushPromises()
    await textarea.trigger('keydown', { key: 'Enter' })

    const [text, attachments] = wrapper.emitted('send')![0] as [string, { content?: string }[]]
    expect(text).toBe('What does it say?')
    expect(attachments[0].content).toBe('LLMxRay reads PDF files')
  })

  it('keeps the message on Enter while no model is selected yet', async () => {
    const wrapper = mount(ChatInput, {
      props: { isStreaming: false, selectedModel: '', isVisionModel: false },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello')

    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Hello')

    await wrapper.setProps({ selectedModel: 'llama3:latest' })
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')![0][0]).toBe('Hello')
  })

  it('still runs a slash command while no model is selected', async () => {
    const wrapper = mount(ChatInput, {
      props: { isStreaming: false, selectedModel: '', isVisionModel: false },
    })
    const textarea = wrapper.find('textarea')
    // A command the menu has no match for, so Enter goes to sending rather than to the menu.
    await textarea.setValue('/nosuch now')
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('command')![0]).toEqual(['nosuch', 'now'])
  })
})
