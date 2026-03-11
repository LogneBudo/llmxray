<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types/conversation'
import { useReasoningStore } from '@/stores/reasoning-store'
import InlineThinkingBlock from './InlineThinkingBlock.vue'
import AssistantTokenStream from './AssistantTokenStream.vue'
import AttachmentBubble from './AttachmentBubble.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const reasoningStore = useReasoningStore()

const thinkingState = computed(() => {
  if (!props.message.sessionId) return { isThinking: false, content: '' }
  return reasoningStore.getThinking(props.message.sessionId)
})

const isUser = computed(() => props.message.role === 'user')

// For completed (non-streaming) assistant messages, strip think tags for display
const displayContent = computed(() => {
  if (isUser.value) {
    // Strip prepended document context from display
    if (props.message.attachments?.length) {
      const separator = '\n\n---\n\n'
      const sepIndex = props.message.content.lastIndexOf(separator)
      if (sepIndex !== -1) return props.message.content.slice(sepIndex + separator.length)
    }
    return props.message.content
  }
  if (props.message.isStreaming) return '' // Token stream handles display
  return props.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
})

const formattedTime = computed(() => {
  const d = new Date(props.message.timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="flex w-full" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5"
      :class="
        isUser
          ? 'bg-accent text-white rounded-br-md'
          : 'bg-surface-raised border border-border-default rounded-bl-md'
      "
    >
      <!-- User message -->
      <template v-if="isUser">
        <AttachmentBubble v-if="message.attachments?.length" :attachments="message.attachments" />
        <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ displayContent }}</p>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <!-- Inline thinking indicator -->
        <InlineThinkingBlock
          v-if="message.sessionId"
          :is-thinking="thinkingState.isThinking"
          :content="thinkingState.content"
          :completed="!message.isStreaming"
        />

        <!-- Streaming: show token stream -->
        <AssistantTokenStream
          v-if="message.isStreaming && message.sessionId"
          :session-id="message.sessionId"
        />

        <!-- Completed: show plain text -->
        <p
          v-else-if="displayContent"
          class="text-sm leading-relaxed text-text-primary whitespace-pre-wrap"
        >{{ displayContent }}</p>

        <!-- Streaming cursor when no tokens yet -->
        <span
          v-if="message.isStreaming && !displayContent"
          class="inline-block h-4 w-1.5 bg-text-muted animate-pulse"
        />
      </template>

      <div class="mt-1 text-[10px] opacity-50" :class="isUser ? 'text-right' : ''">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>
