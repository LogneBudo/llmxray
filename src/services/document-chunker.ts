import { nanoid } from 'nanoid'
import type { DocumentChunk, ChunkingOptions, ChunkMetadata } from '@/types/rag'

const DEFAULT_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: '\n\n',
}

export function chunkDocument(
  documentId: string,
  text: string,
  options?: Partial<ChunkingOptions>,
): DocumentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: DocumentChunk[] = []

  // First split by the preferred separator to respect paragraph boundaries
  const sections = text.split(opts.separator).filter((s) => s.trim())

  let currentChunk = ''
  let chunkStart = 0
  let charOffset = 0

  for (const section of sections) {
    const potentialChunk = currentChunk
      ? currentChunk + opts.separator + section
      : section

    if (potentialChunk.length > opts.chunkSize && currentChunk) {
      // Emit current chunk
      chunks.push(createChunk(documentId, chunks.length, currentChunk, chunkStart))

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-opts.chunkOverlap)
      chunkStart = charOffset - overlapText.length
      currentChunk = overlapText + opts.separator + section
    } else {
      currentChunk = potentialChunk
    }

    charOffset += section.length + opts.separator.length
  }

  // Emit final chunk
  if (currentChunk.trim()) {
    chunks.push(createChunk(documentId, chunks.length, currentChunk, chunkStart))
  }

  return chunks
}

function createChunk(
  documentId: string,
  index: number,
  content: string,
  startChar: number,
): DocumentChunk {
  const trimmed = content.trim()
  const metadata: ChunkMetadata = {
    startChar,
    endChar: startChar + trimmed.length,
  }

  return {
    id: nanoid(),
    documentId,
    index,
    content: trimmed,
    tokenEstimate: Math.ceil(trimmed.split(/\s+/).length * 1.3),
    metadata,
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3)
}
