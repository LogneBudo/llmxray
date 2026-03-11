import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import {
  type ChatAttachment,
  isImageFile,
  isDocumentFile,
  isSupportedFile,
  MAX_DOCUMENT_CHARS,
} from '@/types/attachment'
import { detectFormat, parseDocument } from '@/services/document-parser'

export function useFileAttachment() {
  const attachments = ref<ChatAttachment[]>([])

  const isProcessing = computed(() =>
    attachments.value.some((a) => a.status === 'parsing'),
  )

  async function addFiles(files: FileList | File[]) {
    for (const file of files) {
      if (!isSupportedFile(file.name)) continue

      const attachment: ChatAttachment = {
        id: nanoid(),
        name: file.name,
        type: isImageFile(file.name) ? 'image' : 'document',
        mimeType: file.type,
        sizeBytes: file.size,
        status: 'pending',
      }
      attachments.value.push(attachment)

      if (isImageFile(file.name)) {
        readImage(file, attachment)
      } else if (isDocumentFile(file.name)) {
        parseDoc(file, attachment)
      }
    }
  }

  function readImage(file: File, attachment: ChatAttachment) {
    attachment.status = 'parsing'
    const reader = new FileReader()
    reader.onload = () => {
      attachment.content = reader.result as string
      attachment.status = 'ready'
    }
    reader.onerror = () => {
      attachment.error = 'Failed to read image'
      attachment.status = 'error'
    }
    reader.readAsDataURL(file)
  }

  async function parseDoc(file: File, attachment: ChatAttachment) {
    attachment.status = 'parsing'
    try {
      const format = detectFormat(file.name)
      if (!format) {
        attachment.error = 'Unsupported format'
        attachment.status = 'error'
        return
      }

      let text = await parseDocument(file, format)
      if (text.length > MAX_DOCUMENT_CHARS) {
        text = text.slice(0, MAX_DOCUMENT_CHARS) + '\n\n[... truncated]'
      }
      attachment.content = text
      attachment.status = 'ready'
    } catch (e) {
      attachment.error = e instanceof Error ? e.message : 'Parse failed'
      attachment.status = 'error'
    }
  }

  function removeAttachment(id: string) {
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  function clearAttachments() {
    attachments.value = []
  }

  return {
    attachments,
    isProcessing,
    addFiles,
    removeAttachment,
    clearAttachments,
  }
}
