import type { ComparisonRun } from '@/types/comparison'

const DB_NAME = 'llmxray-comparisons'
const DB_VERSION = 1
const RUNS_STORE = 'runs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RUNS_STORE)) {
        const store = db.createObjectStore(RUNS_STORE, { keyPath: 'id' })
        store.createIndex('byDate', 'createdAt', { unique: false })
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

export const comparisonDB = {
  async saveRun(run: ComparisonRun): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(RUNS_STORE, 'readwrite')
    tx.objectStore(RUNS_STORE).put(run)
    await txPromise(tx)
  },

  async getAllRuns(): Promise<ComparisonRun[]> {
    const db = await openDB()
    const tx = db.transaction(RUNS_STORE, 'readonly')
    const req = tx.objectStore(RUNS_STORE).getAll()
    await txPromise(tx, req)
    return (req.result ?? []).sort((a, b) => b.createdAt - a.createdAt)
  },

  async getRun(id: string): Promise<ComparisonRun | undefined> {
    const db = await openDB()
    const tx = db.transaction(RUNS_STORE, 'readonly')
    const req = tx.objectStore(RUNS_STORE).get(id)
    await txPromise(tx, req)
    return req.result
  },

  async deleteRun(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(RUNS_STORE, 'readwrite')
    tx.objectStore(RUNS_STORE).delete(id)
    await txPromise(tx)
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(RUNS_STORE, 'readwrite')
    tx.objectStore(RUNS_STORE).clear()
    await txPromise(tx)
  },
}
