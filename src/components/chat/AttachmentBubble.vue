<script setup lang="ts">
import { ref } from 'vue'
import type { ChatAttachment } from '@/types/attachment'
import { formatBytes } from '@/utils/format'
import { FileText, X } from 'lucide-vue-next'

defineProps<{
  attachments: ChatAttachment[]
}>()

const lightboxSrc = ref<string | null>(null)

function openLightbox(att: ChatAttachment) {
  if (att.content) lightboxSrc.value = att.content
}

function closeLightbox() {
  lightboxSrc.value = null
}
</script>

<template>
  <div v-if="attachments.length > 0" class="mb-1.5 space-y-1.5">
    <!-- Image attachments — larger preview -->
    <div v-for="att in attachments.filter((a) => a.type === 'image' && a.content)" :key="att.id">
      <img
        :src="att.content"
        :alt="att.name"
        class="max-h-48 max-w-full cursor-pointer rounded-lg object-contain"
        @click="openLightbox(att)"
      />
      <div class="mt-0.5 flex items-center gap-1.5 text-[10px] opacity-60">
        <span class="truncate">{{ att.name }}</span>
        <span>{{ formatBytes(att.sizeBytes) }}</span>
      </div>
    </div>

    <!-- Document attachments — compact pills -->
    <div class="flex flex-wrap gap-1.5">
      <div
        v-for="att in attachments.filter((a) => a.type === 'document')"
        :key="att.id"
        class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px]"
      >
        <FileText class="h-3.5 w-3.5 opacity-70" />
        <span class="max-w-[100px] truncate opacity-90">{{ att.name }}</span>
        <span class="opacity-60">{{ formatBytes(att.sizeBytes) }}</span>
      </div>
    </div>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxSrc"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          @click="closeLightbox"
        >
          <img
            :src="lightboxSrc"
            class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            @click.stop
          />
          <button
            class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            @click="closeLightbox"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
