<script setup lang="ts">
import type { ChatAttachment } from '@/types/attachment'
import { formatBytes } from '@/utils/format'
import { FileText, X } from 'lucide-vue-next'

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
        <FileText class="h-4 w-4" />
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
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
