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
    <div class="mx-auto max-w-3xl space-y-4" :class="messages.length === 0 ? 'flex min-h-full flex-col justify-center' : ''">
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="flex items-center justify-center">
        <div class="text-center">
          <svg class="mx-auto mb-4 h-20 w-20 text-text-muted/20" viewBox="0 0 297.5 297.5">
            <path fill="currentColor" d="M179.293,23.839c-64.904,0-117.707,52.804-117.707,117.707c0,1.832,0.056,3.651,0.14,5.463H9.933  c-5.486,0-9.933,4.448-9.933,9.933v46.189c0,5.486,4.448,9.933,9.933,9.933h22.349v43.209h-6.953c-4.663,0-8.443,3.78-8.443,8.443  c0,4.663,3.78,8.443,8.443,8.443h30.793c4.663,0,8.443-3.78,8.443-8.443c0-4.663-3.78-8.443-8.443-8.443h-6.953v-43.209h36.713  c21.533,28.059,55.39,46.189,93.411,46.189c64.904,0,117.707-52.804,117.707-117.707S244.196,23.839,179.293,23.839z   M19.866,166.876h213.087c-5.257,11.091-13.854,20.295-24.483,26.323H19.866V166.876z M119.942,141.547  c0-32.726,26.624-59.35,59.35-59.35s59.35,26.624,59.35,59.35c0,1.843-0.096,3.663-0.261,5.463H120.206  C120.04,145.21,119.942,143.39,119.942,141.547z M179.293,239.388c-25.75,0-49.202-10.003-66.689-26.323h32.684  c10.31,4.925,21.837,7.698,34.005,7.698c43.68,0,79.217-35.536,79.217-79.217S222.973,62.33,179.293,62.33  s-79.217,35.536-79.217,79.217c0,1.839,0.086,3.657,0.214,5.463H81.611c-0.101-1.809-0.16-3.629-0.16-5.463  c0-48.871,36.016-89.488,82.901-96.702c-0.758,1.266-1.201,2.741-1.201,4.324c0,4.663,3.78,8.443,8.443,8.443h15.396  c4.663,0,8.443-3.78,8.443-8.443c0-1.583-0.443-3.058-1.201-4.324c46.884,7.214,82.901,47.83,82.901,96.702  C277.134,195.497,233.243,239.388,179.293,239.388z"/>
          </svg>
          <p class="text-2xl font-semibold text-text-primary mb-2">LLMxRay</p>
          <p class="text-sm text-text-muted">{{ $t('dashboard.empty.startConversation') }}</p>
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
