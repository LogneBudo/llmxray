<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '@/types/conversation'
import ChatBubble from './ChatBubble.vue'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  })
}

// Auto-scroll when messages change
watch(
  () => props.messages.length,
  () => scrollToBottom(),
)

// Also scroll when a streaming message updates
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => scrollToBottom(),
)

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto px-4 py-6">
    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="flex h-full items-center justify-center">
        <div class="text-center">
          <p class="text-2xl font-semibold text-text-primary mb-2">LLMxRay</p>
          <p class="text-sm text-text-muted">Start a conversation with a local model</p>
        </div>
      </div>

      <ChatBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />
    </div>
  </div>
</template>
