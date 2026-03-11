<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRagStore } from '@/stores/rag-store'
import { useModelStore } from '@/stores/model-store'
import DocumentUploadZone from '@/components/rag/DocumentUploadZone.vue'
import DocumentList from '@/components/rag/DocumentList.vue'
import RAGSearchPanel from '@/components/rag/RAGSearchPanel.vue'
import IngestProgress from '@/components/rag/IngestProgress.vue'

const ragStore = useRagStore()
const modelStore = useModelStore()

const embeddingModel = ref('')

onMounted(async () => {
  await modelStore.fetchModels()
  // Default to an embedding model if available, otherwise first model
  const embModel = modelStore.modelNames.find((n) =>
    n.includes('embed') || n.includes('nomic') || n.includes('mxbai'),
  )
  embeddingModel.value = embModel ?? modelStore.modelNames[0] ?? ''
  await ragStore.loadDocuments()
})

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
        <h2 class="text-lg font-semibold text-text-primary">Document Knowledge Base</h2>
        <p class="text-sm text-text-muted">Ingest documents for RAG-powered conversations</p>
      </div>
      <select
        v-model="embeddingModel"
        class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
      >
        <option v-if="modelStore.modelNames.length === 0" value="" disabled>No models</option>
        <option v-for="name in modelStore.modelNames" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
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
        Documents ({{ ragStore.readyDocuments.length }})
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
      <h3 class="mb-3 text-sm font-medium text-text-secondary">Semantic Search</h3>
      <RAGSearchPanel
        :results="ragStore.searchResults"
        :is-searching="ragStore.isSearching"
        @search="handleSearch"
      />
    </div>
  </div>
</template>
