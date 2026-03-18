export interface OriginStorageInfo {
  usage: number
  quota: number
  persisted: boolean
}

export interface StoreSize {
  name: string
  bytes: number
  count: number
}

export interface StorageBackendInfo {
  id: string
  label: string
  icon: string
  type: 'indexeddb' | 'external'
  totalBytes: number
  recordCount: number
  stores: StoreSize[]
}

interface DbRegistryEntry {
  id: string
  dbName: string
  label: string
  icon: string
  stores: string[]
}

const DB_REGISTRY: DbRegistryEntry[] = [
  { id: 'rag', dbName: 'llmxray-rag', label: 'Knowledge Base', icon: '\u{1F4DA}', stores: ['chunks', 'documents'] },
  { id: 'conversations', dbName: 'llmxray-conversations', label: 'Conversations', icon: '\u{1F4AC}', stores: ['conversations', 'messages', 'sessions', 'tokens'] },
  { id: 'benchmarks', dbName: 'llmxray-benchmarks', label: 'Benchmarks', icon: '\u23F1', stores: ['results', 'custom-suites'] },
  { id: 'message-memory', dbName: 'llmxray-message-memory', label: 'Message Memory', icon: '\u{1F9E0}', stores: ['messages'] },
  { id: 'canvas-ai', dbName: 'llmxray-canvas-ai', label: 'AI Training', icon: '\u{1F3A8}', stores: ['training-pairs'] },
  { id: 'comparisons', dbName: 'llmxray-comparisons', label: 'Comparisons', icon: '\u2696', stores: ['runs'] },
  { id: 'history', dbName: 'llmxray-history', label: 'History', icon: '\u{1F4C5}', stores: ['entries'] },
]

/** Estimate total origin storage via the StorageManager API */
export async function estimateOriginStorage(): Promise<OriginStorageInfo> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, persisted: false }
  }
  const estimate = await navigator.storage.estimate()
  const persisted = await navigator.storage.persisted?.() ?? false
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? 0,
    persisted,
  }
}

/** Estimate byte size of a single record, optimized for embedding arrays */
function estimateRecordBytes(record: unknown): number {
  if (record == null) return 0
  if (typeof record !== 'object') return String(record).length * 2

  const obj = record as Record<string, unknown>
  let bytes = 0

  for (const key of Object.keys(obj)) {
    bytes += key.length * 2
    const value = obj[key]

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
      // Numeric array (embedding vectors) — 8 bytes per float64
      bytes += value.length * 8
    } else if (typeof value === 'string') {
      bytes += value.length * 2
    } else if (typeof value === 'number') {
      bytes += 8
    } else if (typeof value === 'boolean') {
      bytes += 4
    } else if (value != null && typeof value === 'object') {
      // Nested object — recurse but cap depth for performance
      bytes += estimateRecordBytes(value)
    }
  }

  return bytes
}

/** Open an existing IDB database without triggering upgrades */
function openExisting(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName)
    request.onupgradeneeded = () => {
      // Database doesn't exist yet — abort to avoid creating it
      request.transaction?.abort()
      resolve(null)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

/** Count records and estimate bytes for a single object store */
function estimateStoreSize(db: IDBDatabase, storeName: string): Promise<StoreSize> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve({ name: storeName, bytes: 0, count: 0 })
      return
    }

    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    let bytes = 0
    let count = 0

    const cursorReq = store.openCursor()
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        bytes += estimateRecordBytes(cursor.value)
        count++
        cursor.continue()
      } else {
        resolve({ name: storeName, bytes, count })
      }
    }
    cursorReq.onerror = () => resolve({ name: storeName, bytes: 0, count: 0 })
  })
}

/** Estimate the total size of a single IndexedDB database */
export async function estimateDatabaseSize(
  dbName: string,
  storeNames: string[],
): Promise<{ totalBytes: number; recordCount: number; stores: StoreSize[] }> {
  const db = await openExisting(dbName)
  if (!db) {
    return { totalBytes: 0, recordCount: 0, stores: storeNames.map((name) => ({ name, bytes: 0, count: 0 })) }
  }

  try {
    const stores: StoreSize[] = []
    for (const storeName of storeNames) {
      stores.push(await estimateStoreSize(db, storeName))
    }

    const totalBytes = stores.reduce((sum, s) => sum + s.bytes, 0)
    const recordCount = stores.reduce((sum, s) => sum + s.count, 0)
    return { totalBytes, recordCount, stores }
  } finally {
    db.close()
  }
}

/** Estimate sizes for all known databases */
export async function estimateAllDatabases(): Promise<StorageBackendInfo[]> {
  const results: StorageBackendInfo[] = []

  for (const entry of DB_REGISTRY) {
    const { totalBytes, recordCount, stores } = await estimateDatabaseSize(entry.dbName, entry.stores)
    results.push({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      type: 'indexeddb',
      totalBytes,
      recordCount,
      stores,
    })
  }

  return results
}

/** Get the database registry (for external consumers) */
export function getDbRegistry(): readonly DbRegistryEntry[] {
  return DB_REGISTRY
}
