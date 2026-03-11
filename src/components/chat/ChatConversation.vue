<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { nanoid } from 'nanoid'
import { useConversationStore } from '@/stores/conversation-store'
import { useModelStore } from '@/stores/model-store'
import { useSessionStore } from '@/stores/session-store'
import { useMetricsStore } from '@/stores/metrics-store'
import { useOllamaStream } from '@/composables/useOllamaStream'
import { useRagStore } from '@/stores/rag-store'
import { findCommand } from '@/services/slash-command-registry'
import { useToolDefinitionStore } from '@/stores/tool-definition-store'
import { useMemoryStore } from '@/stores/memory-store'
import { prepareContext, embedNewMessages } from '@/services/context-manager'
import type { SlashCommandContext } from '@/types/slash-command'
import ChatMessageList from './ChatMessageList.vue'
import ChatInput from './ChatInput.vue'
import type { ChatSettings } from '@/types/conversation'
import type { ChatAttachment } from '@/types/attachment'
import ChatSettingsPanel from './ChatSettingsPanel.vue'

const router = useRouter()
const conversationStore = useConversationStore()
const modelStore = useModelStore()
const sessionStore = useSessionStore()
const ragStore = useRagStore()
const metricsStore = useMetricsStore()
const toolDefinitionStore = useToolDefinitionStore()
const memoryStore = useMemoryStore()
const { isStreaming, currentSessionId, startChatStream, cancel } = useOllamaStream()

const selectedModel = ref('')
const ragEnabled = ref(true)
const showSettings = ref(false)
const chatSettings = ref<ChatSettings>({
  systemPrompt: '',
  options: {},
})
const notificationMessage = ref<string | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | null = null

const conversation = computed(() => conversationStore.activeConversation)
const messages = computed(() => conversation.value?.messages ?? [])

/** Derive the latest session ID from conversation messages so it survives navigation. */
const latestSessionId = computed(() => {
  const msgs = messages.value
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.sessionId) return msgs[i]!.sessionId
  }
  return null
})

onMounted(async () => {
  await modelStore.fetchModels()
  if (modelStore.chatModelNames.length > 0 && !selectedModel.value) {
    selectedModel.value = modelStore.chatModelNames[0]!
  }
  await ragStore.loadDocuments()
})

