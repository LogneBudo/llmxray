import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RagDocument, RagSearchResult } from '@/types/rag'
import type { IngestProgress } from '@/services/rag-pipeline'
import { ingestDocument, searchDocuments, buildRagContext } from '@/services/rag-pipeline'
import { vectorDB } from '@/services/vector-db'

export const useRagStore = defineStore('rag', () => {
  const documents = ref<RagDocument[]>([])
  const ingestProgress = ref<IngestProgress | null>(null)
  const isIngesting = ref(false)
  const searchResults = ref<RagSearchResult[]>([])
  const isSearching = ref(false)
  const error = ref<string | null>(null)

  // Which documents are enabled for RAG context injection
  const enabledDocumentIds = ref<Set<string>>(new Set())

  const readyDocuments = computed(() =>
    documents.value.filter((d) => d.status === 'ready'),
  )

  const enabledDocuments = computed(() =>
    readyDocuments.value.filter((d) => enabledDocumentIds.value.has(d.id)),
  )

  async function loadDocuments() {
    try {
      documents.value = await vectorDB.getAllDocuments()
      // Enable all ready documents by default
      for (const doc of documents.value) {
        if (doc.status === 'ready') {
          enabledDocumentIds.value.add(doc.id)
        }
      }
    } catch (e) {
      console.error('Failed to load documents:', e)
    }
  }

  async function addDocument(file: File, embeddingModel: string) {
    isIngesting.value = true
    ingestProgress.value = null
    error.value = null

    try {
      const doc = await ingestDocument(file, embeddingModel, undefined, (progress) => {
        ingestProgress.value = progress
      })
      documents.value.push(doc)
      enabledDocumentIds.value.add(doc.id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Ingestion failed'
      throw e
    } finally {
      isIngesting.value = false
    }
  }

  async function removeDocument(documentId: string) {
    await vectorDB.deleteDocument(documentId)
    documents.value = documents.value.filter((d) => d.id !== documentId)
    enabledDocumentIds.value.delete(documentId)
  }

  function toggleDocument(documentId: string) {
    if (enabledDocumentIds.value.has(documentId)) {
      enabledDocumentIds.value.delete(documentId)
    } else {
      enabledDocumentIds.value.add(documentId)
    }
  }

  async function search(query: string, embeddingModel: string, topK = 5) {
    isSearching.value = true
    error.value = null
    try {
      const docIds = [...enabledDocumentIds.value]
      searchResults.value = await searchDocuments(query, embeddingModel, topK, docIds.length > 0 ? docIds : undefined)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
    } finally {
      isSearching.value = false
    }
  }

  async function getContextForQuery(
    query: string,
    embeddingModel: string,
    topK = 5,
  ): Promise<string> {
    const docIds = [...enabledDocumentIds.value]
    if (docIds.length === 0) return ''

    const results = await searchDocuments(query, embeddingModel, topK, docIds)
    return buildRagContext(results)
  }

  return {
    documents,
    ingestProgress,
    isIngesting,
    searchResults,
    isSearching,
    error,
    enabledDocumentIds,
    readyDocuments,
    enabledDocuments,
    loadDocuments,
    addDocument,
    removeDocument,
    toggleDocument,
    search,
    getContextForQuery,
  }
})
