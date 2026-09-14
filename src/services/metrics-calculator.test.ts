import { calculateMetrics } from './metrics-calculator'

describe('calculateMetrics', () => {
  const baseChunk = {
    total_duration: 5_000_000_000,
    load_duration: 1_000_000_000,
    prompt_eval_duration: 500_000_000,
    eval_duration: 2_000_000_000,
    prompt_eval_count: 50,
    eval_count: 100,
  }

  it('computes tokensPerSecond correctly', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [10])
    // eval_count / eval_duration_ms * 1000 = 100 / 2000 * 1000 = 50
    expect(result.tokensPerSecond).toBeCloseTo(50)
  })

  it('computes promptTokensPerSecond correctly', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [10])
    // No cached count reported, so all 50 prompt tokens were evaluated:
    // 50 / 500ms * 1000 = 100
    expect(result.promptTokensPerSecond).toBeCloseTo(100)
  })

  // Ollama 0.33.3: prompt_eval_duration times only the UNCACHED tokens while
  // prompt_eval_count stays the total. Dividing by the total inflates the
  // prefill rate by the cache hit ratio.
  it('excludes cached prompt tokens from promptTokensPerSecond', () => {
    const chunk = { ...baseChunk, prompt_eval_cached_count: 40 }
    const result = calculateMetrics('s1', 'llama3', Date.now(), chunk, [10])
    // (50 - 40) / 500ms * 1000 = 20, NOT 100
    expect(result.promptTokensPerSecond).toBeCloseTo(20)
  })

  it('reports 0 prefill rate when the whole prompt came from cache', () => {
    const chunk = { ...baseChunk, prompt_eval_cached_count: 50 }
    const result = calculateMetrics('s1', 'llama3', Date.now(), chunk, [10])
    expect(result.promptTokensPerSecond).toBe(0)
    expect(result.promptCacheHitRate).toBeCloseTo(1)
  })

  it('exposes the cached count and hit rate', () => {
    const chunk = { ...baseChunk, prompt_eval_cached_count: 40 }
    const result = calculateMetrics('s1', 'llama3', Date.now(), chunk, [10])
    expect(result.cachedPromptTokenCount).toBe(40)
    expect(result.promptCacheHitRate).toBeCloseTo(0.8)
    // prompt_eval_count remains the TOTAL — the cached share is not deducted
    expect(result.promptTokenCount).toBe(50)
    expect(result.totalTokenCount).toBe(150)
  })

  it('leaves cache metrics undefined when the daemon does not report them', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [10])
    // Undefined, not 0 — a pre-0.33.3 daemon said nothing, which is not the
    // same claim as "nothing was cached".
    expect(result.cachedPromptTokenCount).toBeUndefined()
    expect(result.promptCacheHitRate).toBeUndefined()
  })

  it('clamps a cached count that exceeds the prompt total', () => {
    const chunk = { ...baseChunk, prompt_eval_cached_count: 999 }
    const result = calculateMetrics('s1', 'llama3', Date.now(), chunk, [10])
    expect(result.cachedPromptTokenCount).toBe(50)
    expect(result.promptTokensPerSecond).toBe(0)
    expect(result.promptCacheHitRate).toBeCloseTo(1)
  })

  it('TTFT is the first entry in tokenLatencies', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [42, 10, 8])
    expect(result.ttftMs).toBe(42)
  })

  it('TTFT is 0 when tokenLatencies is empty', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [])
    expect(result.ttftMs).toBe(0)
  })

  it('totalTokenCount = promptTokenCount + completionTokenCount', () => {
    const result = calculateMetrics('s1', 'llama3', Date.now(), baseChunk, [10])
    expect(result.totalTokenCount).toBe(result.promptTokenCount + result.completionTokenCount)
  })

  it('handles zero eval_duration without division by zero', () => {
    const chunk = { ...baseChunk, eval_duration: 0 }
    const result = calculateMetrics('s1', 'llama3', Date.now(), chunk, [10])
    expect(result.tokensPerSecond).toBe(0)
    expect(Number.isFinite(result.tokensPerSecond)).toBe(true)
  })

  it('handles all-zero chunk values gracefully', () => {
    const zeroChunk = {
      total_duration: 0,
      load_duration: 0,
      prompt_eval_duration: 0,
      eval_duration: 0,
      prompt_eval_count: 0,
      eval_count: 0,
    }
    const result = calculateMetrics('s1', 'llama3', Date.now(), zeroChunk, [])
    expect(result.tokensPerSecond).toBe(0)
    expect(result.promptTokensPerSecond).toBe(0)
    expect(result.totalTokenCount).toBe(0)
    expect(Number.isFinite(result.ttftMs)).toBe(true)
  })

  it('returns correct sessionId and model', () => {
    const result = calculateMetrics('session-abc', 'mistral', Date.now(), baseChunk, [5])
    expect(result.sessionId).toBe('session-abc')
    expect(result.model).toBe('mistral')
  })
})
