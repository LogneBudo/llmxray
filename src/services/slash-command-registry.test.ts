import { describe, it, expect, vi } from 'vitest'
import { getMatchingCommands, findCommand, getCommandsByCategory, getAllCommands } from './slash-command-registry'
import type { SlashCommandContext } from '@/types/slash-command'
import { ref } from 'vue'

function createMockContext(overrides: Partial<SlashCommandContext> = {}): SlashCommandContext {
  return {
    clearConversation: vi.fn(),
    newChat: vi.fn(),
    sendAsUser: vi.fn(),
    copyLastResponse: vi.fn(),
    exportConversation: vi.fn(),
    setSystemPrompt: vi.fn(),
    setOption: vi.fn(),
    resetSettings: vi.fn(),
    setJsonFormat: vi.fn(),
    switchModel: vi.fn(),
    availableModels: ['llama3:latest', 'mistral:latest'],
    currentModel: 'llama3:latest',
    toggleRag: vi.fn(),
    ragEnabled: false,
    navigate: vi.fn(),
    openSettings: vi.fn(),
    openSessionDetails: vi.fn(),
    showNotification: vi.fn(),
    messages: [],
    chatSettings: ref({ systemPrompt: '', options: {} }),
    currentSessionId: null,
    getSessionTokenCount: vi.fn(() => null),
    getAverageSpeed: vi.fn(() => null),
    getOllamaStatus: vi.fn(async () => ({ connected: true, model: 'llama3:latest' })),
    addFact: vi.fn(() => ({ id: '1', content: 'test', createdAt: Date.now() })),
    removeFact: vi.fn(() => true),
    getFacts: vi.fn(() => []),
    ...overrides,
  }
}

