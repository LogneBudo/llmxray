<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  isThinking: boolean
  content: string
  completed: boolean
}>()

const expanded = ref(false)
</script>

<template>
  <div v-if="isThinking || (completed && content)" class="my-2">
    <button
      class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors"
      :class="isThinking ? 'bg-[#a78bfa]/10 text-[#a78bfa]' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'"
      @click="expanded = !expanded"
    >
      <span v-if="isThinking" class="relative inline-flex h-4 w-4 items-center justify-center">
        <span class="absolute h-full w-full rounded-full border-2 border-[#a78bfa]/30" />
        <span class="absolute h-full w-full rounded-full border-2 border-transparent border-t-[#a78bfa]" style="animation: thinking-orbit 1s linear infinite" />
        <span class="h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
      </span>
      <span v-else class="text-text-muted">💭</span>
      <span>{{ isThinking ? 'Thinking...' : 'Thought process' }}</span>
      <span class="text-text-muted transition-transform" :class="{ 'rotate-180': expanded }">▾</span>
    </button>
    <div
      v-if="expanded"
      class="mt-1 ml-2 rounded-lg border-l-2 border-[#a78bfa]/30 bg-surface px-4 py-3 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-80 overflow-auto"
    >
      {{ content }}
      <span v-if="isThinking" class="inline-flex items-center gap-0.5 ml-1 align-text-bottom">
        <span class="h-1 w-1 rounded-full bg-[#a78bfa]" style="animation: typing-bounce 1.2s ease-in-out infinite" />
        <span class="h-1 w-1 rounded-full bg-[#a78bfa]" style="animation: typing-bounce 1.2s ease-in-out 0.2s infinite" />
        <span class="h-1 w-1 rounded-full bg-[#a78bfa]" style="animation: typing-bounce 1.2s ease-in-out 0.4s infinite" />
      </span>
    </div>
  </div>
</template>
