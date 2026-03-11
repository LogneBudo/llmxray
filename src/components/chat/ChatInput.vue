<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useModelStore } from '@/stores/model-store'

const emit = defineEmits<{
  send: [message: string]
  cancel: []
}>()

defineProps<{
  isStreaming: boolean
  selectedModel: string
}>()

defineExpose({ focus })

const modelStore = useModelStore()
const message = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

onMounted(() => {
  modelStore.fetchModels()
})

function focus() {
  textareaRef.value?.focus()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function sendMessage() {
  const text = message.value.trim()
  if (!text) return
  emit('send', text)
  message.value = ''
  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}
</script>

<template>
  <div class="border-t border-border-default bg-surface-raised px-4 py-3">
    <div class="mx-auto flex max-w-3xl items-end gap-2">
      <div class="relative flex-1">
        <textarea
          ref="textareaRef"
          v-model="message"
          :disabled="isStreaming"
          rows="1"
          class="w-full resize-none rounded-xl border border-border-default bg-surface px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent disabled:opacity-50"
          placeholder="Send a message... (Shift+Enter for new line)"
          @keydown="handleKeydown"
          @input="autoResize"
        />
      </div>
      <button
        v-if="isStreaming"
        class="mb-px flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-error text-white transition-colors hover:bg-error/80"
        title="Stop generating"
        @click="$emit('cancel')"
      >
        <span class="inline-block h-3 w-3 rounded-sm bg-white" />
      </button>
      <button
        v-else
        :disabled="!message.trim() || !selectedModel"
        class="mb-px flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
        title="Send message"
        @click="sendMessage"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  </div>
</template>
