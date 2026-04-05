import { detectRepetition, detectRefusal, detectGibberish, detectEmpty, detectTruncation, analyzeResponseQuality } from './quality-analyzer'

describe('detectRepetition', () => {
  it('passes for normal text with varied content', () => {
    const text = 'The weather today is sunny and warm. I went to the store to buy some groceries. Later I plan to read a book and relax in the garden. Tomorrow I have a meeting with my team to discuss the project roadmap.'
    const result = detectRepetition(text)
    expect(result.status).toBe('pass')
  })

  it('passes for short text with fewer than 8 words', () => {
    const result = detectRepetition('Hello world foo bar')
    expect(result.status).toBe('pass')
  })

  it('warns for text with moderate repeated 4-grams', () => {
    // 2 repeats of a phrase mixed with enough unique filler to land in 30-50% range
    const phrase = 'alpha beta gamma delta epsilon zeta '
    const filler = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven twenty-eight twenty-nine thirty '
    const text = filler + phrase + filler + phrase
    const result = detectRepetition(text)
    expect(['warn', 'fail']).toContain(result.status) // at least flagged
    expect(result.status).not.toBe('pass')
  })

  it('fails for text with more than 50% repeated 4-grams', () => {
    const phrase = 'the quick brown fox '
    const text = phrase.repeat(15)
    const result = detectRepetition(text)
    expect(result.status).toBe('fail')
  })
})

describe('detectRefusal', () => {
  it('passes for a normal helpful response', () => {
    const text = 'Here is the code you requested. The function takes two parameters and returns their sum. You can call it like this: add(2, 3).'
    const result = detectRefusal(text)
    expect(result.status).toBe('pass')
  })

  it('warns for "As an AI language model, I cannot help with that"', () => {
    const result = detectRefusal('As an AI language model, I cannot help with that request.')
    expect(result.status).toBe('warn')
  })

  it('warns for "I\'m not able to provide that information"', () => {
    const result = detectRefusal("I'm not able to provide that information due to safety guidelines.")
    expect(result.status).toBe('warn')
  })

  it('warns for "My programming prevents me from doing that"', () => {
    const result = detectRefusal('My programming prevents me from doing that. Please ask something else.')
    expect(result.status).toBe('warn')
  })

  it('passes for text that mentions AI but is not a refusal', () => {
    const text = 'AI technology has advanced significantly in recent years. Machine learning models can now perform complex tasks like image recognition and natural language processing.'
    const result = detectRefusal(text)
    expect(result.status).toBe('pass')
  })
})

describe('detectGibberish', () => {
  it('passes for normal English text', () => {
    const text = 'This is a perfectly normal sentence with standard English words and punctuation.'
    const result = detectGibberish(text)
    expect(result.status).toBe('pass')
  })

  it('passes for short text with 20 characters or fewer', () => {
    const result = detectGibberish('Short text here')
    expect(result.status).toBe('pass')
  })

  it('warns for text with more than 40% non-ASCII characters', () => {
    const text = '∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω hello world ∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω∆∑∏∫Ω'
    const result = detectGibberish(text)
    expect(result.status).toBe('warn')
  })
})

describe('detectEmpty', () => {
  it('fails for an empty string', () => {
    const result = detectEmpty('')
    expect(result.status).toBe('fail')
  })

  it('fails for whitespace only', () => {
    const result = detectEmpty('   ')
    expect(result.status).toBe('fail')
  })

  it('warns for a very short response with fewer than 10 words', () => {
    const result = detectEmpty('Hello')
    expect(result.status).toBe('warn')
  })

  it('passes for a normal length response with 10 or more words', () => {
    const text = 'This is a normal response that contains more than ten words in total.'
    const result = detectEmpty(text)
    expect(result.status).toBe('pass')
  })
})

describe('detectTruncation', () => {
  it('passes for a normal completion with doneReason stop', () => {
    const result = detectTruncation('Some normal text.', 50, undefined, 'stop')
    expect(result.status).toBe('pass')
  })

  it('warns when doneReason is length', () => {
    const result = detectTruncation('Some text', 100, 100, 'length')
    expect(result.status).toBe('warn')
  })

  it('warns when used more than 90% of maxTokens without a clean ending', () => {
    const text = 'This text ends abruptly without any punctuation and just kind of trails off into'
    const result = detectTruncation(text, 950, 1000, 'stop')
    expect(result.status).toBe('warn')
  })

  it('passes when used more than 90% of maxTokens but ends with a period', () => {
    const result = detectTruncation('This text ends properly with a period.', 950, 1000, 'stop')
    expect(result.status).toBe('pass')
  })
})

describe('analyzeResponseQuality', () => {
  it('returns overall pass when all checks pass', () => {
    const result = analyzeResponseQuality('m1', 's1',
      'This is a perfectly normal response with enough words to pass all quality checks easily.',
      50, undefined, 'stop')
    expect(result.overall).toBe('pass')
    expect(result.checks).toHaveLength(5)
  })

  it('returns overall warn when at least one check warns', () => {
    const result = analyzeResponseQuality('m2', 's1',
      "As an AI language model, I cannot help with that request but here are some alternatives you could try instead.",
      50, undefined, 'stop')
    expect(result.overall).toBe('warn')
  })

  it('returns overall fail when at least one check fails', () => {
    const result = analyzeResponseQuality('m3', 's1', '', 0, undefined, 'stop')
    expect(result.overall).toBe('fail')
  })

  it('returns exactly 5 checks in the array', () => {
    const result = analyzeResponseQuality('m4', 's1',
      'A normal response for testing purposes with enough content to be valid.',
      50, undefined, 'stop')
    expect(result.checks).toHaveLength(5)
  })
})
