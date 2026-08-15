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

// Matryoshka output width (Ollama `dimensions`). 0 / empty = model's native width.
const outputDimensions = ref(0)
const nativeDimensions = computed(() =>
  selectedModel.value ? modelStore.getEmbeddingLength(selectedModel.value) : undefined,
)
const requestedDimensions = computed(() =>
  outputDimensions.value > 0 ? outputDimensions.value : undefined,
)

// Similarity comparison
const compareTextA = ref('')
const compareTextB = ref('')
const compareResultA = ref<EmbeddingResult | null>(null)
const compareResultB = ref<EmbeddingResult | null>(null)
const similarityScore = ref<number | null>(null)
const comparing = ref(false)

// Model comparison
const modelCompareA = ref('')
const modelCompareB = ref('')
const modelCompareText = ref('')
const modelCompareResultA = ref<EmbeddingResult | null>(null)
const modelCompareResultB = ref<EmbeddingResult | null>(null)
const modelCompareScore = ref<number | null>(null)
const modelComparing = ref(false)

async function compareModels() {
  if (!modelCompareA.value || !modelCompareB.value || !modelCompareText.value.trim()) return
  modelComparing.value = true
  modelCompareScore.value = null
  modelCompareResultA.value = null
  modelCompareResultB.value = null

  try {
    const [resultA, resultB] = await Promise.all([
      embeddingStore.embed(modelCompareA.value, modelCompareText.value.trim(), requestedDimensions.value),
      embeddingStore.embed(modelCompareB.value, modelCompareText.value.trim(), requestedDimensions.value),
    ])

    modelCompareResultA.value = resultA
    modelCompareResultB.value = resultB

    // Cross-model similarity only if dimensions match
    if (resultA.dimensions === resultB.dimensions) {
      modelCompareScore.value = embeddingStore.cosineSimilarity(resultA.vector, resultB.vector)
    }
  } catch {
    // Error is set in store
  } finally {
    modelComparing.value = false
  }
}

// Filter to embedding-capable models. The store resolves this from the
// `embedding` capability Ollama reports in /api/tags, falling back to family
// and name heuristics on older daemons.
const embeddingModels = computed(() => {
  const names = new Set(modelStore.embeddingModelNames)
  return modelStore.models.filter((m) => names.has(m.name))
})

// If no embedding models found, show all models (user may have renamed one)
const availableModels = computed(() =>
  embeddingModels.value.length > 0 ? embeddingModels.value : modelStore.models,
)

