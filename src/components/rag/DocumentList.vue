<script setup lang="ts">
import type { RagDocument } from '@/types/rag'

defineProps<{
  documents: RagDocument[]
  enabledIds: Set<string>
}>()

const emit = defineEmits<{
  toggle: [documentId: string]
  remove: [documentId: string]
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatIcons: Record<string, string> = {
  pdf: '📕',
  docx: '📘',
  txt: '📝',
  md: '📋',
  csv: '📊',
}
</script>

<template>
  <div v-if="documents.length === 0" class="rounded-lg bg-surface-overlay p-6 text-center">
    <p class="text-sm text-text-muted">No documents ingested yet</p>
  </div>

  <div v-else class="space-y-2">
    <div
      v-for="doc in documents"
      :key="doc.id"
      class="flex items-center gap-3 rounded-lg border border-border-default bg-surface-raised px-4 py-3 transition-colors"
    >
      <!-- Toggle for RAG context -->
      <button
        v-if="doc.status === 'ready'"
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
        :class="
          enabledIds.has(doc.id)
            ? 'border-accent bg-accent text-white'
            : 'border-border-default hover:border-accent'
        "
        title="Toggle RAG context"
        @click="emit('toggle', doc.id)"
      >
        <span v-if="enabledIds.has(doc.id)" class="text-xs">✓</span>
      </button>
      <span v-else class="h-5 w-5" />

      <!-- Icon -->
      <span class="text-lg">{{ formatIcons[doc.format] ?? '📄' }}</span>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text-primary truncate">{{ doc.name }}</p>
        <p class="text-xs text-text-muted">
          {{ formatSize(doc.sizeBytes) }} · {{ doc.chunkCount }} chunks · {{ doc.embeddingModel }}
          <span v-if="doc.status !== 'ready'" class="ml-1">
            · <span
              :class="doc.status === 'error' ? 'text-error' : 'text-accent'"
            >{{ doc.status }}</span>
          </span>
        </p>
      </div>

      <!-- Date -->
      <span class="text-xs text-text-muted shrink-0">{{ formatDate(doc.addedAt) }}</span>

      <!-- Delete -->
      <button
        class="shrink-0 rounded p-1 text-text-muted hover:text-error transition-colors"
        title="Remove document"
        @click="emit('remove', doc.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>
