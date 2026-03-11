import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMemoryStore } from './memory-store'
import { DEFAULT_MEMORY_SETTINGS } from '@/types/memory'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('memory-store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('settings', () => {
    it('loads default settings on init', () => {
      const store = useMemoryStore()
      expect(store.settings.slidingWindow.enabled).toBe(true)
      expect(store.settings.slidingWindow.maxMessages).toBe(50)
      expect(store.settings.autoSummarize.enabled).toBe(false)
      expect(store.settings.ragMemory.enabled).toBe(false)
      expect(store.settings.userFacts.enabled).toBe(true)
    })

    it('updateSettings merges partial settings', () => {
      const store = useMemoryStore()
      store.updateSettings({ slidingWindow: { enabled: false, maxMessages: 100 } })
      expect(store.settings.slidingWindow.enabled).toBe(false)
      expect(store.settings.slidingWindow.maxMessages).toBe(100)
      // Other settings unchanged
      expect(store.settings.userFacts.enabled).toBe(true)
    })

    it('resetSettings restores defaults', () => {
      const store = useMemoryStore()
      store.updateSettings({ slidingWindow: { enabled: false, maxMessages: 10 } })
      store.resetSettings()
      expect(store.settings).toEqual(DEFAULT_MEMORY_SETTINGS)
    })
  })

  describe('user facts', () => {
    it('starts with empty facts', () => {
      const store = useMemoryStore()
      expect(store.facts).toHaveLength(0)
      expect(store.factCount).toBe(0)
    })

    it('addFact creates and returns a fact', () => {
      const store = useMemoryStore()
      const fact = store.addFact('I prefer TypeScript')
      expect(fact.content).toBe('I prefer TypeScript')
      expect(fact.id).toBeDefined()
      expect(fact.createdAt).toBeGreaterThan(0)
      expect(store.factCount).toBe(1)
    })

    it('addFact trims content', () => {
      const store = useMemoryStore()
      const fact = store.addFact('  trimmed  ')
      expect(fact.content).toBe('trimmed')
    })

    it('removeFact removes by ID', () => {
      const store = useMemoryStore()
      const fact = store.addFact('test')
      store.removeFact(fact.id)
      expect(store.factCount).toBe(0)
    })

    it('removeFactByContent finds and removes matching fact', () => {
      const store = useMemoryStore()
      store.addFact('I like Vue')
      store.addFact('I use TypeScript')

      const result = store.removeFactByContent('vue')
      expect(result).toBe(true)
      expect(store.factCount).toBe(1)
      expect(store.facts[0]!.content).toBe('I use TypeScript')
    })

    it('removeFactByContent returns false when no match', () => {
      const store = useMemoryStore()
      store.addFact('hello')
      expect(store.removeFactByContent('nonexistent')).toBe(false)
      expect(store.factCount).toBe(1)
    })

    it('clearFacts removes all facts', () => {
      const store = useMemoryStore()
      store.addFact('a')
      store.addFact('b')
      store.clearFacts()
      expect(store.factCount).toBe(0)
    })

    it('getFactsAsSystemPrompt returns empty string when no facts', () => {
      const store = useMemoryStore()
      expect(store.getFactsAsSystemPrompt()).toBe('')
    })

    it('getFactsAsSystemPrompt formats facts as prompt', () => {
      const store = useMemoryStore()
      store.addFact('I prefer dark mode')
      store.addFact('I use Ollama')

      const prompt = store.getFactsAsSystemPrompt()
      expect(prompt).toContain('- I prefer dark mode')
      expect(prompt).toContain('- I use Ollama')
      expect(prompt).toContain('remember these facts')
    })
  })

  describe('conversation summaries', () => {
    it('setSummary stores a summary', () => {
      const store = useMemoryStore()
      store.setSummary('conv-1', 'A summary of the chat', 15)

      const summary = store.getSummary('conv-1')
      expect(summary).toBeDefined()
      expect(summary!.summary).toBe('A summary of the chat')
      expect(summary!.messageCount).toBe(15)
    })

    it('getSummary returns undefined for unknown conversation', () => {
      const store = useMemoryStore()
      expect(store.getSummary('unknown')).toBeUndefined()
    })

    it('clearSummary removes a summary', () => {
      const store = useMemoryStore()
      store.setSummary('conv-1', 'summary', 10)
      store.clearSummary('conv-1')
      expect(store.getSummary('conv-1')).toBeUndefined()
    })

    it('setSummary overwrites existing summary', () => {
      const store = useMemoryStore()
      store.setSummary('conv-1', 'old', 5)
      store.setSummary('conv-1', 'new', 10)

      const summary = store.getSummary('conv-1')
      expect(summary!.summary).toBe('new')
      expect(summary!.messageCount).toBe(10)
    })
  })
})
