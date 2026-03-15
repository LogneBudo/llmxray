import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  estimateOriginStorage,
  estimateAllDatabases,
  type OriginStorageInfo,
  type StorageBackendInfo,
} from '@/services/storage-estimator'

export const useStorageStore = defineStore('storage', () => {
  const origin = ref<OriginStorageInfo | null>(null)
  const databases = ref<StorageBackendInfo[]>([])
  const loading = ref(false)
  const lastUpdated = ref<number | null>(null)

  const totalUsedBytes = computed(() =>
    databases.value.reduce((sum, db) => sum + db.totalBytes, 0),
  )

  const usedPercent = computed(() => {
    if (!origin.value || origin.value.quota === 0) return 0
    return Math.round((origin.value.usage / origin.value.quota) * 100)
  })

  const totalRecordCount = computed(() =>
    databases.value.reduce((sum, db) => sum + db.recordCount, 0),
  )

  function getDatabaseById(id: string): StorageBackendInfo | undefined {
    return databases.value.find((db) => db.id === id)
  }

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      const [originInfo, dbInfos] = await Promise.all([
        estimateOriginStorage(),
        estimateAllDatabases(),
      ])
      origin.value = originInfo
      databases.value = dbInfos
      lastUpdated.value = Date.now()
    } catch (e) {
      console.error('Failed to estimate storage:', e)
    } finally {
      loading.value = false
    }
  }

  async function refreshIfStale(maxAgeMs = 30_000): Promise<void> {
    if (!lastUpdated.value || Date.now() - lastUpdated.value > maxAgeMs) {
      await refresh()
    }
  }

  return {
    origin,
    databases,
    loading,
    lastUpdated,
    totalUsedBytes,
    usedPercent,
    totalRecordCount,
    getDatabaseById,
    refresh,
    refreshIfStale,
  }
})
