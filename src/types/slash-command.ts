import type { ChatMessage } from './conversation'
import type { OllamaOptions } from './ollama'
import type { UserFact } from './memory'
import type { Ref } from 'vue'

export interface SlashCommand {
  name: string
  description: string
  usage: string
  category: 'chat' | 'settings' | 'navigation' | 'memory'
  execute: (args: string, ctx: SlashCommandContext) => void | Promise<void>
}

export interface SlashCommandContext {
  // Chat actions
  clearConversation: () => void
  newChat: () => void
  sendAsUser: (text: string) => void
  copyLastResponse: () => void
  exportConversation: (format: 'json' | 'text') => void

  // Settings
  setSystemPrompt: (prompt: string) => void
  setOption: <K extends keyof OllamaOptions>(key: K, value: OllamaOptions[K]) => void
  resetSettings: () => void
  setJsonFormat: (enabled: boolean) => void

  // Model
  switchModel: (name: string) => void
  availableModels: string[]
  currentModel: string

  // RAG
  toggleRag: () => void
  ragEnabled: boolean

  // Navigation
  navigate: (path: string) => void
  openSettings: () => void
  openSessionDetails: () => void

  // Info
  showNotification: (msg: string) => void
  messages: ChatMessage[]
  chatSettings: Ref<{ systemPrompt: string; options: OllamaOptions }>

  // Memory
  addFact: (content: string) => UserFact
  removeFact: (search: string) => boolean
  getFacts: () => UserFact[]

  // Metrics
  currentSessionId: string | null
  getSessionTokenCount: () => { prompt: number; completion: number } | null
  getAverageSpeed: () => number | null
  getOllamaStatus: () => Promise<{ connected: boolean; model: string }>
}