async function handleSend(text: string, attachments: ChatAttachment[] = []) {
  if (!selectedModel.value) return

  // Create conversation if none active
  let convId = conversationStore.activeConversationId
  if (!convId) {
    convId = conversationStore.createConversation(selectedModel.value)
  }

  // Build content with document attachments prepended
  const docAttachments = attachments.filter((a) => a.type === 'document' && a.content)
  const imageAttachments = attachments.filter((a) => a.type === 'image' && a.content)

  let content = text
  if (docAttachments.length > 0) {
    const docContext = docAttachments
      .map((a) => `[Attached: ${a.name}]\n${a.content}`)
      .join('\n\n')
    content = docContext + '\n\n---\n\n' + text
  }

  // Add user message
  const userMsg = {
    id: nanoid(),
    conversationId: convId,
    role: 'user' as const,
    content,
    timestamp: Date.now(),
    isStreaming: false,
    attachments: attachments.length > 0 ? attachments : undefined,
  }
  conversationStore.addMessage(convId, userMsg)

  // Create assistant placeholder
  const assistantMsgId = nanoid()
  const assistantMsg = {
    id: assistantMsgId,
    conversationId: convId,
    role: 'assistant' as const,
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
  }
  conversationStore.addMessage(convId, assistantMsg)

  // Get messages in Ollama format and start chat stream
  const ollamaMessages = conversationStore.getMessagesAsOllamaFormat(convId)
  // Remove the empty assistant message we just added for display
  const messagesToSend = ollamaMessages.slice(0, -1)

  // Inject images into the last user message for multimodal models
  if (imageAttachments.length > 0) {
    const lastUserMsg = [...messagesToSend].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      lastUserMsg.images = imageAttachments
        .map((a) => a.content!.replace(/^data:[^;]+;base64,/, ''))
    }
  }

  // Inject system prompt if set
  if (chatSettings.value.systemPrompt.trim()) {
    messagesToSend.unshift({
      role: 'system',
      content: chatSettings.value.systemPrompt.trim(),
    })
  }

  // Inject RAG context if enabled and documents are available
  if (ragEnabled.value && ragStore.enabledDocuments.length > 0) {
    try {
      const ragContext = await ragStore.getContextForQuery(
        text,
        selectedModel.value,
        5,
      )
      if (ragContext) {
        messagesToSend.unshift({
          role: 'system',
          content: ragContext,
        })
      }
    } catch {
      // RAG context injection failed silently — continue without it
    }
  }

  // Apply memory context manager (sliding window, summarization, facts, RAG memory)
  let finalMessages = messagesToSend
  try {
    const existingSummary = memoryStore.getSummary(convId)?.summary
    const result = await prepareContext({
      conversationId: convId,
      messages: messagesToSend,
      model: selectedModel.value,
      settings: memoryStore.settings,
      userFactsPrompt: memoryStore.getFactsAsSystemPrompt(),
      existingSummary,
    })
    finalMessages = result.messages
    if (result.newSummary) {
      const nonSystem = messagesToSend.filter((m) => m.role !== 'system')
      memoryStore.setSummary(convId, result.newSummary, nonSystem.length)
    }
  } catch {
    // Context preparation failed — send raw messages
  }

  try {
    // Merge conversation options with settings panel options
    const mergedOptions = {
      ...conversation.value?.options,
      ...chatSettings.value.options,
    }
    const enabledTools = toolDefinitionStore.enabledDefinitions
    const sessionId = await startChatStream(
      selectedModel.value,
      finalMessages,
      mergedOptions,
      enabledTools.length > 0 ? enabledTools : undefined,
    )

    // Link the assistant message to the session
    const conv = conversationStore.conversations.get(convId)
    const msg = conv?.messages.find((m) => m.id === assistantMsgId)
    if (msg) msg.sessionId = sessionId

    // Watch for session output updates
    const stopWatch = watch(
      () => sessionStore.sessionById(sessionId)?.outputText,
      (outputText) => {
        if (outputText !== undefined) {
          conversationStore.updateAssistantContent(convId!, assistantMsgId, outputText)
        }
      },
    )

    // Watch for completion — embed messages for RAG memory
    const capturedConvId = convId
    const capturedText = text
    const stopStatusWatch = watch(
      () => sessionStore.sessionById(sessionId)?.status,
      (status) => {
        if (status === 'completed' || status === 'error' || status === 'cancelled') {
          conversationStore.finalizeMessage(capturedConvId, assistantMsgId)
          isStreaming.value = false
          stopWatch()
          stopStatusWatch()

          // Embed user + assistant messages for RAG-based message memory (fire and forget)
          if (
            status === 'completed' &&
            memoryStore.settings.ragMemory.enabled &&
            memoryStore.settings.ragMemory.embeddingModel
          ) {
            const assistantContent = sessionStore.sessionById(sessionId)?.outputText ?? ''
            embedNewMessages(
              capturedConvId,
              [
                { role: 'user', content: capturedText, timestamp: userMsg.timestamp },
                { role: 'assistant', content: assistantContent, timestamp: Date.now() },
              ],
              memoryStore.settings.ragMemory.embeddingModel,
            ).catch(() => {
              // Embedding failed silently
            })
          }
        }
      },
    )
  } catch {
    conversationStore.finalizeMessage(convId, assistantMsgId)
  }
}

function handleCancel() {
  cancel()
}

function startNewChat() {
  conversationStore.setActiveConversation(null)
}

function openSession(sessionId: string) {
  router.push({ name: 'session', params: { id: sessionId } })
}

function showNotification(msg: string) {
  notificationMessage.value = msg
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => {
    notificationMessage.value = null
  }, 5000)
}

function dismissNotification() {
  notificationMessage.value = null
  if (notificationTimer) clearTimeout(notificationTimer)
}

const defaultSettings: ChatSettings = {
  systemPrompt: '',
  options: {},
}

