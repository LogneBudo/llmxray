import type { OllamaOptions } from './ollama'
import type { ChatAttachment } from './attachment'

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sessionId?: string
  timestamp: number
  isStreaming: boolean
  attachments?: ChatAttachment[]
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: ChatMessage[]
  options: OllamaOptions
  createdAt: number
  updatedAt: number
}

export interface ChatSettings {
  systemPrompt: string
  options: OllamaOptions
}
