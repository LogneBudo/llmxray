import { nanoid } from 'nanoid'
import type {
  RagDocument,
  DocumentChunk,
  EmbeddedChunk,
  RagSearchResult,
  DocumentFormat,
  ChunkingOptions,
} from '@/types/rag'
import { parseDocument, detectFormat } from './document-parser'
import { chunkDocument } from './document-chunker'
import { ollamaClient } from './ollama-client'
import { vectorDB } from './vector-db'

export interface IngestProgress {
  stage: RagDocument['status']
  message: string
  progress: number // 0-1
}

export type ProgressCallback = (progress: IngestProgress) => void

export async function ingestDocument(
  file: File,
  embeddingModel: string,
  chunkingOptions?: Partial<ChunkingOptions>,
  onProgress?: ProgressCallback,
): Promise<RagDocument> {
  const format = detectFormat(file.name)
  if (!format) {
    throw new Error(`Unsupported file format: ${file.name}`)
  }

  const docId = nanoid()
  const doc: RagDocument = {
    id: docId,
    name: file.name,
    format,
    sizeBytes: file.size,
    addedAt: Date.now(),
    chunkCount: 0,
    embeddingModel,
    status: 'pending',
  }

  try {
    // Stage 1: Parse
    doc.status = 'parsing'
    onProgress?.({ stage: 'parsing', message: `Parsing ${file.name}...`, progress: 0.1 })
    const text = await parseDocument(file, format)

    if (!text.trim()) {
      throw new Error('Document produced no extractable text')
    }

    // Stage 2: Chunk
    doc.status = 'chunking'
    onProgress?.({ stage: 'chunking', message: 'Splitting into chunks...', progress: 0.3 })
    const chunks = chunkDocument(docId, text, chunkingOptions)
    doc.chunkCount = chunks.length

    // Stage 3: Embed
    doc.status = 'embedding'
    onProgress?.({ stage: 'embedding', message: `Embedding ${chunks.length} chunks...`, progress: 0.4 })

    const embeddedChunks = await embedChunks(chunks, embeddingModel, (done, total) => {
      const progress = 0.4 + (done / total) * 0.5
      onProgress?.({
        stage: 'embedding',
        message: `Embedding chunk ${done}/${total}...`,
        progress,
      })
    })

    // Stage 4: Store
    onProgress?.({ stage: 'ready', message: 'Storing vectors...', progress: 0.95 })
    await vectorDB.storeChunks(embeddedChunks)
    doc.status = 'ready'
    await vectorDB.storeDocument(doc)

    onProgress?.({ stage: 'ready', message: 'Done!', progress: 1.0 })
    return doc
  } catch (err) {
    doc.status = 'error'
    doc.error = err instanceof Error ? err.message : 'Ingestion failed'
    await vectorDB.storeDocument(doc)
    throw err
  }
}

async function embedChunks(
  chunks: DocumentChunk[],
  model: string,
  onChunkDone: (done: number, total: number) => void,
): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = []

  // Batch embed — Ollama /api/embed supports array input
  const batchSize = 10
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map((c) => c.content)

    const response = await ollamaClient.embed({
      model,
      input: texts,
    })

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j]!
      const embedding = response.embeddings[j]
      if (!embedding) continue

      results.push({
        id: nanoid(),
        documentId: chunk.documentId,
        chunkId: chunk.id,
        content: chunk.content,
        embedding,
        metadata: chunk.metadata,
      })
    }

    onChunkDone(Math.min(i + batchSize, chunks.length), chunks.length)
  }

  return results
}

export async function searchDocuments(
  query: string,
  embeddingModel: string,
  topK: number = 5,
  documentIds?: string[],
): Promise<RagSearchResult[]> {
  // Embed the query
  const response = await ollamaClient.embed({
    model: embeddingModel,
    input: [query],
  })

  const queryEmbedding = response.embeddings[0]
  if (!queryEmbedding) {
    throw new Error('Failed to embed query')
  }

  // Search vector DB
  const results = await vectorDB.search(queryEmbedding, topK, documentIds)

  // Fill in document names
  const docs = await vectorDB.getAllDocuments()
  const docMap = new Map(docs.map((d) => [d.id, d.name]))

  return results.map((r) => ({
    ...r,
    documentName: docMap.get(r.chunk.documentId) ?? 'Unknown',
  }))
}

export function buildRagContext(results: RagSearchResult[]): string {
  if (results.length === 0) return ''

  const chunks = results
    .map((r, i) => `[Source ${i + 1}: ${r.documentName} (relevance: ${(r.score * 100).toFixed(1)}%)]\n${r.chunk.content}`)
    .join('\n\n---\n\n')

  return `Use the following context to help answer the user's question. If the context doesn't contain relevant information, say so.\n\n${chunks}\n\n---\n\nNow answer the user's question based on the context above.`
}
