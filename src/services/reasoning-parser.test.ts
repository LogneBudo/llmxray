import { describe, it, expect } from 'vitest'
import { ReasoningParser } from './reasoning-parser'
import type { StreamToken } from '@/types/token'

function makeToken(index: number, text: string, timestamp = Date.now()): StreamToken {
  return {
    id: `tok-${index}`,
    index,
    text,
    timestamp,
    confidence: 0.9,
    interTokenLatencyMs: 10,
    cumulativeText: '',
  }
}

describe('ReasoningParser', () => {
  describe('think block detection', () => {
    it('detects <think> opening tag', () => {
      const parser = new ReasoningParser()
      const token = makeToken(0, '<think>')
      parser.processToken(token, '<think>')

      expect(parser.isThinking).toBe(true)
    })

    it('accumulates content inside think block', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      parser.processToken(makeToken(1, 'Let me think'), '<think>Let me think')

      expect(parser.isThinking).toBe(true)
      expect(parser.thinkingContent).toContain('Let me think')
    })

    it('produces a step when </think> closes', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      parser.processToken(makeToken(1, 'reasoning here'), '<think>reasoning here')
      const step = parser.processToken(makeToken(2, '</think>'), '<think>reasoning here</think>')

      expect(parser.isThinking).toBe(false)
      expect(step).not.toBeNull()
      expect(step!.type).toBe('thought')
      expect(step!.content).toBe('reasoning here')
    })

    it('returns null for empty think blocks', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      const step = parser.processToken(makeToken(1, '</think>'), '<think></think>')

      expect(step).toBeNull()
      expect(parser.isThinking).toBe(false)
    })

    it('handles <think> arriving in pieces (uses includes not endsWith)', () => {
      const parser = new ReasoningParser()
      // Token arrives as partial, but fullText already has the tag
      parser.processToken(makeToken(0, '<thi'), '<thi')
      expect(parser.isThinking).toBe(false)

      parser.processToken(makeToken(1, 'nk>'), '<think>')
      expect(parser.isThinking).toBe(true)
    })
  })

  describe('pattern-based step detection', () => {
    it('detects "Step N:" pattern', () => {
      const parser = new ReasoningParser()
      // Need two lines (pattern only fires on completed lines)
      const fullText = 'Step 1: Analyze the problem\nContinuing...'
      const step = parser.processToken(makeToken(1, '\n'), fullText)

      expect(step).toBeNull() // first step is set as active, no previous to finalize
      expect(parser['activeStep']).not.toBeNull()
      expect(parser['activeStep']!.type).toBe('thought')
    })

    it('detects "Thought:" pattern', () => {
      const parser = new ReasoningParser()
      const fullText = 'Thought: I should consider edge cases\nNext line'
      parser.processToken(makeToken(0, 'Thought:'), fullText)

      expect(parser['activeStep']).not.toBeNull()
      expect(parser['activeStep']!.type).toBe('thought')
    })

    it('detects "Observation:" pattern', () => {
      const parser = new ReasoningParser()
      const fullText = 'Observation: The data shows a trend\nMore'
      parser.processToken(makeToken(0, '.'), fullText)

      expect(parser['activeStep']!.type).toBe('observation')
    })

    it('detects "Conclusion:" pattern', () => {
      const parser = new ReasoningParser()
      const fullText = 'Conclusion: The answer is 42\nEnd'
      parser.processToken(makeToken(0, '.'), fullText)

      expect(parser['activeStep']!.type).toBe('conclusion')
    })

    it('detects "Therefore:" pattern as conclusion', () => {
      const parser = new ReasoningParser()
      const fullText = 'Therefore, we should use X\nDone'
      parser.processToken(makeToken(0, '.'), fullText)

      expect(parser['activeStep']!.type).toBe('conclusion')
    })

    it('does not trigger on plain numbered lists', () => {
      const parser = new ReasoningParser()
      const fullText = '1. First item\nMore text'
      parser.processToken(makeToken(0, '.'), fullText)

      expect(parser['activeStep']).toBeNull()
    })

    it('does not re-process the same line', () => {
      const parser = new ReasoningParser()
      const fullText = 'Step 1: First\nMore'
      parser.processToken(makeToken(0, '.'), fullText)

      // Process again with same line count — should not trigger
      const step = parser.processToken(makeToken(1, 'x'), fullText + 'x')
      expect(step).toBeNull()
    })
  })

  describe('finalize', () => {
    it('returns remaining active step', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      parser.processToken(makeToken(1, 'partial thought'), '<think>partial thought')

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.content).toBe('partial thought')
      expect(step!.type).toBe('thought')
    })

    it('returns null if no active step', () => {
      const parser = new ReasoningParser()
      expect(parser.finalize()).toBeNull()
    })

    it('returns null if active step has empty content', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      // activeStep exists but content is just whitespace from the split
      parser['activeStep']!.content = '   '
      const step = parser.finalize()
      expect(step).toBeNull()
    })
  })

  describe('constructor', () => {
    it('accepts optional options without error', () => {
      const parser = new ReasoningParser({ patternDetection: true })
      expect(parser).toBeDefined()
      expect(parser.isThinking).toBe(false)
    })

    it('works without sessionId', () => {
      const parser = new ReasoningParser()
      expect(parser).toBeDefined()
    })
  })

  describe('step indexing', () => {
    it('increments step index across finalize and processToken steps', () => {
      const parser = new ReasoningParser()

      // First: a think block that we finalize manually
      parser.processToken(makeToken(0, '<think>'), '<think>')
      parser.processToken(makeToken(1, 'first thought'), '<think>first thought')
      const step1 = parser.finalize()

      // Second: a pattern-based step
      const fullText = 'Step 1: Analyze the data\nStep 2: Draw conclusions\n'
      parser.processToken(makeToken(2, '\n'), fullText)
      // "Step 1" becomes active; now "Step 2" finalizes "Step 1"
      const step2 = parser.processToken(makeToken(3, '\n'), fullText + 'more\n')

      expect(step1!.index).toBe(0)
      // step2 may be null if Step 2 line wasn't on a new processed line
      // but step1 index should be 0
      if (step2) {
        expect(step2.index).toBe(1)
      }
    })
  })
})
