<script setup lang="ts">
import type { ChatAttachment } from '@/types/attachment'
import { formatBytes } from '@/utils/format'

defineProps<{
  attachments: ChatAttachment[]
}>()
</script>

<template>
  <div v-if="attachments.length > 0" class="mb-1.5 flex flex-wrap gap-1.5">
    <div
      v-for="att in attachments"
      :key="att.id"
      class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px]"
    >
      <!-- Image thumbnail -->
      <img
        v-if="att.type === 'image' && att.content"
        :src="att.content"
        :alt="att.name"
        class="h-5 w-5 rounded object-cover"
      />
      <!-- Document icon -->
      <svg v-else class="h-3.5 w-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span class="max-w-[100px] truncate opacity-90">{{ att.name }}</span>
      <span class="opacity-60">{{ formatBytes(att.sizeBytes) }}</span>
    </div>
  </div>
</template>