async function embedText() {
  if (!selectedModel.value || !inputText.value.trim()) return
  try {
    activeResult.value = await embeddingStore.embed(
      selectedModel.value,
      inputText.value.trim(),
      requestedDimensions.value,
    )
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
      embeddingStore.embed(selectedModel.value, compareTextA.value.trim(), requestedDimensions.value),
      embeddingStore.embed(selectedModel.value, compareTextB.value.trim(), requestedDimensions.value),
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
  // Default model comparison dropdowns
  if (availableModels.value.length >= 2) {
    modelCompareA.value = availableModels.value[0]!.name
    modelCompareB.value = availableModels.value[1]!.name
  } else if (availableModels.value.length === 1) {
    modelCompareA.value = availableModels.value[0]!.name
    modelCompareB.value = availableModels.value[0]!.name
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
        <option v-if="availableModels.length === 0" value="" disabled>{{ $t('embeddings.modelSelector.noModels') }}</option>
        <option v-for="m in availableModels" :key="m.name" :value="m.name">
          {{ m.name }} {{ modelStore.capabilityIcons(m.name) }}
        </option>
      </select>
      <span v-if="embeddingModels.length === 0 && modelStore.models.length > 0" class="text-xs text-warning">
        {{ $t('embeddings.modelSelector.noEmbeddingModels') }}
      </span>

      <!-- Matryoshka output width (Ollama `dimensions`) -->
      <div class="flex items-center gap-2">
        <label for="embed-dimensions" class="text-xs font-medium text-text-secondary">
          {{ $t('embeddings.dimensions.label') }}
        </label>
        <input
          id="embed-dimensions"
          v-model.number="outputDimensions"
          type="number"
          min="0"
          step="1"
          class="w-24 rounded-lg border border-border-default bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          :placeholder="nativeDimensions ? String(nativeDimensions) : $t('embeddings.dimensions.native')"
        />
        <span class="text-[11px] text-text-muted">
          {{ requestedDimensions ? $t('embeddings.dimensions.truncated') : $t('embeddings.dimensions.hint') }}
        </span>
      </div>
    </div>

    <!-- Embedding Memory gauge -->
    <StorageGauge
      v-if="storageStore.origin && memoryDb"
      :used="memoryDb.totalBytes"
      :total="storageStore.origin.quota"
      compact
      :label="`${$t('embeddings.storage.embeddingMemory')} \u00B7 ${memoryDb.recordCount.toLocaleString()} ${$t('embeddings.storage.records')}`"
    />

    <!-- Embed Playground -->
    <section class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <h2 class="text-base font-semibold text-text-primary">{{ $t('embeddings.playground.title') }}</h2>
      <p class="text-sm text-text-muted">{{ $t('embeddings.playground.description') }}</p>

      <textarea
        v-model="inputText"
        class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
        rows="3"
        :placeholder="$t('embeddings.playground.placeholder')"
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
            <LoadingSpinner size="sm" /> {{ $t('embeddings.playground.embedding') }}
          </span>
          <span v-else>{{ $t('embeddings.playground.embed') }}</span>
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
            {{ $t('embeddings.playground.showRawValues', { total: activeResult.dimensions }) }}
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
      <h2 class="text-base font-semibold text-text-primary">{{ $t('embeddings.similarity.title') }}</h2>
      <p class="text-sm text-text-muted">{{ $t('embeddings.similarity.description') }}</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">{{ $t('embeddings.similarity.textA') }}</label>
          <textarea
            v-model="compareTextA"
            class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
            rows="3"
            :placeholder="$t('embeddings.similarity.placeholderA')"
            :disabled="comparing"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">{{ $t('embeddings.similarity.textB') }}</label>
          <textarea
            v-model="compareTextB"
            class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
            rows="3"
            :placeholder="$t('embeddings.similarity.placeholderB')"
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
          <LoadingSpinner size="sm" /> {{ $t('embeddings.similarity.comparing') }}
        </span>
        <span v-else>{{ $t('embeddings.similarity.compare') }}</span>
      </button>

      <!-- Similarity result -->
      <template v-if="similarityScore !== null && compareResultA && compareResultB">
        <div class="flex flex-col items-center gap-6 py-4 lg:flex-row lg:items-start lg:justify-center">
          <div class="flex-1 space-y-2">
            <div class="text-xs font-medium text-text-muted">{{ $t('embeddings.similarity.textA') }}</div>
            <div class="rounded-lg bg-surface p-3 text-sm text-text-secondary">
              {{ compareResultA.input }}
            </div>
            <EmbeddingVectorViz :vector="compareResultA.vector" :height="80" />
          </div>

          <SimilarityMeter :score="similarityScore" />

          <div class="flex-1 space-y-2">
            <div class="text-xs font-medium text-text-muted">{{ $t('embeddings.similarity.textB') }}</div>
            <div class="rounded-lg bg-surface p-3 text-sm text-text-secondary">
              {{ compareResultB.input }}
            </div>
            <EmbeddingVectorViz :vector="compareResultB.vector" :height="80" />
          </div>
        </div>
      </template>
    </section>

    <!-- Model Comparison -->
    <section class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <h2 class="text-base font-semibold text-text-primary">{{ $t('embeddings.modelComparison.title') }}</h2>
      <p class="text-sm text-text-muted">{{ $t('embeddings.modelComparison.description') }}</p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">{{ $t('embeddings.modelComparison.modelA') }}</label>
          <select
            v-model="modelCompareA"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            :disabled="modelComparing"
          >
            <option v-for="m in availableModels" :key="m.name" :value="m.name">
              {{ m.name }} {{ modelStore.capabilityIcons(m.name) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">{{ $t('embeddings.modelComparison.modelB') }}</label>
          <select
            v-model="modelCompareB"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            :disabled="modelComparing"
          >
            <option v-for="m in availableModels" :key="m.name" :value="m.name">
              {{ m.name }} {{ modelStore.capabilityIcons(m.name) }}
            </option>
          </select>
        </div>
      </div>

      <textarea
        v-model="modelCompareText"
        class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
        rows="2"
        :placeholder="$t('embeddings.modelComparison.placeholder')"
        :disabled="modelComparing"
      />

      <button
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="modelComparing || !modelCompareA || !modelCompareB || !modelCompareText.trim()"
        @click="compareModels"
      >
        <span v-if="modelComparing" class="flex items-center gap-2">
          <LoadingSpinner size="sm" /> {{ $t('embeddings.modelComparison.comparingModels') }}
        </span>
        <span v-else>{{ $t('embeddings.modelComparison.compareModels') }}</span>
      </button>

      <!-- Comparison results -->
      <template v-if="modelCompareResultA && modelCompareResultB">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <!-- Model A results -->
          <div class="space-y-3 rounded-lg border border-border-default bg-surface p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-accent">{{ modelCompareResultA.model }}</span>
              <span class="text-[10px] text-text-muted">{{ modelCompareResultA.dimensions }}d · {{ formatDuration(modelCompareResultA.durationMs) }}</span>
            </div>
            <EmbeddingVectorViz :vector="modelCompareResultA.vector" :height="80" />
            <div class="grid grid-cols-4 gap-1.5 text-[10px]">
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.dims') }}</div>
                <div class="font-medium text-text-primary">{{ modelCompareResultA.dimensions }}</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.l2Norm') }}</div>
                <div class="font-medium text-text-primary">{{ Math.sqrt(modelCompareResultA.vector.reduce((s, v) => s + v * v, 0)).toFixed(2) }}</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.sparsity') }}</div>
                <div class="font-medium text-text-primary">{{ (modelCompareResultA.vector.filter(v => Math.abs(v) < 0.001).length / modelCompareResultA.dimensions * 100).toFixed(1) }}%</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.time') }}</div>
                <div class="font-medium text-text-primary">{{ formatDuration(modelCompareResultA.durationMs) }}</div>
              </div>
            </div>
          </div>

          <!-- Model B results -->
          <div class="space-y-3 rounded-lg border border-border-default bg-surface p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-accent">{{ modelCompareResultB.model }}</span>
              <span class="text-[10px] text-text-muted">{{ modelCompareResultB.dimensions }}d · {{ formatDuration(modelCompareResultB.durationMs) }}</span>
            </div>
            <EmbeddingVectorViz :vector="modelCompareResultB.vector" :height="80" />
            <div class="grid grid-cols-4 gap-1.5 text-[10px]">
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.dims') }}</div>
                <div class="font-medium text-text-primary">{{ modelCompareResultB.dimensions }}</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.l2Norm') }}</div>
                <div class="font-medium text-text-primary">{{ Math.sqrt(modelCompareResultB.vector.reduce((s, v) => s + v * v, 0)).toFixed(2) }}</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.sparsity') }}</div>
                <div class="font-medium text-text-primary">{{ (modelCompareResultB.vector.filter(v => Math.abs(v) < 0.001).length / modelCompareResultB.dimensions * 100).toFixed(1) }}%</div>
              </div>
              <div class="rounded bg-surface-overlay p-1.5">
                <div class="text-text-muted">{{ $t('embeddings.stats.time') }}</div>
                <div class="font-medium text-text-primary">{{ formatDuration(modelCompareResultB.durationMs) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cross-model verdict -->
        <div class="rounded-lg border border-border-default bg-surface p-4 text-center">
          <template v-if="modelCompareScore !== null">
            <SimilarityMeter :score="modelCompareScore" />
            <p class="mt-2 text-xs text-text-muted">
              {{ $t('embeddings.modelComparison.crossModelSimilarity') }}
              <template v-if="modelCompareScore < 0.5"> {{ $t('embeddings.modelComparison.veryDifferent') }}</template>
              <template v-else-if="modelCompareScore < 0.8"> {{ $t('embeddings.modelComparison.moderateAgreement') }}</template>
              <template v-else> {{ $t('embeddings.modelComparison.highAgreement') }}</template>
            </p>
          </template>
          <template v-else>
            <p class="text-sm text-text-muted py-2">
              {{ $t('embeddings.modelComparison.dimensionsMismatch', { dimA: modelCompareResultA.dimensions, dimB: modelCompareResultB.dimensions }) }}
            </p>
            <p class="text-xs text-text-muted">
              {{ $t('embeddings.modelComparison.compareStats') }}
            </p>
          </template>
        </div>
      </template>
    </section>

    <!-- History -->
    <section v-if="embeddingStore.recentResults.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-text-primary">{{ $t('embeddings.history.title') }}</h2>
        <button
          class="text-xs text-text-muted hover:text-error transition-colors"
          @click="embeddingStore.clearResults()"
        >
          {{ $t('embeddings.history.clearAll') }}
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
            class="ms-3 text-text-muted hover:text-error text-xs"
            @click.stop="embeddingStore.removeResult(result.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
