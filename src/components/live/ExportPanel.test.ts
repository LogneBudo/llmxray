import { mount, flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import ExportPanel from './ExportPanel.vue'
import type { LiveExport } from '@/types/live'

const off: LiveExport = {
  address: '', headerNames: [], includeText: false, enabled: false, source: 'none', url: null,
  state: 'off', sent: 0, runs: 0, failed: 0, lastSentAt: null, lastError: null,
}

vi.mock('@/services/live-client', () => ({
  fetchLiveExport: vi.fn(),
  saveLiveExport: vi.fn(),
  testLiveExport: vi.fn(),
}))
import { fetchLiveExport, saveLiveExport, testLiveExport } from '@/services/live-client'

function mountPanel(keepText = false) {
  return mount(ExportPanel, { props: { keepText, configDir: '/home/me/.llmxray/observe' } })
}

describe('ExportPanel', () => {
  beforeEach(() => {
    vi.mocked(fetchLiveExport).mockResolvedValue(off)
    vi.mocked(saveLiveExport).mockReset()
    vi.mocked(testLiveExport).mockReset()
  })

  it('starts off, says nothing leaves, and cannot start without an address', async () => {
    const w = mountPanel()
    await flushPromises()
    expect(w.text()).toContain('Off. Nothing leaves this machine.')
    const start = w.findAll('button').find((b) => b.text() === 'Start sending')!
    expect(start.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Kept as written in /home/me/.llmxray/export.json')
  })

  it('starts sending to the typed address with the typed headers, then clears the headers box', async () => {
    // Like the server: each save applies its change to the settings it holds.
    let held: LiveExport = { ...off }
    vi.mocked(saveLiveExport).mockImplementation(async (change) => {
      held = { ...held, ...change, headerNames: change.headers ? ['Authorization'] : held.headerNames } as LiveExport
      if (held.address) held.url = `${held.address}/v1/traces`
      held.state = held.enabled && held.address ? 'sending' : 'off'
      return held
    })
    const w = mountPanel()
    await flushPromises()
    await w.find('#export-address').setValue('http://localhost:4318')
    await w.find('#export-headers').setValue('Authorization: Basic abc')
    await w.findAll('button').find((b) => b.text() === 'Start sending')!.trigger('click')
    await flushPromises()
    // Leaving each box saved it; Start then switches sending on.
    expect(saveLiveExport).toHaveBeenCalledWith({ address: 'http://localhost:4318' })
    expect(saveLiveExport).toHaveBeenCalledWith({ headers: 'Authorization: Basic abc' })
    expect(saveLiveExport).toHaveBeenLastCalledWith({ enabled: true, address: 'http://localhost:4318' })
    expect(held.enabled).toBe(true)
    expect((w.find('#export-headers').element as HTMLTextAreaElement).value).toBe('')
    expect(w.text()).toContain('Set: Authorization.')
    expect(w.text()).toContain('Sending to http://localhost:4318/v1/traces. Waiting for the first turn.')
    expect(w.findAll('button').some((b) => b.text() === 'Stop sending')).toBe(true)
  })

  it('keeps Include text off and locked while Keep text is off', async () => {
    const w = mountPanel(false)
    await flushPromises()
    const box = w.findAll('input[type=checkbox]').at(0)!
    expect(box.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Needs "Keep the prompt text" above.')
  })

  it('switches the text off on the server when Keep text goes off', async () => {
    vi.mocked(fetchLiveExport).mockResolvedValue({ ...off, includeText: true })
    vi.mocked(saveLiveExport).mockResolvedValue({ ...off, includeText: false })
    const w = mountPanel(true)
    await flushPromises()
    await w.setProps({ keepText: false })
    await flushPromises()
    expect(saveLiveExport).toHaveBeenCalledWith({ includeText: false })
  })

  it('says why sending fails, in words', async () => {
    vi.mocked(fetchLiveExport).mockResolvedValue({ ...off, address: 'http://localhost:4318', enabled: true, url: 'http://localhost:4318/v1/traces', state: 'failing', failed: 3, lastError: 'ECONNREFUSED' })
    const w = mountPanel()
    await flushPromises()
    expect(w.text()).toContain('Cannot reach http://localhost:4318/v1/traces: ECONNREFUSED. Turns not sent: 3')
  })

  it('reports a test span that arrived, and one that did not', async () => {
    vi.mocked(fetchLiveExport).mockResolvedValue({ ...off, address: 'http://localhost:4318' })
    vi.mocked(saveLiveExport).mockResolvedValue({ ...off, address: 'http://localhost:4318' })
    vi.mocked(testLiveExport).mockResolvedValueOnce({ ok: true, url: 'http://localhost:4318/v1/traces' })
    const w = mountPanel()
    await flushPromises()
    const test = w.findAll('button').find((b) => b.text() === 'Send a test span')!
    await test.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Test span sent to http://localhost:4318/v1/traces. Look for llmxray in your viewer.')
    vi.mocked(testLiveExport).mockResolvedValueOnce({ ok: false, url: 'http://localhost:4318/v1/traces', error: 'HTTP 401' })
    await test.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('The test span did not arrive at http://localhost:4318/v1/traces: HTTP 401')
  })

  it('fills the address from a destination', async () => {
    vi.mocked(saveLiveExport).mockResolvedValue({ ...off, address: 'http://localhost:6006' })
    const w = mountPanel()
    await flushPromises()
    const uses = w.findAll('button').filter((b) => b.text() === 'Use this address')
    await uses[1].trigger('click')
    await flushPromises()
    expect(saveLiveExport).toHaveBeenCalledWith({ address: 'http://localhost:6006' })
  })
})
