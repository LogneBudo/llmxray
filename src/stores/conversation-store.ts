import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Conversation, ChatMessage } from '@/types/conversation'
import type { OllamaChatMessage, OllamaOptions } from '@/types/ollama'

export const useConversationStore = defineStore('conversations', () => {
  const conversations = ref<Map<string, Conversation>>(new Map())
  const activeConversationId = ref<string | null>(null)

  const activeConversation = computed<Conversation | null>(() => {
    if (!activeConversationId.value) return null
    return conversations.value.get(activeConversationId.value) ?? null
  })

  const recentConversations = computed<Conversation[]>(() =>
    [...conversations.value.values()].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  function createConversation(model: string, options?: OllamaOptions): string {
    const id = nanoid()
    conversations.value.set(id, {
      id,
      title: 'New Chat',
      model,
      messages: [],
      options: options ?? {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    activeConversationId.value = id
    return id
  }

  function addMessage(conversationId: string, message: ChatMessage) {
    const conv = conversations.value.get(conversationId)
    if (!conv) return
    conv.messages.push(message)
    conv.updatedAt = Date.now()

    // Auto-title from first user message
    if (conv.title === 'New Chat' && message.role === 'user') {
      conv.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
    }
  }

  function updateAssistantContent(conversationId: string, messageId: string, text: string) {
    const conv = conversations.value.get(conversationId)
    if (!conv) return
    const msg = conv.messages.find((m) => m.id === messageId)
    if (msg) msg.content = text
  }

  function finalizeMessage(conversationId: string, messageId: string) {
    const conv = conversations.value.get(conversationId)
    if (!conv) return
    const msg = conv.messages.find((m) => m.id === messageId)
    if (msg) {
      msg.isStreaming = false
      conv.updatedAt = Date.now()
    }
  }

  function setActiveConversation(id: string | null) {
    activeConversationId.value = id
  }

  function getMessagesAsOllamaFormat(conversationId: string): OllamaChatMessage[] {
    const conv = conversations.value.get(conversationId)
    if (!conv) return []

    return conv.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.role === 'assistant' ? stripThinkTags(m.content) : m.content,
      }))
  }

  function deleteConversation(id: string) {
    conversations.value.delete(id)
    if (activeConversationId.value === id) {
      activeConversationId.value = null
    }
  }

  return {
    conversations,
    activeConversationId,
    activeConversation,
    recentConversations,
    createConversation,
    addMessage,
    updateAssistantContent,
    finalizeMessage,
    setActiveConversation,
    getMessagesAsOllamaFormat,
    deleteConversation,
  }
})

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}