describe('slash-command-registry', () => {
  describe('getAllCommands', () => {
    it('returns all commands', () => {
      const all = getAllCommands()
      expect(all.length).toBeGreaterThan(20)
    })

    it('includes memory commands', () => {
      const all = getAllCommands()
      const names = all.map((c) => c.name)
      expect(names).toContain('remember')
      expect(names).toContain('forget')
      expect(names).toContain('memories')
    })
  })

  describe('findCommand', () => {
    it('finds a command by exact name', () => {
      const cmd = findCommand('help')
      expect(cmd).toBeDefined()
      expect(cmd!.name).toBe('help')
    })

    it('is case-insensitive', () => {
      const cmd = findCommand('HELP')
      expect(cmd).toBeDefined()
      expect(cmd!.name).toBe('help')
    })

    it('returns undefined for unknown commands', () => {
      expect(findCommand('nonexistent')).toBeUndefined()
    })
  })

  describe('getMatchingCommands', () => {
    it('returns all commands for empty prefix', () => {
      const all = getAllCommands()
      const matches = getMatchingCommands('')
      expect(matches.length).toBe(all.length)
    })

    it('filters by prefix', () => {
      const matches = getMatchingCommands('/temp')
      expect(matches.length).toBe(1)
      expect(matches[0]!.name).toBe('temperature')
    })

    it('strips leading slash from prefix', () => {
      const matches = getMatchingCommands('/he')
      expect(matches.some((c) => c.name === 'help')).toBe(true)
    })

    it('returns multiple matches for shared prefix', () => {
      const matches = getMatchingCommands('top')
      expect(matches.length).toBe(2) // top_p and top_k
    })
  })

  describe('getCommandsByCategory', () => {
    it('groups commands into categories', () => {
      const grouped = getCommandsByCategory()
      expect(Object.keys(grouped)).toContain('Chat & Conversation')
      expect(Object.keys(grouped)).toContain('Model & Settings')
      expect(Object.keys(grouped)).toContain('Features & Navigation')
      expect(Object.keys(grouped)).toContain('Memory')
    })

    it('memory category has 3 commands', () => {
      const grouped = getCommandsByCategory()
      expect(grouped['Memory']!.length).toBe(3)
    })
  })

  describe('command execution', () => {
    it('/clear calls clearConversation', () => {
      const ctx = createMockContext()
      findCommand('clear')!.execute('', ctx)
      expect(ctx.clearConversation).toHaveBeenCalled()
      expect(ctx.showNotification).toHaveBeenCalledWith('Conversation cleared.')
    })

    it('/new calls newChat', () => {
      const ctx = createMockContext()
      findCommand('new')!.execute('', ctx)
      expect(ctx.newChat).toHaveBeenCalled()
    })

    it('/system sets system prompt', () => {
      const ctx = createMockContext()
      findCommand('system')!.execute('You are a pirate', ctx)
      expect(ctx.setSystemPrompt).toHaveBeenCalledWith('You are a pirate')
    })

    it('/system with no args shows current prompt', () => {
      const ctx = createMockContext()
      findCommand('system')!.execute('', ctx)
      expect(ctx.showNotification).toHaveBeenCalled()
      expect(ctx.setSystemPrompt).not.toHaveBeenCalled()
    })

    it('/temperature sets valid temperature', () => {
      const ctx = createMockContext()
      findCommand('temperature')!.execute('0.5', ctx)
      expect(ctx.setOption).toHaveBeenCalledWith('temperature', 0.5)
    })

    it('/temperature rejects out of range', () => {
      const ctx = createMockContext()
      findCommand('temperature')!.execute('5', ctx)
      expect(ctx.setOption).not.toHaveBeenCalled()
    })

    it('/model switches model with valid name', () => {
      const ctx = createMockContext()
      findCommand('model')!.execute('llama3:latest', ctx)
      expect(ctx.switchModel).toHaveBeenCalledWith('llama3:latest')
    })

    it('/model shows list when no arg', () => {
      const ctx = createMockContext()
      findCommand('model')!.execute('', ctx)
      expect(ctx.showNotification).toHaveBeenCalled()
      expect(ctx.switchModel).not.toHaveBeenCalled()
    })

    it('/remember stores a fact', () => {
      const ctx = createMockContext()
      findCommand('remember')!.execute('I prefer TypeScript', ctx)
      expect(ctx.addFact).toHaveBeenCalledWith('I prefer TypeScript')
    })

    it('/remember with no args shows usage', () => {
      const ctx = createMockContext()
      findCommand('remember')!.execute('', ctx)
      expect(ctx.addFact).not.toHaveBeenCalled()
      expect(ctx.showNotification).toHaveBeenCalled()
    })

    it('/forget removes a fact', () => {
      const ctx = createMockContext()
      findCommand('forget')!.execute('TypeScript', ctx)
      expect(ctx.removeFact).toHaveBeenCalledWith('TypeScript')
    })

    it('/memories shows all facts', () => {
      const facts = [
        { id: '1', content: 'I like Vue', createdAt: Date.now() },
        { id: '2', content: 'I use Ollama', createdAt: Date.now() },
      ]
      const ctx = createMockContext({ getFacts: vi.fn(() => facts) })
      findCommand('memories')!.execute('', ctx)
      expect(ctx.showNotification).toHaveBeenCalled()
      const msg = (ctx.showNotification as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
      expect(msg).toContain('I like Vue')
      expect(msg).toContain('I use Ollama')
    })

    it('/reset resets all settings', () => {
      const ctx = createMockContext()
      findCommand('reset')!.execute('', ctx)
      expect(ctx.resetSettings).toHaveBeenCalled()
    })

    it('/rag toggles RAG', () => {
      const ctx = createMockContext()
      findCommand('rag')!.execute('', ctx)
      expect(ctx.toggleRag).toHaveBeenCalled()
    })

    it('/compare navigates to compare page', () => {
      const ctx = createMockContext()
      findCommand('compare')!.execute('', ctx)
      expect(ctx.navigate).toHaveBeenCalledWith('/compare')
    })
  })
})
