<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { useEmbeddingStore } from '@/stores/embedding-store'
import type { EmbeddingResult } from '@/types/embedding'
import { formatDuration } from '@/utils/format'
import { useStorageStore } from '@/stores/storage-store'
import StorageGauge from '@/components/storage/StorageGauge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmbeddingVectorViz from '@/components/embeddings/EmbeddingVectorViz.vue'
import EmbeddingStats from '@/components/embeddings/EmbeddingStats.vue'
import EmbeddingTransformViz from '@/components/embeddings/EmbeddingTransformViz.vue'
import SimilarityMeter from '@/components/embeddings/SimilarityMeter.vue'

const modelStore = useModelStore()
const embeddingStore = useEmbeddingStore()
const storageStore = useStorageStore()

const memoryDb = computed(() => storageStore.getDatabaseById('message-memory'))

const selectedModel = ref('')
const inputText = ref('')
const activeResult = ref<EmbeddingResult | null>(null)

// Similarity comparison
const compareTextA = ref('')
const compareTextB = ref('')
const compareResultA = ref<EmbeddingResult | null>(null)
const compareResultB = ref<EmbeddingResult | null>(null)
const similarityScore = ref<number | null>(null)
const comparing = ref(false)

// Filter to embedding-capable models
const embeddingModels = computed(() =>
  modelStore.models.filter(
    (m) =>
      m.name.includes('embed') ||
      m.name.includes('nomic') ||
      m.name.includes('minilm') ||
      m.name.includes('snowflake') ||
      m.name.includes('mxbai') ||
      m.name.includes('bge'),
  ),
)

// If no embedding models found, show all models (user may have renamed one)
const availableModels = computed(() =>
  embeddingModels.value.length > 0 ? embeddingModels.value : modelStore.models,
)

async function embedText() {
  if (!selectedModel.value || !inputText.value.trim()) return
  try {
    activeResult.value = await embeddingStore.embed(selectedModel.value, inputText.value.trim())
  } catch {
    // Error is set in store
  }
}

async function compareSimilarity() {
  if (!selectedModel.value || !compareTextA.value.trim() || !compareTextB.value.trim()) return
  comparing.value = true
  similarityScore.value = null

  try {
    const [resultA, resultB] = await Promise.all([
      embeddingStore.embed(selectedModel.value, compareTextA.value.trim()),
      embeddingStore.embed(selectedModel.value, compareTextB.value.trim()),
    ])

    compareResultA.value = resultA
    compareResultB.value = resultB
    similarityScore.value = embeddingStore.cosineSimilarity(resultA.vector, resultB.vector)
  } catch {
    // Error is set in store
  } finally {
    comparing.value = false
  }
}

