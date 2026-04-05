import { approximateTokenCount } from './token-counter'

describe('approximateTokenCount', () => {
  it('returns 0 for empty string', () => {
    expect(approximateTokenCount('')).toBe(0)
  })

  it('English: ~1.3 tokens per word for multiple words', () => {
    // "hello world" → 2 words → ceil(2 * 1.3) = 3
    expect(approximateTokenCount('hello world')).toBe(3)
  })

  it('English: single word', () => {
    // 1 word → ceil(1 * 1.3) = 2
    expect(approximateTokenCount('hello')).toBe(2)
  })

  it('CJK locale zh: 1 token per character', () => {
    // "你好世界" → 4 characters → 4
    expect(approximateTokenCount('你好世界', 'zh')).toBe(4)
  })

  it('CJK locale ja: same behavior as zh', () => {
    expect(approximateTokenCount('こんにちは', 'ja')).toBe(5)
  })

  it('CJK: whitespace is stripped before counting', () => {
    expect(approximateTokenCount('你好 世界', 'zh')).toBe(4)
  })

  it('handles multi-line text correctly', () => {
    const text = 'hello world\nfoo bar baz'
    // 5 words → ceil(5 * 1.3) = 7
    expect(approximateTokenCount(text)).toBe(7)
  })
})
