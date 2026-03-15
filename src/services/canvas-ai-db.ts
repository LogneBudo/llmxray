import type { AiTrainingPair } from '@/types/canvas-ai'

const DB_NAME = 'llmxray-canvas-ai'
const DB_VERSION = 1
const STORE_NAME = 'training-pairs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('byPhase', 'phase', { unique: false })
        store.createIndex('byToolName', 'toolName', { unique: false })
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

export const canvasAiDB = {
  async savePair(pair: AiTrainingPair): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(pair)
    await txPromise(tx)
    db.close()
  },

  async updateAccepted(id: string, accepted = true): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const pair = request.result as AiTrainingPair | undefined
        if (pair) {
          pair.accepted = accepted
          store.put(pair)
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
    await txPromise(tx)
    db.close()
  },

  async getAllPairs(): Promise<AiTrainingPair[]> {
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

  async exportAsJsonl(acceptedOnly = true): Promise<void> {
    const pairs = await this.getAllPairs()
    const filtered = acceptedOnly ? pairs.filter((p) => p.accepted) : pairs

    const lines = filtered.map((p) =>
      JSON.stringify({
        system: p.systemPrompt,
        user: p.userPrompt,
        assistant: p.response,
        accepted: p.accepted,
        phase: p.phase,
        model: p.model,
        tool: p.toolName,
      }),
    )

    const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llmxray-training-${Date.now()}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await txPromise(tx)
    db.close()
  },
}