onMounted(async () => {
  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
  if (availableModels.value.length > 0 && !selectedModel.value) {
    selectedModel.value = availableModels.value[0]!.name
  }
  await storageStore.refreshIfStale()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Model selector -->
    <div class="flex items-center gap-3">
      <select
        v-model="selectedModel"
        class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
      >
        <option v-if="availableModels.length === 0" value="" disabled>No models available</option>
        <option v-for="m in availableModels" :key="m.name" :value="m.name">
          {{ m.name }} {{ modelStore.capabilityIcons(m.name) }}
        </option>
      </select>
      <span v-if="embeddingModels.length === 0 && modelStore.models.length > 0" class="text-xs text-warning">
        No embedding models found. Pull one: ollama pull nomic-embed-text
      </span>
    </div>

    <!-- Embedding Memory gauge -->
    <StorageGauge
      v-if="storageStore.origin && memoryDb"
      :used="memoryDb.totalBytes"
      :total="storageStore.origin.quota"
      compact
      :label="`Embedding Memory \u00B7 ${memoryDb.recordCount.toLocaleString()} records`"
    />

    <!-- Embed Playground -->
    <section class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <h2 class="text-base font-semibold text-text-primary">Embed Playground</h2>
      <p class="text-sm text-text-muted">Enter text to generate its embedding vector and inspect the dimensions.</p>

      <textarea
        v-model="inputText"
        class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
        rows="3"
        placeholder="Enter text to embed..."
        :disabled="embeddingStore.loading"
        @keydown.ctrl.enter="embedText"
      />

      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="embeddingStore.loading || !selectedModel || !inputText.trim()"
          @click="embedText"
        >
          <span v-if="embeddingStore.loading" class="flex items-center gap-2">
            <LoadingSpinner size="sm" /> Embedding...
          </span>
          <span v-else>Embed</span>
        </button>
        <span v-if="embeddingStore.error" class="text-sm text-error">{{ embeddingStore.error }}</span>
      </div>

      <!-- Embedding transformation visual -->
      <EmbeddingTransformViz
        :input-text="inputText"
        :is-embedding="embeddingStore.loading"
        :vector="activeResult?.vector ?? null"
      />

      <!-- Active result -->
      <template v-if="activeResult">
        <EmbeddingStats :result="activeResult" />

        <!-- Raw values (first 50) -->
        <details class="text-xs">
          <summary class="cursor-pointer text-text-muted hover:text-text-secondary">
            Show raw values (first 50 of {{ activeResult.dimensions }})
          </summary>
          <div class="mt-2 grid grid-cols-5 gap-1 font-mono text-text-secondary">
            <span
              v-for="(val, i) in activeResult.vector.slice(0, 50)"
              :key="i"
              class="rounded bg-surface px-1.5 py-0.5"
              :title="`dim[${i}]`"
            >
              {{ val.toFixed(4) }}
            </span>
          </div>
        </details>
      </template>
    </section>

    <!-- Similarity Calculator -->
    <section class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <h2 class="text-base font-semibold text-text-primary">Similarity Calculator</h2>
      <p class="text-sm text-text-muted">Compare two texts to measure their semantic similarity using cosine distance.</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">Text A</label>
          <textarea
            v-model="compareTextA"
            class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
            rows="3"
            placeholder="First text..."
            :disabled="comparing"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">Text B</label>
          <textarea
            v-model="compareTextB"
            class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
            rows="3"
            placeholder="Second text..."
            :disabled="comparing"
          />
        </div>
      </div>

      <button
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="comparing || !selectedModel || !compareTextA.trim() || !compareTextB.trim()"
        @click="compareSimilarity"
      >
        <span v-if="comparing" class="flex items-center gap-2">
          <LoadingSpinner size="sm" /> Comparing...
        </span>
        <span v-else>Compare</span>
      </button>

      <!-- Similarity result -->
      <template v-if="similarityScore !== null && compareResultA && compareResultB">
        <div class="flex flex-col items-center gap-6 py-4 lg:flex-row lg:items-start lg:justify-center">
          <div class="flex-1 space-y-2">
            <div class="text-xs font-medium text-text-muted">Text A</div>
            <div class="rounded-lg bg-surface p-3 text-sm text-text-secondary">
              {{ compareResultA.input }}
            </div>
            <EmbeddingVectorViz :vector="compareResultA.vector" :height="80" />
          </div>

          <SimilarityMeter :score="similarityScore" />

          <div class="flex-1 space-y-2">
            <div class="text-xs font-medium text-text-muted">Text B</div>
            <div class="rounded-lg bg-surface p-3 text-sm text-text-secondary">
              {{ compareResultB.input }}
            </div>
            <EmbeddingVectorViz :vector="compareResultB.vector" :height="80" />
          </div>
        </div>
      </template>
    </section>

    <!-- History -->
    <section v-if="embeddingStore.recentResults.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-text-primary">Recent Embeddings</h2>
        <button
          class="text-xs text-text-muted hover:text-error transition-colors"
          @click="embeddingStore.clearResults()"
        >
          Clear all
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="result in embeddingStore.recentResults.slice(0, 10)"
          :key="result.id"
          class="flex items-center justify-between rounded-lg bg-surface px-4 py-2 hover:bg-surface-overlay transition-colors cursor-pointer"
          @click="activeResult = result"
        >
          <div class="flex-1 min-w-0">
            <div class="truncate text-sm text-text-primary">{{ result.input }}</div>
            <div class="flex gap-3 text-xs text-text-muted mt-0.5">
              <span>{{ result.model }}</span>
              <span>{{ result.dimensions }}d</span>
              <span>{{ formatDuration(result.durationMs) }}</span>
            </div>
          </div>
          <button
            class="ml-3 text-text-muted hover:text-error text-xs"
            @click.stop="embeddingStore.removeResult(result.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
