import type { EmbeddedMessage } from '@/types/memory'

const DB_NAME = 'llmxray-message-memory'
const DB_VERSION = 1
const STORE_NAME = 'messages'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('byConversation', 'conversationId', { unique: false })
        store.createIndex('byTimestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
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

export const messageMemoryDB = {
  async storeMessage(message: EmbeddedMessage): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(message)
    await txPromise(tx)
    db.close()
  },

  async storeMessages(messages: EmbeddedMessage[]): Promise<void> {
    if (messages.length === 0) return
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const msg of messages) {
      store.put(msg)
    }
    await txPromise(tx)
    db.close()
  },

  async getAllMessages(): Promise<EmbeddedMessage[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
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

  async search(
    queryEmbedding: number[],
    topK: number = 3,
    excludeConversationId?: string,
  ): Promise<Array<{ message: EmbeddedMessage; score: number }>> {
    const all = await this.getAllMessages()

    // Optionally exclude current conversation to avoid redundancy
    const candidates = excludeConversationId
      ? all.filter((m) => m.conversationId !== excludeConversationId)
      : all

    const scored = candidates.map((message) => ({
      message,
      score: cosineSimilarity(queryEmbedding, message.embedding),
    }))

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK)
  },

  async deleteByConversation(conversationId: string): Promise<void> {
    const db = await openDB()
    const all = await this.getAllMessages()
    const toDelete = all.filter((m) => m.conversationId === conversationId)
    if (toDelete.length === 0) {
      db.close()
      return
    }
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const msg of toDelete) {
      store.delete(msg.id)
    }
    await txPromise(tx)
    db.close()
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await txPromise(tx)
    db.close()
  },
}
