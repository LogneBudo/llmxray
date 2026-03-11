<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { nanoid } from 'nanoid'
import { useConversationStore } from '@/stores/conversation-store'
import { useModelStore } from '@/stores/model-store'
import { useSessionStore } from '@/stores/session-store'
import { useOllamaStream } from '@/composables/useOllamaStream'
import { useRagStore } from '@/stores/rag-store'
import ChatMessageList from './ChatMessageList.vue'
import ChatInput from './ChatInput.vue'
import type { ChatSettings } from '@/types/conversation'
import ChatSettingsPanel from './ChatSettingsPanel.vue'

const router = useRouter()
const conversationStore = useConversationStore()
const modelStore = useModelStore()
const sessionStore = useSessionStore()
const ragStore = useRagStore()
const { isStreaming, currentSessionId, startChatStream, cancel } = useOllamaStream()

const selectedModel = ref('')
const ragEnabled = ref(true)
const showSettings = ref(false)
const chatSettings = ref<ChatSettings>({
  systemPrompt: '',
  options: {},
})
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)

const conversation = computed(() => conversationStore.activeConversation)
const messages = computed(() => conversation.value?.messages ?? [])

onMounted(async () => {
  await modelStore.fetchModels()
  if (modelStore.chatModelNames.length > 0 && !selectedModel.value) {
    selectedModel.value = modelStore.chatModelNames[0]!
  }
  await ragStore.loadDocuments()
})

async function handleSend(text: string) {
  if (!selectedModel.value) return

  // Create conversation if none active
  let convId = conversationStore.activeConversationId
  if (!convId) {
    convId = conversationStore.createConversation(selectedModel.value)
  }

  // Add user message
  const userMsg = {
    id: nanoid(),
    conversationId: convId,
    role: 'user' as const,
    content: text,
    timestamp: Date.now(),
    isStreaming: false,
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
        // Prepend a system message with RAG context
        messagesToSend.unshift({
          role: 'system',
          content: ragContext,
        })
      }
    } catch {
      // RAG context injection failed silently — continue without it
    }
  }

  try {
    // Merge conversation options with settings panel options
    const mergedOptions = {
      ...conversation.value?.options,
      ...chatSettings.value.options,
    }
    const sessionId = await startChatStream(
      selectedModel.value,
      messagesToSend,
      mergedOptions,
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

    // Watch for completion
    const stopStatusWatch = watch(
      () => sessionStore.sessionById(sessionId)?.status,
      (status) => {
        if (status === 'completed' || status === 'error' || status === 'cancelled') {
          conversationStore.finalizeMessage(convId!, assistantMsgId)
          isStreaming.value = false
          stopWatch()
          stopStatusWatch()
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
</script>

<template>
  <div class="flex h-full flex-col">
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
          v-if="currentSessionId"
          class="rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-surface-overlay transition-colors"
          @click="openSession(currentSessionId!)"
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
          ref="chatInputRef"
          :is-streaming="isStreaming"
          :selected-model="selectedModel"
          @send="handleSend"
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
