import {
  findVolatileSegments,
  commonPrefixLength,
  reuseRatio,
  hoistVolatileToEnd,
  compareProbes,
  mutateVolatile,
  probeFromChunk,
} from './cache-lab'
import type { CacheProbe } from '@/types/cache-lab'

describe('findVolatileSegments', () => {
  it('finds a full timestamp as ONE segment, not a date plus a time', () => {
    const segs = findVolatileSegments('[2026-09-14 16:04:11] You are a careful assistant.')
    expect(segs).toHaveLength(1)
    expect(segs[0]!.kind).toBe('timestamp')
    expect(segs[0]!.text).toBe('2026-09-14 16:04:11')
  })

  it('finds a bare date and a bare time separately', () => {
    const segs = findVolatileSegments('Today is 2026-09-14 and the meeting is at 16:04.')
    expect(segs.map((s) => s.kind)).toEqual(['date', 'time'])
  })

  it('claims a UUID whole rather than the digit runs inside it', () => {
    const segs = findVolatileSegments('session 3f2504e0-4f89-11d3-9a0c-0305e82c3301 begins')
    expect(segs).toHaveLength(1)
    expect(segs[0]!.kind).toBe('uuid')
  })

  it('returns segments in document order', () => {
    const segs = findVolatileSegments('id 99887766 then 2026-01-02 then 11:22')
    expect(segs.map((s) => s.start)).toEqual([...segs.map((s) => s.start)].sort((a, b) => a - b))
  })

  it('finds nothing in a fully stable prompt', () => {
    expect(findVolatileSegments('You are a careful assistant. Answer briefly.')).toEqual([])
  })

  it('reports offsets that actually slice the segment out of the text', () => {
    const text = 'at 2026-09-14 16:04:11 sharp'
    const [seg] = findVolatileSegments(text)
    expect(text.slice(seg!.start, seg!.end)).toBe(seg!.text)
  })
})

describe('commonPrefixLength', () => {
  it('counts the shared leading characters', () => {
    // shared run is "You are ca"
    expect(commonPrefixLength('You are careful', 'You are cautious')).toBe(10)
  })

  it('is 0 when the very first character differs — the worst cache case', () => {
    expect(commonPrefixLength('[ts] You are', 'You are')).toBe(0)
  })

  it('handles one string being a prefix of the other', () => {
    expect(commonPrefixLength('abc', 'abcdef')).toBe(3)
  })

  it('handles empty input', () => {
    expect(commonPrefixLength('', 'abc')).toBe(0)
  })
})

describe('reuseRatio', () => {
  it('is the cached share of the prompt', () => {
    expect(reuseRatio(324, 290)).toBeCloseTo(0.895, 3)
  })

  it('is undefined when the daemon reported nothing — not zero', () => {
    expect(reuseRatio(324, undefined)).toBeUndefined()
  })

  it('clamps a cached count above the total', () => {
    expect(reuseRatio(100, 999)).toBe(1)
  })

  it('is undefined for an empty prompt rather than dividing by zero', () => {
    expect(reuseRatio(0, 0)).toBeUndefined()
  })
})

describe('hoistVolatileToEnd', () => {
  it('moves a leading timestamp to the end, leaving the stable text as the prefix', () => {
    const text = '[2026-09-14 16:04:11] You are a careful assistant.'
    const out = hoistVolatileToEnd(text, findVolatileSegments(text))
    expect(out.startsWith('[] You are a careful assistant.')).toBe(true)
    expect(out.trimEnd().endsWith('2026-09-14 16:04:11')).toBe(true)
  })

  it('preserves the order of several moved segments', () => {
    const text = 'a 2026-01-02 b 2026-03-04 c'
    const out = hoistVolatileToEnd(text, findVolatileSegments(text))
    expect(out.indexOf('2026-01-02')).toBeLessThan(out.indexOf('2026-03-04'))
  })

  it('returns the text untouched when there is nothing volatile', () => {
    const text = 'You are a careful assistant.'
    expect(hoistVolatileToEnd(text, [])).toBe(text)
  })

  it('keeps every stable word — the rewrite must not lose content', () => {
    const text = 'Follow the style guide at 2026-09-14 closely please'
    const out = hoistVolatileToEnd(text, findVolatileSegments(text))
    for (const word of ['Follow', 'style', 'guide', 'closely', 'please']) {
      expect(out).toContain(word)
    }
  })
})

