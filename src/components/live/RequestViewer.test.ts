import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequestViewer from './RequestViewer.vue'

/** A Copilot-shaped request, small enough to reason about by hand. */
const tools = [
  { type: 'function', function: { name: 'read_file', description: 'Read a file from disk', parameters: { type: 'object', properties: { path: { type: 'string' } } } } },
  { type: 'function', function: { name: 'powershell', description: 'Run a command', parameters: { type: 'object', properties: { cmd: { type: 'string' }, cwd: { type: 'string' } } } } },
]
const request = {
  model: 'gemma4:latest',
  stream: true,
  options: { num_ctx: 65536 },
  messages: [
    { role: 'system', content: 'You are an AI assistant using Copilot SDK in VS Code.' },
    { role: 'user', content: '<current_datetime>2026-10-12T13:24</current_datetime>\n\nSummarise the workspace.' },
    { role: 'assistant', content: '', tool_calls: [{ function: { name: 'read_file', arguments: { path: 'README.md' } } }] },
    { role: 'tool', content: 'x'.repeat(2000) },
    { role: 'user', content: '<current_datetime>2026-10-12T13:25</current_datetime>\n\nNow translate it.' },
  ],
}

/** Canonical form exactly as the proxy builds it: system, tools, then the rest. */
function canonical(): string {
  const parts = [
    `<system>${request.messages[0]!.content}`,
    `<tools>${JSON.stringify(tools)}`,
    `<user>${request.messages[1]!.content}`,
    `<assistant>${JSON.stringify(request.messages[2]!.tool_calls)}`,
    `<tool>${request.messages[3]!.content}`,
    `<user>${request.messages[4]!.content}`,
  ]
  return parts.join('\n')
}

function mountViewer(breakChar: number | null = null) {
  return mount(RequestViewer, {
    props: { request: { ...request, tools }, protocol: 'ollama-chat', breakChar, promptTokens: 10_000 },
  })
}

describe('RequestViewer', () => {
  it('renders the conversation, the options and the tool list instead of raw JSON', () => {
    const w = mountViewer()
    const text = w.text()
    expect(text).toContain('5 messages')
    expect(text).toContain('2 tools')
    expect(text).toContain('gemma4:latest')
    expect(text).toContain('{"num_ctx":65536}')
    expect(text).toContain('read_file')
    expect(text).toContain('2 parameters')
    // Real line breaks, not escaped ones.
    expect(w.find('[data-testid="message-1"]').text()).toContain('Summarise the workspace.')
    expect(w.html()).not.toContain('\\n')
    // Tool results are collapsed by default and can be expanded.
    const toolMsg = w.find('[data-testid="message-3"]')
    expect(toolMsg.text()).toContain('Show all (2,000 characters)')
    expect(toolMsg.text()).not.toContain('x'.repeat(700))
  })

  it('draws the cache break inside the message where the proxy found it', () => {
    const c = canonical()
    // The break is the second datetime: first differing character of the last user message.
    const at = c.indexOf('2026-10-12T13:25')
    const w = mountViewer(at)
    const last = w.find('[data-testid="message-4"]')
    expect(last.text()).toContain('Cache broke here')
    expect(w.findAll('[data-testid^="message-"]').filter((m) => m.text().includes('Cache broke here'))).toHaveLength(1)
    // Everything from the break on is marked.
    const marked = last.findAll('span.bg-error\\/10').map((s) => s.text()).join('')
    expect(marked).toContain('2026-10-12T13:25')
    expect(marked).toContain('Now translate it.')
    expect(marked).not.toContain('<current_datetime>2026')
  })

  it('says when the break fell inside the tool schemas', () => {
    const c = canonical()
    const w = mountViewer(c.indexOf('"name":"powershell"'))
    expect(w.text()).toContain('The cache broke inside the tool schemas')
    expect(w.text()).not.toContain('Cache broke here')
  })

  it('searches across messages and tools, and filters the tool list', async () => {
    const w = mountViewer()
    await w.find('input[type=search]').setValue('current_datetime')
    expect(w.text()).toContain('4 matches')
    expect(w.findAll('mark').length).toBe(4)
    await w.find('input[type=search]').setValue('powershell')
    expect(w.findAll('[data-testid^="tool-"]')).toHaveLength(1)
    expect(w.find('[data-testid="tool-1"]').exists()).toBe(true)
  })

  it('keeps every byte reachable on the Raw tab', async () => {
    const w = mountViewer()
    await w.findAll('button').find((b) => b.text() === 'Raw JSON')!.trigger('click')
    await nextTick()
    const raw = w.find('[data-testid="raw-json"]').text()
    expect(JSON.parse(raw)).toEqual({ ...request, tools })
  })

  it('renders generate and embed bodies without a messages array', () => {
    const gen = mount(RequestViewer, { props: { request: { model: 'm', system: 'sys', prompt: 'write a haiku' }, protocol: 'ollama-generate', breakChar: null, promptTokens: null } })
    expect(gen.text()).toContain('write a haiku')
    expect(gen.text()).toContain('system')
    const emb = mount(RequestViewer, { props: { request: { model: 'e', input: ['a', 'b'] }, protocol: 'ollama-embed', breakChar: null, promptTokens: null } })
    expect(emb.text()).toContain('input')
  })
})
