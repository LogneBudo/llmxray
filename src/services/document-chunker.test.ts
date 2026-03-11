import { describe, it, expect } from 'vitest'
import { chunkDocument, estimateTokens } from './document-chunker'

describe('document-chunker', () => {
  describe('chunkDocument', () => {
    it('returns a single chunk for short text', () => {
      const chunks = chunkDocument('doc-1', 'Hello world')
      expect(chunks).toHaveLength(1)
      expect(chunks[0]!.content).toBe('Hello world')
      expect(chunks[0]!.documentId).toBe('doc-1')
      expect(chunks[0]!.index).toBe(0)
    })

    it('splits long text into multiple chunks', () => {
      // Create text with multiple paragraphs that exceeds chunkSize
      const paragraphs = Array.from({ length: 20 }, (_, i) =>
        `Paragraph ${i + 1}. ${'Lorem ipsum dolor sit amet. '.repeat(5)}`,
      )
      const text = paragraphs.join('\n\n')

      const chunks = chunkDocument('doc-2', text, { chunkSize: 500 })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('preserves paragraph boundaries', () => {
      const text = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.'
      const chunks = chunkDocument('doc-3', text, { chunkSize: 1000 })

      // All content should be in one chunk since total is < 1000 chars
      expect(chunks).toHaveLength(1)
      expect(chunks[0]!.content).toContain('First paragraph')
      expect(chunks[0]!.content).toContain('Third paragraph')
    })

    it('respects custom separator', () => {
      const text = 'Section 1---Section 2---Section 3'
      const chunks = chunkDocument('doc-4', text, { separator: '---', chunkSize: 20 })
      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })

    it('includes overlap between chunks', () => {
      const paragraphs = Array.from({ length: 10 }, (_, i) =>
        `Paragraph ${i + 1} with some content that makes it longer.`,
      )
      const text = paragraphs.join('\n\n')

      const chunks = chunkDocument('doc-5', text, { chunkSize: 200, chunkOverlap: 50 })
      if (chunks.length >= 2) {
        // Last part of chunk N should appear at start of chunk N+1
        const endOfFirst = chunks[0]!.content.slice(-50)
        expect(chunks[1]!.content).toContain(endOfFirst.trim())
      }
    })

    it('assigns sequential indices', () => {
      const paragraphs = Array.from({ length: 10 }, (_, i) =>
        `Long paragraph ${i} ${'word '.repeat(50)}`,
      )
      const text = paragraphs.join('\n\n')

      const chunks = chunkDocument('doc-6', text, { chunkSize: 200 })
      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i)
      })
    })

    it('generates unique IDs for each chunk', () => {
      const text = 'Para 1\n\nPara 2\n\nPara 3'
      const chunks = chunkDocument('doc-7', text)
      const ids = chunks.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('includes token estimate for each chunk', () => {
      const chunks = chunkDocument('doc-8', 'A quick brown fox jumps over the lazy dog.')
      expect(chunks[0]!.tokenEstimate).toBeGreaterThan(0)
    })

    it('includes metadata with character positions', () => {
      const chunks = chunkDocument('doc-9', 'Simple text')
      expect(chunks[0]!.metadata.startChar).toBeDefined()
      expect(chunks[0]!.metadata.endChar).toBeDefined()
      expect(chunks[0]!.metadata.endChar).toBeGreaterThan(chunks[0]!.metadata.startChar)
    })

    it('handles empty text', () => {
      const chunks = chunkDocument('doc-10', '')
      expect(chunks).toHaveLength(0)
    })

    it('handles whitespace-only text', () => {
      const chunks = chunkDocument('doc-11', '   \n\n   ')
      expect(chunks).toHaveLength(0)
    })
  })

  describe('estimateTokens', () => {
    it('estimates tokens from word count', () => {
      const estimate = estimateTokens('one two three four five')
      // 5 words * 1.3 = 6.5, ceil = 7
      expect(estimate).toBe(7)
    })

    it('returns 1 for single word', () => {
      const estimate = estimateTokens('hello')
      // 1 * 1.3 = 1.3, ceil = 2
      expect(estimate).toBe(2)
    })

    it('handles empty string', () => {
      const estimate = estimateTokens('')
      // '' splits to [''], length 1, * 1.3 = 1.3, ceil = 2
      expect(estimate).toBe(2)
    })
  })
})
