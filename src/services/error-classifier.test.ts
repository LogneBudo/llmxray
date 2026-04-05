import { classifyError } from './error-classifier'

describe('classifyError', () => {
  describe('connection errors', () => {
    it.each([
      'fetch failed',
      'ECONNREFUSED',
      'network error',
      'Connection refused',
    ])('classifies "%s" as connection', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'connection')
    })

    it('is case insensitive', () => {
      expect(classifyError('FETCH FAILED')).toHaveProperty('category', 'connection')
      expect(classifyError('Network Error')).toHaveProperty('category', 'connection')
    })
  })

  describe('timeout errors', () => {
    it.each([
      'request timed out',
      'ETIMEDOUT',
      'deadline exceeded',
    ])('classifies "%s" as timeout', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'timeout')
    })

    it('is case insensitive', () => {
      expect(classifyError('Request Timed Out')).toHaveProperty('category', 'timeout')
      expect(classifyError('DEADLINE EXCEEDED')).toHaveProperty('category', 'timeout')
    })
  })

  describe('model_not_found errors', () => {
    it.each([
      'model not found',
      'unknown model llama3',
      'pull the model first',
    ])('classifies "%s" as model_not_found', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'model_not_found')
    })

    it('is case insensitive', () => {
      expect(classifyError('Model Not Found')).toHaveProperty('category', 'model_not_found')
      expect(classifyError('Unknown Model llama3')).toHaveProperty('category', 'model_not_found')
    })
  })

  describe('context_exceeded errors', () => {
    it.each([
      'context length exceeded',
      'maximum context window',
      'num_ctx too small',
    ])('classifies "%s" as context_exceeded', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'context_exceeded')
    })

    it('is case insensitive', () => {
      expect(classifyError('Context Length Exceeded')).toHaveProperty('category', 'context_exceeded')
      expect(classifyError('MAXIMUM CONTEXT WINDOW')).toHaveProperty('category', 'context_exceeded')
    })
  })

  describe('oom errors', () => {
    it.each([
      'out of memory',
      'CUDA memory',
      'not enough VRAM',
    ])('classifies "%s" as oom', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'oom')
    })

    it('is case insensitive', () => {
      expect(classifyError('Out Of Memory')).toHaveProperty('category', 'oom')
      expect(classifyError('cuda memory')).toHaveProperty('category', 'oom')
    })
  })

  describe('cancelled errors', () => {
    it.each([
      'request cancelled',
      'aborted',
    ])('classifies "%s" as cancelled', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'cancelled')
    })

    it('is case insensitive', () => {
      expect(classifyError('Request Cancelled')).toHaveProperty('category', 'cancelled')
      expect(classifyError('ABORTED')).toHaveProperty('category', 'cancelled')
    })
  })

  describe('tool_error errors', () => {
    it.each([
      'tool failed',
      'tool error',
    ])('classifies "%s" as tool_error', (message) => {
      expect(classifyError(message)).toHaveProperty('category', 'tool_error')
    })

    it('is case insensitive', () => {
      expect(classifyError('Tool Failed')).toHaveProperty('category', 'tool_error')
      expect(classifyError('TOOL ERROR')).toHaveProperty('category', 'tool_error')
    })
  })

  describe('unknown errors', () => {
    it('classifies unrecognized messages as unknown', () => {
      expect(classifyError('something weird happened')).toHaveProperty('category', 'unknown')
    })

    it('classifies empty string as unknown', () => {
      expect(classifyError('')).toHaveProperty('category', 'unknown')
    })

    it('classifies random text as unknown', () => {
      expect(classifyError('xyzzy plugh 42')).toHaveProperty('category', 'unknown')
    })
  })
})
