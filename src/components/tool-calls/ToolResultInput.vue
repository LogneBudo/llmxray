<script setup lang="ts">
import { ref } from 'vue'
import type { ToolCallEntry } from '@/types/toolcall'

const props = defineProps<{
  toolCall: ToolCallEntry
}>()

const emit = defineEmits<{
  submit: [toolCallId: string, result: string]
  skip: [toolCallId: string]
}>()

const result = ref('')

function handleSubmit() {
  const text = result.value.trim()
  if (!text) return
  emit('submit', props.toolCall.id, text)
  result.value = ''
}

function handleSkip() {
  emit('skip', props.toolCall.id)
}
</script>

<template>
  <div class="mt-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
    <div class="mb-2 flex items-center gap-2 text-xs">
      <span class="font-medium text-accent">Tool Call:</span>
      <span class="font-mono text-text-primary">{{ toolCall.functionName }}</span>
    </div>

    <!-- Arguments -->
    <div class="mb-2 rounded-md bg-surface px-3 py-2 font-mono text-[11px] text-text-secondary">
      {{ JSON.stringify(toolCall.arguments, null, 2) }}
    </div>

    <!-- Result input -->
    <div class="flex items-end gap-2">
      <textarea
        v-model="result"
        rows="2"
        placeholder='Enter result (e.g. {"temp": 15, "condition": "cloudy"})'
        class="flex-1 resize-y rounded-lg border border-border-default bg-surface px-3 py-1.5 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
        @keydown.enter.ctrl="handleSubmit"
      />
      <div class="flex flex-col gap-1">
        <button
          :disabled="!result.trim()"
          class="rounded-lg bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
          @click="handleSubmit"
        >
          Send
        </button>
        <button
          class="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          @click="handleSkip"
        >
          Skip
        </button>
      </div>
    </div>
  </div>
</template>
