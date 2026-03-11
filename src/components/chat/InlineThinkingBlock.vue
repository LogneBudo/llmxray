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
      <span v-if="isThinking" class="inline-block h-2 w-2 rounded-full bg-[#a78bfa] animate-pulse" />
      <span v-else class="text-text-muted">💭</span>
      <span>{{ isThinking ? 'Thinking...' : 'Thought process' }}</span>
      <span class="text-text-muted transition-transform" :class="{ 'rotate-180': expanded }">▾</span>
    </button>
    <div
      v-if="expanded"
      class="mt-1 ml-2 rounded-lg border-l-2 border-[#a78bfa]/30 bg-surface px-4 py-3 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-80 overflow-auto"
    >
      {{ content }}
      <span v-if="isThinking" class="inline-block w-1.5 h-4 bg-[#a78bfa] animate-pulse ml-0.5 align-text-bottom" />
    </div>
  </div>
</template>
