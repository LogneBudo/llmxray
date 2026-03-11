<script setup lang="ts">
import type { ChatAttachment } from '@/types/attachment'
import { formatBytes } from '@/utils/format'

defineProps<{
  attachments: ChatAttachment[]
}>()

defineEmits<{
  remove: [id: string]
}>()
</script>

<template>
  <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 px-2.5 pb-1.5 pt-1">
    <div
      v-for="att in attachments"
      :key="att.id"
      class="flex items-center gap-2 rounded-lg border border-border-default bg-surface-overlay px-2.5 py-1.5 text-xs"
    >
      <!-- Image thumbnail -->
      <img
        v-if="att.type === 'image' && att.content"
        :src="att.content"
        :alt="att.name"
        class="h-6 w-6 rounded object-cover"
      />
      <!-- Document icon -->
      <span v-else-if="att.type === 'document'" class="text-text-muted">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </span>

      <span class="max-w-[120px] truncate text-text-primary">{{ att.name }}</span>
      <span class="text-text-muted">{{ formatBytes(att.sizeBytes) }}</span>

      <!-- Status -->
      <span v-if="att.status === 'parsing'" class="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <span v-else-if="att.status === 'error'" class="text-error" title="Parse error">!</span>

      <!-- Remove button -->
      <button
        class="text-text-muted hover:text-error transition-colors"
        @click="$emit('remove', att.id)"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>
