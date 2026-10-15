import { describe, it, expect } from 'vitest'
import { buildGpuMap } from './gpu-map'
import type { OllamaModel, OllamaRunningModel } from '@/types/ollama'

const GB = 1024 ** 3
const now = Date.UTC(2026, 9, 16, 2, 0, 0)

function pulled(name: string, gb: number, params = '7.5B'): OllamaModel {
  return { name, model: name, modified_at: '', size: gb * GB, digest: '', details: { parameter_size: params, quantization_level: 'Q4_K_M', family: 'x', families: [], format: 'gguf', parent_model: '' } } as unknown as OllamaModel
}
function running(name: string, gb: number, vramGb: number, ctx: number, expiresAt: string): OllamaRunningModel {
  return { name, model: name, size: gb * GB, size_vram: vramGb * GB, context_length: ctx, expires_at: expiresAt, digest: '', details: {} } as unknown as OllamaRunningModel
}

describe('buildGpuMap', () => {
  it('splits a loaded model into weights and what the context costs, and knows what is free', () => {
    const m = buildGpuMap([running('gemma4:latest', 7.4, 7.4, 32768, new Date(now + 4 * 60_000).toISOString())], [pulled('gemma4:latest', 6.1)], 12 * GB, now)
    const b = m.blocks[0]!
    expect(b.weightsBytes).toBe(6.1 * GB)
    expect(b.contextBytes).toBeCloseTo(1.3 * GB, -6)
    expect(b.cpuBytes).toBe(0)
    expect(b.expiresInMs).toBe(4 * 60_000)
    expect(m.freeBytes).toBeCloseTo(4.6 * GB, -6)
  })

  it('shows the part of a model that spilled to system RAM, and a keep-forever as forever', () => {
    const m = buildGpuMap([running('qwen2.5:14b', 11, 9, 65536, '2126-01-01T00:00:00Z')], [], 12 * GB, now)
    expect(m.blocks[0]!.cpuBytes).toBe(2 * GB)
    expect(m.blocks[0]!.contextBytes).toBeNull()
    expect(m.blocks[0]!.expiresInMs).toBe(Infinity)
  })

  it('says which pulled models would fit now, which only alone, and which never', () => {
    const m = buildGpuMap(
      [running('gemma4:latest', 7.4, 7.4, 32768, new Date(now + 60_000).toISOString())],
      [pulled('gemma4:latest', 6.1), pulled('qwen2.5:3b', 1.8, '3B'), pulled('qwen2.5:14b', 8.4, '14.8B'), pulled('big:70b', 40, '70B')],
      12 * GB,
      now,
    )
    const v = Object.fromEntries(m.candidates.map((c) => [c.name, c.verdict]))
    expect(v).toEqual({ 'qwen2.5:3b': 'fits-now', 'qwen2.5:14b': 'fits-alone', 'big:70b': 'too-big' })
    expect(m.candidates.map((c) => c.name)[0]).toBe('big:70b')
  })

  it('works without a video memory figure: no free space, every candidate fits-now by default', () => {
    const m = buildGpuMap([], [pulled('a', 4)], null, now)
    expect(m.freeBytes).toBeNull()
    expect(m.candidates[0]!.verdict).toBe('fits-now')
  })
})
