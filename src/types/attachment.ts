export type AttachmentType = 'image' | 'document'

export interface ChatAttachment {
  id: string
  name: string
  type: AttachmentType
  mimeType: string
  sizeBytes: number
  /** For images: base64 data URL. For documents: extracted text. */
  content?: string
  status: 'pending' | 'parsing' | 'ready' | 'error'
  error?: string
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'csv'])

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(filename))
}

export function isDocumentFile(filename: string): boolean {
  return DOCUMENT_EXTENSIONS.has(getFileExtension(filename))
}

export function isSupportedFile(filename: string): boolean {
  return isImageFile(filename) || isDocumentFile(filename)
}

export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp'

export const MAX_DOCUMENT_CHARS = 8000