describe('probeFromChunk', () => {
  // The exact shape Ollama 0.33.3 returns
  it('derives evaluated tokens and reuse from a reported chunk', () => {
    const p = probeFromChunk('original', 'sys', {
      prompt_eval_count: 324,
      prompt_eval_cached_count: 290,
      prompt_eval_duration: 18_800_000,
    })
    expect(p.promptTokens).toBe(324)
    expect(p.cachedTokens).toBe(290)
    expect(p.evaluatedTokens).toBe(34)
    expect(p.prefillMs).toBeCloseTo(18.8)
    expect(p.reuse).toBeCloseTo(0.895, 3)
  })

  it('treats the whole prompt as evaluated when the daemon reports no cache field', () => {
    const p = probeFromChunk('original', 'sys', {
      prompt_eval_count: 303,
      prompt_eval_duration: 110_600_000,
    })
    expect(p.cachedTokens).toBeUndefined()
    expect(p.reuse).toBeUndefined()
    expect(p.evaluatedTokens).toBe(303)
  })
})

describe('compareProbes', () => {
  // Numbers measured against a live Ollama 0.33.3 daemon (qwen2.5:7b):
  // the same 324-token prompt with a timestamp at the front vs at the back.
  const atStart: CacheProbe = {
    label: 'original', text: '', promptTokens: 324, cachedTokens: 3,
    evaluatedTokens: 321, prefillMs: 65.6, reuse: 3 / 324,
  }
  const atEnd: CacheProbe = {
    label: 'rewritten', text: '', promptTokens: 324, cachedTokens: 290,
    evaluatedTokens: 34, prefillMs: 18.8, reuse: 290 / 324,
  }

  it('reports the tokens the rewrite saved from re-evaluation', () => {
    expect(compareProbes(atStart, atEnd).tokensSaved).toBe(287)
  })

  it('reports the prefill milliseconds saved per turn', () => {
    expect(compareProbes(atStart, atEnd).msSaved).toBeCloseTo(46.8)
  })

  it('reports the prefill speed-up', () => {
    expect(compareProbes(atStart, atEnd).speedup).toBeCloseTo(3.49, 2)
  })

  it('does not divide by zero when the rewrite prefilled instantly', () => {
    const instant = { ...atEnd, prefillMs: 0 }
    expect(compareProbes(atStart, instant).speedup).toBe(0)
    expect(Number.isFinite(compareProbes(atStart, instant).speedup)).toBe(true)
  })

  it('reports a negative saving when the rewrite made things worse', () => {
    expect(compareProbes(atEnd, atStart).tokensSaved).toBe(-287)
  })
})

describe('mutateVolatile', () => {
  it('changes the value but keeps the layout byte-for-byte around it', () => {
    const text = '[2026-09-14 16:04:11] You are a careful assistant.'
    const next = mutateVolatile(text)
    expect(next).not.toBe(text)
    expect(next.length).toBe(text.length)
    expect(next.endsWith('] You are a careful assistant.')).toBe(true)
  })

  it('leaves a prompt with nothing volatile completely untouched', () => {
    const text = 'You are a careful assistant.'
    expect(mutateVolatile(text)).toBe(text)
  })

  it('changes every volatile span, not just the first', () => {
    const text = 'a 2026-01-02 b 3f2504e0-4f89-11d3-9a0c-0305e82c3301 c'
    const next = mutateVolatile(text)
    expect(next).not.toContain('2026-01-02')
    expect(next).not.toContain('3f2504e0-4f89-11d3-9a0c-0305e82c3301')
  })

  it('keeps the stable words identical — only the values move', () => {
    const text = 'Follow the style guide at 2026-09-14 closely'
    const next = mutateVolatile(text)
    expect(next.startsWith('Follow the style guide at ')).toBe(true)
    expect(next.endsWith(' closely')).toBe(true)
  })

  // The rewrite is only worth measuring if its own next turn keeps the prefix.
  it('a hoisted layout keeps a long shared prefix across a value change', () => {
    const original = '[2026-09-14 16:04:11] ' + 'stable text here. '.repeat(20)
    const rewritten = hoistVolatileToEnd(original, findVolatileSegments(original))

    const originalNext = mutateVolatile(original)
    const rewrittenNext = mutateVolatile(rewritten)

    // Original: the value sits at the front, so almost nothing survives
    expect(commonPrefixLength(original, originalNext)).toBeLessThan(5)
    // Rewritten: the value sits at the back, so the whole body survives
    expect(commonPrefixLength(rewritten, rewrittenNext)).toBeGreaterThan(300)
  })
})
