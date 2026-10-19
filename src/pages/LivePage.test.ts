import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import LivePage from './LivePage.vue'
import { useLiveStore } from '@/stores/live-store'
import type { LiveStatus, LiveTurn } from '@/types/live'

const status: LiveStatus = {
  keepText: false,
  port: 11435,
  host: '0.0.0.0',
  listening: true,
  ollamaUrl: 'http://localhost:11434',
  startedAt: 0,
  turns: 0,
}

const closeStream = vi.fn()
vi.mock('@/services/live-client', () => ({
  fetchLiveStatus: vi.fn(),
  fetchLiveTurns: vi.fn(),
  fetchLiveTurnText: vi.fn().mockResolvedValue(null),
  setLiveKeepText: vi.fn(),
  clearLiveTurns: vi.fn(),
  retryLiveListen: vi.fn(),
  openLiveStream: vi.fn(() => closeStream),
  fetchLiveExport: vi.fn().mockResolvedValue({
    address: '', headerNames: [], includeText: false, enabled: false, source: 'none', url: null,
    state: 'off', sent: 0, runs: 0, failed: 0, lastSentAt: null, lastError: null,
  }),
  saveLiveExport: vi.fn(),
  testLiveExport: vi.fn(),
}))
import { fetchLiveStatus, fetchLiveTurns, setLiveKeepText, retryLiveListen, clearLiveTurns } from '@/services/live-client'

function turn(over: Partial<LiveTurn> = {}): LiveTurn {
  return {
    id: 'a',
    seq: 1,
    at: Date.UTC(2026, 9, 12, 14, 32, 8),
    durationMs: 4000,
    path: '/api/chat',
    protocol: 'ollama-chat',
    mode: 'agent',
    client: { id: 'copilot', label: 'VS Code Copilot', userAgent: 'GitHubCopilotChat/0.41.0' },
    model: 'qwen2.5-coder:14b',
    stream: true,
    status: 200,
    error: null,
    contextExceeded: null,
    prompt: { tokens: 11842, cached: 2110, evaluated: 9732, prefillMs: 3900, prefillTps: 2495, contextRequested: null },
    gen: { tokens: 412, ms: 13000, tps: 31.7, doneReason: 'stop' },
    toolCalls: ['read_file', 'replace_string_in_file'],
    toolsOffered: 31,
    toolNames: [],
    anatomy: { systemChars: 7000, toolsChars: 18000, historyChars: 20000, messageChars: 600, totalChars: 45600, messages: 9 },
    prefix: { breakChar: 8120, breakShare: 0.178, breakTokensEst: 2110, identical: false },
    fit: { contextLength: 32768, size: 9_000_000_000, sizeVram: 5_300_000_000, cpuShare: 0.41, runner: 'llamacpp' },
    textKept: false,
    ...over,
  }
}

/** Renders the real page: a missing i18n key or an undefined field fails here. */
function mountPage() {
  return mount(LivePage, { global: { stubs: { RouterLink: true } } })
}

