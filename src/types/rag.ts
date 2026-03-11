export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md' | 'csv'

export interface RagDocument {
  id: string
  name: string
  format: DocumentFormat
  sizeBytes: number
  addedAt: number
  chunkCount: number
  embeddingModel: string
  status: DocumentStatus
  error?: string
}

export type DocumentStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'ready' | 'error'

export interface DocumentChunk {
  id: string
  documentId: string
  index: number
  content: string
  tokenEstimate: number
  metadata: ChunkMetadata
}

export interface ChunkMetadata {
  page?: number
  section?: string
  row?: number
  startChar: number
  endChar: number
}

export interface EmbeddedChunk {
  id: string
  documentId: string
  chunkId: string
  content: string
  embedding: number[]
  metadata: ChunkMetadata
}

export interface RagSearchResult {
  chunk: EmbeddedChunk
  score: number
  documentName: string
}

export interface ChunkingOptions {
  chunkSize: number      // target chars per chunk
  chunkOverlap: number   // overlap between adjacent chunks
  separator: string      // preferred split boundary
}
