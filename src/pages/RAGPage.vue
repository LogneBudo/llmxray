<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRagStore } from '@/stores/rag-store'
import { useModelStore } from '@/stores/model-store'
import { useStorageStore } from '@/stores/storage-store'
import DocumentUploadZone from '@/components/rag/DocumentUploadZone.vue'
import DocumentList from '@/components/rag/DocumentList.vue'
import RAGSearchPanel from '@/components/rag/RAGSearchPanel.vue'
import IngestProgress from '@/components/rag/IngestProgress.vue'
import StorageGauge from '@/components/storage/StorageGauge.vue'
import { formatBytes } from '@/utils/format'

const ragStore = useRagStore()
const modelStore = useModelStore()
const storageStore = useStorageStore()

const embeddingModel = ref('')

const ragDb = computed(() => storageStore.getDatabaseById('rag'))
const totalChunks = computed(() =>
  ragStore.readyDocuments.reduce((sum, d) => sum + d.chunkCount, 0),
)

onMounted(async () => {
  await modelStore.fetchModels()
  embeddingModel.value = modelStore.embeddingModelNames[0] ?? ''
  await ragStore.loadDocuments()
  await storageStore.refreshIfStale()
})

// Refresh storage after ingestion completes
watch(
  () => ragStore.isIngesting,
  (ingesting, wasIngesting) => {
    if (!ingesting && wasIngesting) {
      storageStore.refresh()
    }
  },
)

async function handleUpload(files: File[]) {
  if (!embeddingModel.value) return
  for (const file of files) {
    try {
      await ragStore.addDocument(file, embeddingModel.value)
    } catch {
      // Error is stored in ragStore.error
    }
  }
}

async function handleRemove(documentId: string) {
  await ragStore.removeDocument(documentId)
  await storageStore.refresh()
}

async function handleSearch(query: string) {
  if (!embeddingModel.value) return
  await ragStore.search(query, embeddingModel.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-text-primary">{{ $t('rag.title') }}</h2>
        <p class="text-sm text-text-muted">{{ $t('rag.subtitle') }}</p>
      </div>
      <select
        v-model="embeddingModel"
        class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
      >
        <option v-if="modelStore.embeddingModelNames.length === 0" value="" disabled>{{ $t('rag.modelSelector.noEmbeddingModels') }}</option>
        <option v-for="name in modelStore.embeddingModelNames" :key="name" :value="name">
          {{ name }} {{ modelStore.capabilityIcons(name) }}
        </option>
      </select>
    </div>

    <!-- Storage overview strip -->
    <div
      v-if="storageStore.origin"
      class="rounded-lg border border-border-default bg-surface-raised p-3 space-y-2"
    >
      <div class="flex items-center justify-between text-xs">
        <span class="text-text-secondary font-medium">{{ $t('rag.storage.title') }}</span>
        <span class="text-text-muted">
          {{ ragStore.readyDocuments.length }} {{ $t('rag.storage.documents') }} · {{ totalChunks.toLocaleString() }} {{ $t('rag.storage.chunks') }}
          <template v-if="ragDb">· {{ formatBytes(ragDb.totalBytes) }} {{ $t('rag.storage.stored') }}</template>
        </span>
      </div>
      <StorageGauge
        :used="ragDb?.totalBytes ?? 0"
        :total="storageStore.origin.quota"
        :label="$t('rag.storage.ragStorage')"
        :animating="ragStore.isIngesting"
        compact
      />
    </div>

    <!-- Upload -->
    <DocumentUploadZone @upload="handleUpload" />

    <!-- Ingest progress -->
    <IngestProgress :progress="ragStore.ingestProgress" />

    <!-- Error -->
    <div
      v-if="ragStore.error"
      class="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
    >
      {{ ragStore.error }}
    </div>

    <!-- Documents -->
    <div>
      <h3 class="mb-3 text-sm font-medium text-text-secondary">
        {{ $t('rag.documents.title') }} ({{ ragStore.readyDocuments.length }})
      </h3>
      <DocumentList
        :documents="ragStore.documents"
        :enabled-ids="ragStore.enabledDocumentIds"
        @toggle="ragStore.toggleDocument"
        @remove="handleRemove"
      />
    </div>

    <!-- Search -->
    <div>
      <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('rag.search.title') }}</h3>
      <RAGSearchPanel
        :results="ragStore.searchResults"
        :is-searching="ragStore.isSearching"
        @search="handleSearch"
      />
    </div>
  </div>
</template>
