import type { EmbeddedChunk, RagSearchResult, RagDocument } from '@/types/rag'

const DB_NAME = 'llmxray-rag'
const DB_VERSION = 1
const CHUNKS_STORE = 'chunks'
const DOCUMENTS_STORE = 'documents'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' })
        chunkStore.createIndex('byDocument', 'documentId', { unique: false })
      }
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txPromise<T>(tx: IDBTransaction, result?: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result?.result)
    tx.onerror = () => reject(tx.error)
  })
}

export const vectorDB = {
  async storeChunks(chunks: EmbeddedChunk[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(CHUNKS_STORE, 'readwrite')
    const store = tx.objectStore(CHUNKS_STORE)
    for (const chunk of chunks) {
      store.put(chunk)
    }
    await txPromise(tx)
    db.close()
  },

  async getChunksByDocument(documentId: string): Promise<EmbeddedChunk[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readonly')
      const store = tx.objectStore(CHUNKS_STORE)
      const index = store.index('byDocument')
      const request = index.getAll(documentId)
      request.onsuccess = () => {
        resolve(request.result)
        db.close()
      }
      request.onerror = () => {
        reject(request.error)
        db.close()
      }
    })
  },

  async getAllChunks(): Promise<EmbeddedChunk[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readonly')
      const request = tx.objectStore(CHUNKS_STORE).getAll()
      request.onsuccess = () => {
        resolve(request.result)
        db.close()
      }
      request.onerror = () => {
        reject(request.error)
        db.close()
      }
    })
  },

  async deleteChunksByDocument(documentId: string): Promise<void> {
    const db = await openDB()
    const chunks = await this.getChunksByDocument(documentId)
    const tx = db.transaction(CHUNKS_STORE, 'readwrite')
    const store = tx.objectStore(CHUNKS_STORE)
    for (const chunk of chunks) {
      store.delete(chunk.id)
    }
    await txPromise(tx)
    db.close()
  },

  async storeDocument(doc: RagDocument): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(DOCUMENTS_STORE, 'readwrite')
    tx.objectStore(DOCUMENTS_STORE).put(doc)
    await txPromise(tx)
    db.close()
  },

  async getAllDocuments(): Promise<RagDocument[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOCUMENTS_STORE, 'readonly')
      const request = tx.objectStore(DOCUMENTS_STORE).getAll()
      request.onsuccess = () => {
        resolve(request.result)
        db.close()
      }
      request.onerror = () => {
        reject(request.error)
        db.close()
      }
    })
  },

  async deleteDocument(documentId: string): Promise<void> {
    const db = await openDB()
    // Delete the document record
    const tx1 = db.transaction(DOCUMENTS_STORE, 'readwrite')
    tx1.objectStore(DOCUMENTS_STORE).delete(documentId)
    await txPromise(tx1)
    // Delete associated chunks
    await this.deleteChunksByDocument(documentId)
    db.close()
  },

  async search(
    queryEmbedding: number[],
    topK: number = 5,
    documentIds?: string[],
  ): Promise<RagSearchResult[]> {
    let chunks = await this.getAllChunks()

    // Filter by document if specified
    if (documentIds && documentIds.length > 0) {
      const idSet = new Set(documentIds)
      chunks = chunks.filter((c) => idSet.has(c.documentId))
    }

    // Compute cosine similarity for each chunk
    const scored = chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))

    // Sort by similarity descending
    scored.sort((a, b) => b.score - a.score)

    // Return top-K with placeholder document name (caller fills in)
    return scored.slice(0, topK).map(({ chunk, score }) => ({
      chunk,
      score,
      documentName: '',
    }))
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction([CHUNKS_STORE, DOCUMENTS_STORE], 'readwrite')
    tx.objectStore(CHUNKS_STORE).clear()
    tx.objectStore(DOCUMENTS_STORE).clear()
    await txPromise(tx)
    db.close()
  },
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    magA += a[i]! * a[i]!
    magB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
