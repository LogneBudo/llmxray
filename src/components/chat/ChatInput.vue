<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { useFileAttachment } from '@/composables/useFileAttachment'
import { ACCEPTED_FILE_TYPES } from '@/types/attachment'
import type { ChatAttachment } from '@/types/attachment'
import { Paperclip, Eye, Slash, Send } from 'lucide-vue-next'
import SlashCommandDropdown from './SlashCommandDropdown.vue'
import AttachmentPreview from './AttachmentPreview.vue'
import type { SlashCommand } from '@/types/slash-command'

const emit = defineEmits<{
  send: [message: string, attachments: ChatAttachment[]]
  command: [name: string, args: string]
  cancel: []
}>()

const props = defineProps<{
  isStreaming: boolean
  selectedModel: string
  isVisionModel: boolean
}>()

defineExpose({ focus })

const modelStore = useModelStore()
const message = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const dropdownRef = ref<InstanceType<typeof SlashCommandDropdown> | null>(null)
const isDragging = ref(false)

const { attachments, isProcessing, addFiles, removeAttachment, clearAttachments } =
  useFileAttachment()

onMounted(() => {
  modelStore.fetchModels()
})

const showSlashDropdown = computed(() => {
  const text = message.value
  return text.startsWith('/') && !text.includes('\n')
})

const slashFilter = computed(() => {
  if (!showSlashDropdown.value) return ''
  const firstSpace = message.value.indexOf(' ')
  return firstSpace === -1 ? message.value : message.value.slice(0, firstSpace)
})

const canSend = computed(() => {
  const hasText = message.value.trim().length > 0
  const hasAttachments = attachments.value.length > 0
  return (hasText || hasAttachments) && !isProcessing.value
})

function focus() {
  textareaRef.value?.focus()
}

function handleKeydown(e: KeyboardEvent) {
  if (showSlashDropdown.value && dropdownRef.value) {
    const handled = dropdownRef.value.handleKeydown(e)
    if (handled) return
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function handleSlashSelect(cmd: SlashCommand) {
  message.value = `/${cmd.name} `
  textareaRef.value?.focus()
}

function sendMessage() {
  const text = message.value.trim()
  if (!text && attachments.value.length === 0) return

  if (text.startsWith('/') && attachments.value.length === 0) {
    const spaceIndex = text.indexOf(' ')
    const name = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex)
    const args = spaceIndex === -1 ? '' : text.slice(spaceIndex + 1)
    emit('command', name, args)
  } else {
    emit('send', text, [...attachments.value])
    clearAttachments()
  }

  message.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function closeDropdown() {
  message.value = ''
}

function openSlashCommands() {
  message.value = '/'
  textareaRef.value?.focus()
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    addFiles(input.files)
    input.value = '' // Reset so same file can be re-added
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files)
  }
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const imageFiles: File[] = []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) imageFiles.push(file)
    }
  }
  if (imageFiles.length > 0) {
    e.preventDefault()
    addFiles(imageFiles)
  }
}
</script>

<template>
  <div
    class="relative border-t border-border-default bg-surface-raised px-4 py-3"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Drag overlay -->
    <div
      v-if="isDragging"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/5"
    >
      <span class="text-sm text-accent">{{ $t('dashboard.dropZone') }}</span>
    </div>

    <!-- Slash command dropdown -->
    <div class="relative mx-auto max-w-3xl">
      <SlashCommandDropdown
        ref="dropdownRef"
        :filter="slashFilter"
        :visible="showSlashDropdown"
        @select="handleSlashSelect"
        @close="closeDropdown"
      />
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="ACCEPTED_FILE_TYPES"
      class="hidden"
      @change="handleFileSelect"
    />

    <div
      class="mx-auto flex max-w-3xl flex-col rounded-xl border border-border-default bg-surface transition-colors focus-within:border-accent"
    >
      <!-- Attachment preview -->
      <AttachmentPreview
        :attachments="attachments"
        @remove="removeAttachment"
      />

      <div class="flex items-end gap-2 p-1.5" :class="{ 'pt-0': attachments.length > 0 }">
        <!-- Paperclip button -->
        <button
          :disabled="isStreaming"
          class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:opacity-30"
          :title="isVisionModel ? $t('dashboard.input.attachFilesVision') : $t('dashboard.input.attachFiles')"
          @click="triggerFileInput"
        >
          <Paperclip class="h-4 w-4" />
          <!-- Vision badge -->
          <span
            v-if="isVisionModel"
            class="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[8px] text-white"
            :title="$t('dashboard.input.visionBadge')"
          >
            <Eye class="h-2.5 w-2.5" :stroke-width="3" />
          </span>
        </button>

        <!-- Slash commands button -->
        <button
          :disabled="isStreaming"
          class="flex h-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary disabled:opacity-30"
          :title="$t('dashboard.input.commands')"
          @click="openSlashCommands"
        >
          <Slash class="h-4 w-4" />
        </button>

        <textarea
          ref="textareaRef"
          v-model="message"
          :disabled="isStreaming"
          rows="1"
          class="flex-1 resize-none bg-transparent px-1 py-1 text-sm text-text-primary placeholder-text-muted outline-none disabled:opacity-50"
          :placeholder="isVisionModel ? $t('dashboard.input.placeholderVision') : $t('dashboard.input.placeholder')"
          @keydown="handleKeydown"
          @input="autoResize"
          @paste="handlePaste"
        />

        <button
          v-if="isStreaming"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error text-white transition-colors hover:bg-error/80"
          :title="$t('dashboard.input.stopGenerating')"
          @click="$emit('cancel')"
        >
          <span class="inline-block h-2.5 w-2.5 rounded-sm bg-white" />
        </button>
        <button
          v-else
          :disabled="!canSend || !selectedModel"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
          :title="$t('dashboard.input.sendMessage')"
          @click="sendMessage"
        >
          <Send class="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </div>
    </div>
  </div>
</template>
