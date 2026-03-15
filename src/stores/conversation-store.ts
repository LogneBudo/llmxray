import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Conversation, ChatMessage } from '@/types/conversation'
import type { OllamaChatMessage, OllamaOptions } from '@/types/ollama'
import { conversationDB } from '@/services/conversation-db'

export const useConversationStore = defineStore('conversations', () => {
  const conversations = ref<Map<string, Conversation>>(new Map())
  const activeConversationId = ref<string | null>(null)
  const hydrated = ref(false)

  const activeConversation = computed<Conversation | null>(() => {
    if (!activeConversationId.value) return null
    return conversations.value.get(activeConversationId.value) ?? null
  })

  const recentConversations = computed<Conversation[]>(() =>
    [...conversations.value.values()].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  // ── Hydration from IndexedDB ─────────────────────────────────

  async function hydrate(): Promise<void> {
    try {
      const stored = await conversationDB.getAllConversations()
      for (const meta of stored) {
        // Create in-memory conversation with empty messages (lazy-loaded on select)
        conversations.value.set(meta.id, {
          id: meta.id,
          name: meta.name,
          title: meta.title,
          model: meta.model,
          messages: [],
          options: meta.options,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        })
      }
    } catch (e) {
      console.error('Failed to hydrate conversations from IndexedDB:', e)
    }
    hydrated.value = true
  }

  async function loadConversationMessages(conversationId: string): Promise<void> {
    const conv = conversations.value.get(conversationId)
    if (!conv || conv.messages.length > 0) return
    try {
      const messages = await conversationDB.getMessages(conversationId)
      conv.messages = messages
    } catch (e) {
      console.error(`Failed to load messages for ${conversationId}:`, e)
    }
  }

  // ── Mutations with write-through ─────────────────────────────

  function createConversation(model: string, options?: OllamaOptions): string {
    const id = nanoid()
    const conv: Conversation = {
      id,
      name: 'Untitled',
      title: 'Untitled',
      model,
      messages: [],
      options: options ?? {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    conversations.value.set(id, conv)
    activeConversationId.value = id
    conversationDB.saveConversationMeta(conv).catch(console.error)
    return id
  }

  function addMessage(conversationId: string, message: ChatMessage) {
    const conv = conversations.value.get(conversationId)
    if (!conv) return
    conv.messages.push(message)
    conv.updatedAt = Date.now()

    // Auto-title from first user message
    if (conv.title === 'Untitled' && message.role === 'user') {
      conv.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
    }
    // Auto-name from first user message (if still default)
    if (conv.name === 'Untitled' && message.role === 'user') {
      conv.name = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
    }

    // Write-through
    if (!message.isStreaming) {
      conversationDB.saveMessage(message).catch(console.error)
    }
    conversationDB.saveConversationMeta(conv).catch(console.error)
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
      // Now persist the completed message
      conversationDB.saveMessage(msg).catch(console.error)
      conversationDB.saveConversationMeta(conv).catch(console.error)
    }
  }

  function setActiveConversation(id: string | null) {
    activeConversationId.value = id
    // Lazy-load messages when selecting a conversation
    if (id) {
      loadConversationMessages(id)
    }
  }

  function renameConversation(id: string, name: string) {
    const conv = conversations.value.get(id)
    if (!conv) return
    conv.name = name
    conv.updatedAt = Date.now()
    conversationDB.saveConversationMeta(conv).catch(console.error)
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

  function setMessageFeedback(conversationId: string, messageId: string, feedback: 'positive' | 'negative' | undefined) {
    const conv = conversations.value.get(conversationId)
    if (!conv) return
    const msg = conv.messages.find((m) => m.id === messageId)
    if (msg) {
      msg.feedback = feedback
      conversationDB.saveMessage(msg).catch(console.error)
    }
  }

  function deleteConversation(id: string) {
    conversations.value.delete(id)
    if (activeConversationId.value === id) {
      activeConversationId.value = null
    }
    conversationDB.deleteConversation(id).catch(console.error)
  }

  return {
    conversations,
    activeConversationId,
    activeConversation,
    recentConversations,
    hydrated,
    hydrate,
    loadConversationMessages,
    createConversation,
    addMessage,
    updateAssistantContent,
    finalizeMessage,
    setActiveConversation,
    renameConversation,
    getMessagesAsOllamaFormat,
    setMessageFeedback,
    deleteConversation,
  }
})

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}
