<script setup lang="ts">
import { ref } from 'vue'
import { detectFormat } from '@/services/document-parser'

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv'

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  const valid = files.filter((f) => detectFormat(f.name) !== null)
  if (valid.length > 0) emit('upload', valid)
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  const valid = files.filter((f) => detectFormat(f.name) !== null)
  if (valid.length > 0) emit('upload', valid)
  target.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer"
    :class="
      isDragging
        ? 'border-accent bg-accent/5'
        : 'border-border-default hover:border-accent/50'
    "
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPTED"
      multiple
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="space-y-2">
      <div class="text-3xl">📄</div>
      <p class="text-sm font-medium text-text-primary">
        Drop files here or click to browse
      </p>
      <p class="text-xs text-text-muted">
        Supports PDF, DOCX, TXT, Markdown, CSV
      </p>
    </div>
  </div>
</template>
