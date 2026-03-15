import type { BenchmarkResult, BenchmarkSuite } from '@/types/benchmark'

const DB_NAME = 'llmxray-benchmarks'
const DB_VERSION = 1
const RESULTS_STORE = 'results'
const CUSTOM_SUITES_STORE = 'custom-suites'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RESULTS_STORE)) {
        const store = db.createObjectStore(RESULTS_STORE, { keyPath: 'id' })
        store.createIndex('byModel', 'modelName', { unique: false })
      }
      if (!db.objectStoreNames.contains(CUSTOM_SUITES_STORE)) {
        db.createObjectStore(CUSTOM_SUITES_STORE, { keyPath: 'id' })
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

export const benchmarkDB = {
  async saveResult(result: BenchmarkResult): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(RESULTS_STORE, 'readwrite')
    tx.objectStore(RESULTS_STORE).put(result)
    await txPromise(tx)
  },

  async getAllResults(): Promise<BenchmarkResult[]> {
    const db = await openDB()
    const tx = db.transaction(RESULTS_STORE, 'readonly')
    const req = tx.objectStore(RESULTS_STORE).getAll()
    await txPromise(tx, req)
    return req.result ?? []
  },

  async getResultsByModel(modelName: string): Promise<BenchmarkResult[]> {
    const db = await openDB()
    const tx = db.transaction(RESULTS_STORE, 'readonly')
    const index = tx.objectStore(RESULTS_STORE).index('byModel')
    const req = index.getAll(modelName)
    await txPromise(tx, req)
    return req.result ?? []
  },

  async deleteResult(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(RESULTS_STORE, 'readwrite')
    tx.objectStore(RESULTS_STORE).delete(id)
    await txPromise(tx)
  },

  async saveCustomSuite(suite: BenchmarkSuite): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(CUSTOM_SUITES_STORE, 'readwrite')
    tx.objectStore(CUSTOM_SUITES_STORE).put(suite)
    await txPromise(tx)
  },

  async getAllCustomSuites(): Promise<BenchmarkSuite[]> {
    const db = await openDB()
    const tx = db.transaction(CUSTOM_SUITES_STORE, 'readonly')
    const req = tx.objectStore(CUSTOM_SUITES_STORE).getAll()
    await txPromise(tx, req)
    return req.result ?? []
  },

  async deleteCustomSuite(id: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(CUSTOM_SUITES_STORE, 'readwrite')
    tx.objectStore(CUSTOM_SUITES_STORE).delete(id)
    await txPromise(tx)
  },

  async clear(): Promise<void> {
    const db = await openDB()
    const tx = db.transaction([RESULTS_STORE, CUSTOM_SUITES_STORE], 'readwrite')
    tx.objectStore(RESULTS_STORE).clear()
    tx.objectStore(CUSTOM_SUITES_STORE).clear()
    await txPromise(tx)
  },
}