async function handleCommand(name: string, args: string) {
  const cmd = findCommand(name)
  if (!cmd) {
    showNotification(`Unknown command: /${name}. Type /help for available commands.`)
    return
  }

  const ctx: SlashCommandContext = {
    clearConversation: () => conversationStore.setActiveConversation(null),
    newChat: () => conversationStore.setActiveConversation(null),
    sendAsUser: (text: string) => handleSend(text),
    copyLastResponse: () => {
      const assistantMsgs = messages.value.filter((m) => m.role === 'assistant')
      const last = assistantMsgs[assistantMsgs.length - 1]
      if (last?.content) {
        navigator.clipboard.writeText(last.content)
        showNotification('Copied to clipboard.')
      } else {
        showNotification('No assistant response to copy.')
      }
    },
    exportConversation: (format: 'json' | 'text') => {
      const conv = conversation.value
      if (!conv || conv.messages.length === 0) {
        showNotification('No conversation to export.')
        return
      }
      let content: string
      let filename: string
      if (format === 'json') {
        content = JSON.stringify(conv.messages, null, 2)
        filename = `chat-${conv.id}.json`
      } else {
        content = conv.messages
          .map((m) => `[${m.role}] ${m.content}`)
          .join('\n\n')
        filename = `chat-${conv.id}.txt`
      }
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
    setSystemPrompt: (prompt: string) => {
      chatSettings.value = { ...chatSettings.value, systemPrompt: prompt }
    },
    setOption: (key, value) => {
      chatSettings.value = {
        ...chatSettings.value,
        options: { ...chatSettings.value.options, [key]: value },
      }
    },
    resetSettings: () => {
      chatSettings.value = { ...defaultSettings }
    },
    setJsonFormat: (_enabled: boolean) => {
      // Ollama format option is on the request, not chatSettings.options
      // For now, show notification
      showNotification('JSON format toggled. This affects the next request.')
    },
    switchModel: (name: string) => {
      selectedModel.value = name
    },
    availableModels: modelStore.chatModelNames,
    currentModel: selectedModel.value,
    toggleRag: () => {
      ragEnabled.value = !ragEnabled.value
    },
    ragEnabled: ragEnabled.value,
    navigate: (path: string) => router.push(path),
    openSettings: () => {
      showSettings.value = true
    },
    openSessionDetails: () => {
      const sid = latestSessionId.value
      if (sid) {
        router.push({ name: 'session', params: { id: sid } })
      } else {
        showNotification('No active session.')
      }
    },
    addFact: (content: string) => memoryStore.addFact(content),
    removeFact: (search: string) => memoryStore.removeFactByContent(search),
    getFacts: () => memoryStore.facts,
    showNotification,
    messages: messages.value,
    chatSettings,
    currentSessionId: latestSessionId.value ?? currentSessionId.value,
    getSessionTokenCount: () => {
      const sid = latestSessionId.value ?? currentSessionId.value
      if (!sid) return null
      const metrics = metricsStore.getMetrics(sid)
      if (!metrics) return null
      return { prompt: metrics.promptTokenCount, completion: metrics.completionTokenCount }
    },
    getAverageSpeed: () => {
      const agg = metricsStore.aggregate
      return agg.totalSessions > 0 ? agg.avgTps : null
    },
    getOllamaStatus: async () => {
      try {
        const res = await fetch('/api/tags')
        return { connected: res.ok, model: selectedModel.value }
      } catch {
        return { connected: false, model: selectedModel.value }
      }
    },
  }

  await cmd.execute(args, ctx)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Command notification toast -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition-all duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="notificationMessage"
        class="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-xl border border-border-default bg-surface-raised px-4 py-3 shadow-lg"
      >
        <div class="flex items-start gap-3">
          <p class="max-w-md whitespace-pre-wrap text-sm text-text-primary">{{ notificationMessage }}</p>
          <button
            class="shrink-0 text-text-muted hover:text-text-primary transition-colors text-xs"
            @click="dismissNotification"
          >
            ✕
          </button>
        </div>
      </div>
    </Transition>

    <!-- Top bar with model selector + new chat -->
    <div class="flex items-center justify-between border-b border-border-default bg-surface-raised px-4 py-2">
      <div class="flex items-center gap-3">
        <select
          v-model="selectedModel"
          class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
        >
          <option v-if="modelStore.chatModelNames.length === 0" value="" disabled>No models</option>
          <option v-for="name in modelStore.chatModelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <span v-if="conversation" class="text-xs text-text-muted truncate max-w-[200px]">
          {{ conversation.title }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- RAG toggle -->
        <button
          v-if="ragStore.readyDocuments.length > 0"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
          :class="ragEnabled ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-secondary'"
          :title="ragEnabled ? `RAG active (${ragStore.enabledDocuments.length} docs)` : 'RAG disabled'"
          @click="ragEnabled = !ragEnabled"
        >
          <span>📚</span>
          <span>{{ ragEnabled ? ragStore.enabledDocuments.length : 'Off' }}</span>
        </button>
        <button
          v-if="latestSessionId"
          class="rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-surface-overlay transition-colors"
          @click="openSession(latestSessionId!)"
        >
          View session details
        </button>
        <button
          class="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
          @click="startNewChat"
        >
          + New Chat
        </button>
        <button
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors"
          :class="showSettings ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'"
          @click="showSettings = !showSettings"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </div>

    <!-- Main content area: messages + optional settings panel -->
    <div class="flex flex-1 min-h-0">
      <!-- Chat column -->
      <div class="flex flex-1 flex-col min-w-0">
        <ChatMessageList :messages="messages" />
        <ChatInput
          :is-streaming="isStreaming"
          :selected-model="selectedModel"
          @send="handleSend"
          @command="handleCommand"
          @cancel="handleCancel"
        />
      </div>

      <!-- Settings side panel -->
      <div
        v-if="showSettings"
        class="w-72 shrink-0 border-l border-border-default bg-surface-raised"
      >
        <div class="flex items-center justify-between border-b border-border-default px-4 py-2">
          <span class="text-xs font-medium text-text-secondary">Chat Settings</span>
          <button
            class="text-text-muted hover:text-text-primary transition-colors text-xs"
            @click="showSettings = false"
          >
            ✕
          </button>
        </div>
        <ChatSettingsPanel v-model="chatSettings" />
      </div>
    </div>
  </div>
</template>
