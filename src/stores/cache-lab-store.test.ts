import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useCacheLabStore } from './cache-lab-store'
import { ollamaClient } from '@/services/ollama-client'

vi.mock('@/services/ollama-client', () => ({
  ollamaClient: { chat: vi.fn() },
}))

/**
 * Only the daemon is mocked. The store drives the real cache-lab service —
 * real volatile detection, real rewrite, real probe arithmetic — so these
 * exercise the shipped logic rather than a restatement of it.
 */
function mockDaemon(byPrompt: (system: string) => { total: number; cached: number; ms: number }) {
  vi.mocked(ollamaClient.chat).mockImplementation(async (req) => {
    const system = req.messages.find((m) => m.role === 'system')?.content ?? ''
    const { total, cached, ms } = byPrompt(system)
    return {
      model: req.model,
      created_at: '',
      message: { role: 'assistant' as const, content: 'hi' },
      done: true,
      prompt_eval_count: total,
      prompt_eval_cached_count: cached,
      prompt_eval_duration: ms * 1_000_000,
      eval_count: 1,
      eval_duration: 1_000_000,
    }
  })
}

const VOLATILE_FIRST = '[2026-09-14 16:04:11] You are careful. ' + 'Stable body text. '.repeat(20)

describe('cache-lab store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(ollamaClient.chat).mockReset()
  })

  it('spots the volatile span and the share of the prompt it forfeits', () => {
    const lab = useCacheLabStore()
    lab.systemPrompt = VOLATILE_FIRST

    expect(lab.volatileSegments).toHaveLength(1)
    expect(lab.volatileSegments[0]!.kind).toBe('timestamp')
    // It sits at the very front, so nearly the whole prompt is downstream of it
    expect(lab.earliestVolatileRatio).toBeLessThan(0.02)
  })

  it('will not run without a model', async () => {
    const lab = useCacheLabStore()
    lab.systemPrompt = VOLATILE_FIRST
    expect(lab.canRun).toBe(false)

    await lab.run()
    expect(ollamaClient.chat).not.toHaveBeenCalled()
  })

  it('sends each layout TWICE — the second send is the measurement', async () => {
    const lab = useCacheLabStore()
    lab.model = 'test-model'
    lab.systemPrompt = VOLATILE_FIRST
    mockDaemon(() => ({ total: 100, cached: 50, ms: 10 }))

    await lab.run()

    // 2 layouts x (seat + measure)
    expect(vi.mocked(ollamaClient.chat).mock.calls).toHaveLength(4)
    expect(lab.probes.map((p) => p.label)).toEqual(['original', 'rewritten'])
  })

  it('reports the measured win when the rewrite keeps more of the prefix', async () => {
    const lab = useCacheLabStore()
    lab.model = 'test-model'
    lab.systemPrompt = VOLATILE_FIRST

    // A daemon that behaves the way a real one does: a prompt whose volatile
    // value sits at the FRONT keeps almost nothing; at the back it keeps nearly all.
    mockDaemon((system) => {
      // Match the SHAPE, not the digits: the lab mutates values between turns,
      // so the literal year will have changed by the second send.
      const at = system.search(/\d{4}-\d{2}-\d{2}/)
      const volatileIsEarly = at >= 0 && at < 40
      return volatileIsEarly
        ? { total: 324, cached: 4, ms: 64.6 }
        : { total: 324, cached: 290, ms: 18.6 }
    })

    await lab.run()

    expect(lab.status).toBe('completed')
    const [original, rewritten] = lab.probes
    expect(original!.cachedTokens).toBe(4)
    expect(rewritten!.cachedTokens).toBe(290)

    expect(lab.verdict).not.toBeNull()
    expect(lab.verdict!.tokensSaved).toBe(286)
    expect(lab.verdict!.speedup).toBeCloseTo(3.47, 1)
  })

  it('offers no verdict when there is nothing volatile to move', async () => {
    const lab = useCacheLabStore()
    lab.model = 'test-model'
    lab.systemPrompt = 'You are a careful assistant with nothing that changes.'
    mockDaemon(() => ({ total: 12, cached: 12, ms: 1 }))

    await lab.run()

    expect(lab.volatileSegments).toEqual([])
    // The rewrite is identical to the original, so a "saving" would be noise
    expect(lab.verdict).toBeNull()
    expect(lab.status).toBe('completed')
  })

  it('surfaces a daemon failure instead of reporting a bogus measurement', async () => {
    const lab = useCacheLabStore()
    lab.model = 'test-model'
    lab.systemPrompt = VOLATILE_FIRST
    vi.mocked(ollamaClient.chat).mockRejectedValue(new Error('model not found'))

    await lab.run()

    expect(lab.status).toBe('error')
    expect(lab.error).toBe('model not found')
    expect(lab.verdict).toBeNull()
  })

  it('leaves cache metrics undefined on a daemon that does not report them', async () => {
    const lab = useCacheLabStore()
    lab.model = 'test-model'
    lab.systemPrompt = VOLATILE_FIRST
    vi.mocked(ollamaClient.chat).mockResolvedValue({
      model: 'test-model',
      created_at: '',
      message: { role: 'assistant', content: 'hi' },
      done: true,
      prompt_eval_count: 100,
      prompt_eval_duration: 10_000_000,
      eval_count: 1,
      eval_duration: 1_000_000,
    })

    await lab.run()

    expect(lab.probes[0]!.cachedTokens).toBeUndefined()
    expect(lab.probes[0]!.reuse).toBeUndefined()
    expect(lab.probes[0]!.evaluatedTokens).toBe(100)
  })
})
