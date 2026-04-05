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
    // prompt_eval_count / prompt_eval_duration_ms * 1000 = 50 / 500 * 1000 = 100
    expect(result.promptTokensPerSecond).toBeCloseTo(100)
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
