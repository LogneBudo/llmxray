import { ReasoningParser } from './reasoning-parser'

interface StreamToken {
  index: number
  text: string
  timestamp: number
}

function makeToken(index: number, text: string, timestamp = Date.now()): StreamToken {
  return { index, text, timestamp } as any
}

describe('ReasoningParser', () => {
  describe('think block', () => {
    it('sets isThinking=true when <think> is encountered', () => {
      const parser = new ReasoningParser()
      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)
      expect(parser.isThinking).toBe(true)
    })

    it('sets isThinking=false after </think>', () => {
      const parser = new ReasoningParser()
      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)

      fullText += 'some reasoning'
      parser.processToken(makeToken(1, 'some reasoning'), fullText)

      fullText += '</think>'
      parser.processToken(makeToken(2, '</think>'), fullText)

      expect(parser.isThinking).toBe(false)
    })

    it('returns a step of type thought after </think>', () => {
      const parser = new ReasoningParser()
      const t0 = 1000

      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>', t0), fullText)

      fullText += 'deep reasoning here'
      parser.processToken(makeToken(1, 'deep reasoning here', t0 + 10), fullText)

      fullText += '</think>'
      const step = parser.processToken(makeToken(2, '</think>', t0 + 20), fullText)

      expect(step).not.toBeNull()
      expect(step!.type).toBe('thought')
      expect(step!.content).toBe('deep reasoning here')
    })

    it('extracts content between tags', () => {
      const parser = new ReasoningParser()

      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)

      fullText += 'Let me analyze this.\nFirst, consider X.'
      parser.processToken(makeToken(1, 'Let me analyze this.\nFirst, consider X.'), fullText)

      fullText += '</think>'
      const step = parser.processToken(makeToken(2, '</think>'), fullText)

      expect(step).not.toBeNull()
      expect(step!.content).toBe('Let me analyze this.\nFirst, consider X.')
    })

    it('thinkingContent returns accumulated content while in think block', () => {
      const parser = new ReasoningParser()

      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)

      fullText += 'partial thought'
      parser.processToken(makeToken(1, 'partial thought'), fullText)

      expect(parser.thinkingContent).toContain('partial thought')
    })

    it('thinkingContent returns empty string when not in think block', () => {
      const parser = new ReasoningParser()
      expect(parser.thinkingContent).toBe('')
    })

    it('only processes one think block (thinkBlockProcessed flag)', () => {
      const parser = new ReasoningParser()

      // First think block
      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)
      fullText += 'first'
      parser.processToken(makeToken(1, 'first'), fullText)
      fullText += '</think>'
      const step1 = parser.processToken(makeToken(2, '</think>'), fullText)
      expect(step1).not.toBeNull()

      // Second think block — should be ignored
      fullText += '<think>'
      parser.processToken(makeToken(3, '<think>'), fullText)
      expect(parser.isThinking).toBe(false)

      fullText += 'second'
      parser.processToken(makeToken(4, 'second'), fullText)

      fullText += '</think>'
      const step2 = parser.processToken(makeToken(5, '</think>'), fullText)
      expect(step2).toBeNull()
    })

    it('returns null for empty think blocks', () => {
      const parser = new ReasoningParser()
      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)
      fullText += '</think>'
      const step = parser.processToken(makeToken(1, '</think>'), fullText)

      expect(step).toBeNull()
      expect(parser.isThinking).toBe(false)
    })

    it('has correct step metadata', () => {
      const parser = new ReasoningParser()
      const t0 = 1000

      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>', t0), fullText)

      fullText += 'content'
      parser.processToken(makeToken(1, 'content', t0 + 50), fullText)

      fullText += '</think>'
      const step = parser.processToken(makeToken(2, '</think>', t0 + 100), fullText)

      expect(step).not.toBeNull()
      expect(step!.index).toBe(0)
      expect(step!.startTokenIndex).toBe(0)
      expect(step!.endTokenIndex).toBe(2)
      expect(step!.durationMs).toBe(100)
      expect(step!.id).toBeDefined()
    })
  })

  describe('pattern detection', () => {
    it('"Step 1: analyze the problem" creates a thought step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Step 1: analyze the problem\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'more text\n'
      parser.processToken(makeToken(1, 'more text\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('thought')
      expect(step!.content).toContain('analyze the problem')
    })

    it('"Observation: the sky is blue" creates an observation step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Observation: the sky is blue\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'next line\n'
      parser.processToken(makeToken(1, 'next line\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('observation')
      expect(step!.content).toContain('the sky is blue')
    })

    it('"Action: call the API" creates an action step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Action: call the API\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'done\n'
      parser.processToken(makeToken(1, 'done\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('action')
      expect(step!.content).toContain('call the API')
    })

    it('"Conclusion: therefore X" creates a conclusion step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Conclusion: therefore X\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'end\n'
      parser.processToken(makeToken(1, 'end\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('conclusion')
      expect(step!.content).toContain('therefore X')
    })

    it('"Therefore, the answer is Y" creates a conclusion step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Therefore, the answer is Y\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'end\n'
      parser.processToken(makeToken(1, 'end\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('conclusion')
      expect(step!.content).toContain('the answer is Y')
    })

    it('normal text without patterns returns null', () => {
      const parser = new ReasoningParser()

      let fullText = 'Just some regular text\n'
      const result1 = parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'More regular text\n'
      const result2 = parser.processToken(makeToken(1, 'More regular text\n'), fullText)

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(parser.finalize()).toBeNull()
    })

    it('finalizes previous step when a new pattern is detected', () => {
      const parser = new ReasoningParser()
      const t0 = 1000

      let fullText = 'Step 1: first step\n'
      parser.processToken(makeToken(0, fullText, t0), fullText)

      fullText += 'Step 2: second step\n'
      const previousStep = parser.processToken(makeToken(1, 'Step 2: second step\n', t0 + 100), fullText)

      expect(previousStep).not.toBeNull()
      expect(previousStep!.type).toBe('thought')
      expect(previousStep!.content).toContain('first step')

      const currentStep = parser.finalize()
      expect(currentStep).not.toBeNull()
      expect(currentStep!.content).toContain('second step')
    })

    it('does not trigger on plain numbered lists', () => {
      const parser = new ReasoningParser()

      let fullText = '1. First item\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'More text\n'
      parser.processToken(makeToken(1, 'More text\n'), fullText)

      expect(parser.finalize()).toBeNull()
    })
  })

  describe('pattern detection disabled', () => {
    it('returns null for pattern lines when patternDetection is false', () => {
      const parser = new ReasoningParser({ patternDetection: false })

      let fullText = 'Step 1: analyze the problem\n'
      const r1 = parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'Observation: the sky is blue\n'
      const r2 = parser.processToken(makeToken(1, 'Observation: the sky is blue\n'), fullText)

      fullText += 'Action: call the API\n'
      const r3 = parser.processToken(makeToken(2, 'Action: call the API\n'), fullText)

      expect(r1).toBeNull()
      expect(r2).toBeNull()
      expect(r3).toBeNull()
      expect(parser.finalize()).toBeNull()
    })

    it('still processes think blocks when patternDetection is false', () => {
      const parser = new ReasoningParser({ patternDetection: false })

      let fullText = '<think>'
      parser.processToken(makeToken(0, '<think>'), fullText)
      expect(parser.isThinking).toBe(true)

      fullText += 'reasoning'
      parser.processToken(makeToken(1, 'reasoning'), fullText)

      fullText += '</think>'
      const step = parser.processToken(makeToken(2, '</think>'), fullText)

      expect(step).not.toBeNull()
      expect(step!.type).toBe('thought')
      expect(step!.content).toBe('reasoning')
    })
  })

  describe('finalize', () => {
    it('returns remaining active step', () => {
      const parser = new ReasoningParser()

      let fullText = 'Step 1: in progress\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'continuing...\n'
      parser.processToken(makeToken(1, 'continuing...\n'), fullText)

      const step = parser.finalize()
      expect(step).not.toBeNull()
      expect(step!.type).toBe('thought')
      expect(step!.content).toContain('in progress')
    })

    it('returns null if no active step', () => {
      const parser = new ReasoningParser()
      expect(parser.finalize()).toBeNull()
    })

    it('returns null after already finalized', () => {
      const parser = new ReasoningParser()

      let fullText = 'Step 1: something\n'
      parser.processToken(makeToken(0, fullText), fullText)

      fullText += 'more\n'
      parser.processToken(makeToken(1, 'more\n'), fullText)

      const step1 = parser.finalize()
      expect(step1).not.toBeNull()

      const step2 = parser.finalize()
      expect(step2).toBeNull()
    })

    it('returns null if active step has only whitespace content', () => {
      const parser = new ReasoningParser()
      parser.processToken(makeToken(0, '<think>'), '<think>')
      parser['activeStep']!.content = '   '
      const step = parser.finalize()
      expect(step).toBeNull()
    })
  })

  describe('step indexing', () => {
    it('increments step index across multiple steps', () => {
      const parser = new ReasoningParser()
      const t0 = 1000

      let fullText = 'Step 1: first\n'
      parser.processToken(makeToken(0, fullText, t0), fullText)

      fullText += 'Step 2: second\n'
      const step1 = parser.processToken(makeToken(1, 'Step 2: second\n', t0 + 50), fullText)

      fullText += 'Step 3: third\n'
      const step2 = parser.processToken(makeToken(2, 'Step 3: third\n', t0 + 100), fullText)

      expect(step1!.index).toBe(0)
      expect(step2!.index).toBe(1)

      const step3 = parser.finalize()
      expect(step3!.index).toBe(2)
    })
  })
})
