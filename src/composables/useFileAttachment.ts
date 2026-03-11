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
    const id = attachment.id
    const reader = new FileReader()
    reader.onload = () => {
      // Mutate via the reactive array proxy so Vue detects the change
      const att = attachments.value.find((a) => a.id === id)
      if (att) {
        att.content = reader.result as string
        att.status = 'ready'
      }
    }
    reader.onerror = () => {
      const att = attachments.value.find((a) => a.id === id)
      if (att) {
        att.error = 'Failed to read image'
        att.status = 'error'
      }
    }
    reader.readAsDataURL(file)
  }

  async function parseDoc(file: File, attachment: ChatAttachment) {
    attachment.status = 'parsing'
    const id = attachment.id
    try {
      const format = detectFormat(file.name)
      if (!format) {
        const att = attachments.value.find((a) => a.id === id)
        if (att) {
          att.error = 'Unsupported format'
          att.status = 'error'
        }
        return
      }

      let text = await parseDocument(file, format)
      if (text.length > MAX_DOCUMENT_CHARS) {
        text = text.slice(0, MAX_DOCUMENT_CHARS) + '\n\n[... truncated]'
      }
      const att = attachments.value.find((a) => a.id === id)
      if (att) {
        att.content = text
        att.status = 'ready'
      }
    } catch (e) {
      const att = attachments.value.find((a) => a.id === id)
      if (att) {
        att.error = e instanceof Error ? e.message : 'Parse failed'
        att.status = 'error'
      }
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
