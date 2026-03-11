export interface MemorySettings {
  slidingWindow: {
    enabled: boolean
    maxMessages: number // default 50
  }
  autoSummarize: {
    enabled: boolean
    triggerThreshold: number // message count before summarizing, default 30
  }
  ragMemory: {
    enabled: boolean
    embeddingModel: string // selected embedding model name
    topK: number // how many past messages to retrieve, default 3
  }
  userFacts: {
    enabled: boolean
  }
}

export interface UserFact {
  id: string
  content: string
  createdAt: number
}

export interface ConversationSummary {
  conversationId: string
  summary: string
  messageCount: number // how many messages were summarized
  createdAt: number
}

export interface EmbeddedMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  embedding: number[]
  timestamp: number
}

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  slidingWindow: {
    enabled: true,
    maxMessages: 50,
  },
  autoSummarize: {
    enabled: false,
    triggerThreshold: 30,
  },
  ragMemory: {
    enabled: false,
    embeddingModel: '',
    topK: 3,
  },
  userFacts: {
    enabled: true,
  },
}