describe('LivePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchLiveStatus).mockResolvedValue(status)
    vi.mocked(fetchLiveTurns).mockResolvedValue([])
    vi.mocked(setLiveKeepText).mockResolvedValue({ ...status, keepText: true })
  })

  it('opens on the setup when nothing has arrived: the address, the tabs, the pulse', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('http://localhost:11435')
    expect(text).toContain('Waiting for the first request')
    expect(text).toContain('ollama.endpoint')
    // Steps are rendered with the live address substituted in, not a placeholder.
    expect(text).not.toContain('{address}')
    await wrapper.findAll('button').find((b) => b.text() === 'Open WebUI')!.trigger('click')
    expect(wrapper.text()).toContain('host.docker.internal:11435')
    // No live chrome yet
    expect(text).not.toContain('Pause')
  })

  it('says so when the observe port could not be opened, and can ask the server to try again', async () => {
    vi.mocked(fetchLiveStatus).mockResolvedValue({ ...status, listening: false, error: 'port 11435 is already in use' })
    vi.mocked(retryLiveListen).mockResolvedValue({ ...status, listening: true })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('--observe-port')
    await wrapper.findAll('button').find((b) => b.text() === 'Try again')!.trigger('click')
    await flushPromises()
    expect(retryLiveListen).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Waiting for the first request')
  })

  it('switches to the live view on the first turn and renders its anatomy, break and client card', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const live = useLiveStore()
    live.turns.push(turn())
    live.selectedId = 'a'
    await flushPromises()
    const text = wrapper.text()
    expect(text).not.toContain('Waiting for the first request')
    expect(text).toContain('VS Code Copilot · agent')
    expect(text).toContain('11,842')
    expect(text).toContain('18%')
    expect(text).toContain('3.9 s')
    expect(text).toContain('Cache broke around token 2,110')
    expect(text).toContain('about 9,732 tokens')
    expect(text).toContain('41% on CPU')
    expect(text).toContain('read_file, replace_string_in_file')
    expect(text).toContain('Keep the prompt text')
    // One turn is not enough for a prefix finding, but the CPU one fires from the load facts.
    expect(text).toContain('qwen2.5-coder:14b runs 41% on CPU.')
    expect(text).not.toContain('re-reads about')
  })

  it('raises the prefix finding after three low-cache turns and jumps to its turn', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const live = useLiveStore()
    live.turns.push(turn({ id: 'a', seq: 1 }), turn({ id: 'b', seq: 2 }), turn({ id: 'c', seq: 3 }))
    live.selectedId = 'a'
    await flushPromises()
    expect(wrapper.text()).toContain('VS Code Copilot re-reads about 9,732 tokens on every turn')
    await wrapper.findAll('button').find((b) => b.text().startsWith('show the turn'))!.trigger('click')
    expect(live.selectedId).toBe('c')
  })

  it('shows the context-exceeded finding in one sentence from a single rejected turn', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const live = useLiveStore()
    live.turns.push(
      turn({
        id: 'r',
        status: 400,
        error: 'request (9415 tokens) exceeds the available context size (4096 tokens), try increasing it',
        contextExceeded: { promptTokens: 9415, contextLength: 4096 },
        model: 'deepseek-r1:8b',
        toolsOffered: 108,
        toolCalls: [],
      }),
    )
    live.selectedId = 'r'
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('VS Code Copilot sends 9,415-token prompts, but deepseek-r1:8b is loaded with a 4,096-token context. 1 request rejected.')
    expect(text).toContain('failed')
    expect(text).toContain('exceeds the available context size')
  })

  it('keeps the privacy toggle wired to the server setting', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('input[type=checkbox]').setValue(true)
    await flushPromises()
    expect(setLiveKeepText).toHaveBeenCalledWith(true)
    expect(useLiveStore().status?.keepText).toBe(true)
    expect(wrapper.text()).toContain('the prompts are kept too, on this machine, for 30 days')
  })

  it('says how long turns stay on disk, from the server, and where', async () => {
    vi.mocked(fetchLiveStatus).mockResolvedValue({ ...status, retentionDays: 7, textDir: '/home/me/.llmxray/observe' })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('only counts and timings are kept, on this machine, for 7 days')
    expect(wrapper.text()).toContain('Saved under /home/me/.llmxray/observe')
  })

  it('asks before Clear deletes the kept turns, and does nothing when the answer is no', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const live = useLiveStore()
    live.turns.push(turn())
    await flushPromises()
    const clear = wrapper.findAll('button').find((b) => b.text() === 'Clear')!
    // The test DOM has no confirm(); a stand-in answers instead of the person.
    const ask = vi.fn().mockReturnValueOnce(false)
    window.confirm = ask
    await clear.trigger('click')
    await flushPromises()
    expect(ask).toHaveBeenCalledWith('Forget every turn and every kept prompt, on disk too? This cannot be undone.')
    expect(clearLiveTurns).not.toHaveBeenCalled()
    expect(live.turns).toHaveLength(1)

    ask.mockReturnValueOnce(true)
    await clear.trigger('click')
    await flushPromises()
    expect(clearLiveTurns).toHaveBeenCalledTimes(1)
    expect(live.turns).toHaveLength(0)
  })

  it('closes the stream when the page goes away', async () => {
    const wrapper = mountPage()
    await flushPromises()
    wrapper.unmount()
    expect(closeStream).toHaveBeenCalled()
  })
})
