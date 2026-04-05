import { analyzePrompt, analyzeMessages } from './prompt-analyzer'

describe('analyzePrompt', () => {
  it('single unsectioned prompt returns 1 section of type user', () => {
    const result = analyzePrompt('s1', 'Tell me a joke')
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].type).toBe('user')
  })

  it('detects # System and # User headers as separate sections', () => {
    const prompt = '# System\nYou are helpful.\n# User\nHello!'
    const result = analyzePrompt('s1', prompt)
    const types = result.sections.map((s) => s.type)
    expect(types).toContain('system')
    expect(types).toContain('user')
  })

  it('assigns token counts to each section', () => {
    const prompt = '# System\nYou are a helpful assistant.\n# User\nHello world!'
    const result = analyzePrompt('s1', prompt)
    for (const section of result.sections) {
      expect(section.tokenCount).toBeGreaterThan(0)
    }
  })

  it('percentages sum roughly to ~100%', () => {
    const prompt = '# System\nYou are a helpful assistant.\n# User\nHello world!'
    const result = analyzePrompt('s1', prompt)
    const total = result.sections.reduce((sum, s) => sum + s.percentage, 0)
    // Token approximation can cause rounding drift — allow wider tolerance
    expect(total).toBeGreaterThanOrEqual(90)
    expect(total).toBeLessThanOrEqual(110)
  })

  it('content before first section header is added as unknown preamble', () => {
    const prompt = 'Some preamble text\n# System\nYou are helpful.'
    const result = analyzePrompt('s1', prompt)
    const unknownSection = result.sections.find((s) => s.type === 'unknown')
    expect(unknownSection).toBeDefined()
    expect(unknownSection!.content).toContain('Some preamble text')
  })
})

describe('analyzeMessages', () => {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello world!' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'tool', content: '{"result": 42}' },
  ]

  it('maps system role to system type', () => {
    const result = analyzeMessages('s1', messages)
    expect(result.sections[0].type).toBe('system')
  })

  it('maps user role to user type', () => {
    const result = analyzeMessages('s1', messages)
    const userSection = result.sections.find((s) => s.type === 'user')
    expect(userSection).toBeDefined()
  })

  it('maps assistant role to context type', () => {
    const result = analyzeMessages('s1', messages)
    const contextSection = result.sections.find((s) => s.type === 'context')
    expect(contextSection).toBeDefined()
  })

  it('maps tool role to tools type', () => {
    const result = analyzeMessages('s1', messages)
    const toolsSection = result.sections.find((s) => s.type === 'tools')
    expect(toolsSection).toBeDefined()
  })

  it('totalTokenCount is sum of all section token counts', () => {
    const result = analyzeMessages('s1', messages)
    const summed = result.sections.reduce((sum, s) => sum + s.tokenCount, 0)
    expect(result.totalTokenCount).toBe(summed)
  })

  it('returns rawPrompt as concatenated messages', () => {
    const result = analyzeMessages('s1', messages)
    for (const msg of messages) {
      expect(result.rawPrompt).toContain(msg.content)
    }
  })

  it('percentages are calculated correctly', () => {
    const result = analyzeMessages('s1', messages)
    const total = result.sections.reduce((sum, s) => sum + s.percentage, 0)
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(101)
  })

  it('section IDs are non-empty strings (nanoid)', () => {
    const result = analyzeMessages('s1', messages)
    for (const section of result.sections) {
      expect(typeof section.id).toBe('string')
      expect(section.id.length).toBeGreaterThan(0)
    }
  })
})
