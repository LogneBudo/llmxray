import type { AiTrainingPair } from '@/types/canvas-ai'

const DB_NAME = 'llmxray-canvas-ai'
const DB_VERSION = 2
const STORE_NAME = 'training-pairs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion

      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('byPhase', 'phase', { unique: false })
        store.createIndex('byToolName', 'toolName', { unique: false })
        store.createIndex('byTimestamp', 'timestamp', { unique: false })
      }

      if (oldVersion >= 1 && oldVersion < 2) {
        const store = request.transaction!.objectStore(STORE_NAME)
        if (!store.indexNames.contains('byTimestamp')) {
          store.createIndex('byTimestamp', 'timestamp', { unique: false })
        }
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

function getAndUpdate(
  store: IDBObjectStore,
  id: string,
  updater: (pair: AiTrainingPair) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => {
      const pair = request.result as AiTrainingPair | undefined
      if (pair) {
        updater(pair)
        store.put(pair)
      }
      resolve()
    }
    request.onerror = () => reject(request.error)
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
    await getAndUpdate(tx.objectStore(STORE_NAME), id, (pair) => {
      pair.accepted = accepted
    })
    await txPromise(tx)
    db.close()
  },

  async updatePairResponse(id: string, newResponse: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await getAndUpdate(tx.objectStore(STORE_NAME), id, (pair) => {
      pair.response = newResponse
    })
    await txPromise(tx)
    db.close()
  },

  async updatePairTags(id: string, tags: string[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await getAndUpdate(tx.objectStore(STORE_NAME), id, (pair) => {
      pair.tags = tags
    })
    await txPromise(tx)
    db.close()
  },

  async deletePair(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    await txPromise(tx)
    db.close()
  },

  async deletePairs(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const id of ids) {
      store.delete(id)
    }
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
    this.downloadJsonl(filtered)
  },

  async exportSelectedAsJsonl(ids: string[]): Promise<void> {
    const allPairs = await this.getAllPairs()
    const idSet = new Set(ids)
    const selected = allPairs.filter((p) => idSet.has(p.id))
    this.downloadJsonl(selected)
  },

  downloadJsonl(pairs: AiTrainingPair[]): void {
    const lines = pairs.map((p) =>
      JSON.stringify({
        system: p.systemPrompt,
        user: p.userPrompt,
        assistant: p.response,
        accepted: p.accepted,
        phase: p.phase,
        model: p.model,
        tool: p.toolName,
        tags: p.tags ?? [],
        reasoning: p.reasoning ?? '',
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
