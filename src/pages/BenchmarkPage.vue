<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark-store'
import type { BenchmarkResult } from '@/types/benchmark'
import BenchmarkConfigurator from '@/components/benchmark/BenchmarkConfigurator.vue'
import BenchmarkLiveView from '@/components/benchmark/BenchmarkLiveView.vue'
import BenchmarkResultsPanel from '@/components/benchmark/BenchmarkResultsPanel.vue'
import BenchmarkComparisonLedger from '@/components/benchmark/BenchmarkComparisonLedger.vue'
import BenchmarkImportDialog from '@/components/benchmark/BenchmarkImportDialog.vue'
import { BUILTIN_SUITES } from '@/data/benchmarks/index'

const benchmarkStore = useBenchmarkStore()

const showImport = ref(false)
const detailResult = ref<BenchmarkResult | null>(null)

const isRunning = computed(() => benchmarkStore.isRunning)
const hasSavedResults = computed(() => benchmarkStore.savedResults.length > 0)
const justCompleted = computed(
  () =>
    benchmarkStore.runState.status === 'completed' ||
    benchmarkStore.runState.status === 'cancelled',
)

// The result to show in the detail panel: explicitly selected, or latest after a run
const shownResult = computed(() => detailResult.value ?? (justCompleted.value ? benchmarkStore.latestResult : null))

// Find a context-pressure counterpart for the shown result (same model, different context size)
const contextPressureResult = computed(() => {
  const target = shownResult.value
  if (!target) return null
  return benchmarkStore.savedResults.find(
    (r) =>
      r.id !== target.id &&
      r.modelName === target.modelName &&
      r.contextSize !== target.contextSize,
  ) ?? null
})

function onViewDetails(result: BenchmarkResult) {
  detailResult.value = result
}

function onResume(result: BenchmarkResult) {
  benchmarkStore.resumeRun(result.id, BUILTIN_SUITES)
}

function closeDetailView() {
  detailResult.value = null
}

onMounted(() => {
  benchmarkStore.loadFromDB()
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-text-primary">Surgical Benchmark</h1>
        <p class="text-xs text-text-muted">
          Evaluate models with curated question sets — real logprob confidence, per-category diagnostics
        </p>
      </div>
    </div>

    <!-- Configure (hidden while running) -->
    <section v-if="!isRunning">
      <BenchmarkConfigurator @open-import="showImport = true" />
    </section>

    <!-- Live View (while running) -->
    <section v-if="isRunning">
      <BenchmarkLiveView />
    </section>

    <!-- Result Detail View -->
    <section v-if="shownResult">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-text-primary">
          {{ detailResult ? 'Result Details' : 'Latest Result' }} — {{ shownResult.modelName }}
        </h2>
        <button
          v-if="detailResult"
          class="rounded-md border border-border-default px-2 py-1 text-xs text-text-muted transition-colors hover:text-text-primary"
          @click="closeDetailView()"
        >
          Close
        </button>
      </div>
      <BenchmarkResultsPanel
        :result="shownResult"
        :context-pressure-result="contextPressureResult"
      />
    </section>

    <!-- Comparison Ledger -->
    <section v-if="hasSavedResults">
      <h2 class="mb-3 text-sm font-medium text-text-primary">Comparison Ledger</h2>
      <BenchmarkComparisonLedger @view-details="onViewDetails" @resume="onResume" />
    </section>

    <!-- Import Dialog -->
    <BenchmarkImportDialog v-if="showImport" @close="showImport = false" />
  </div>
</template>
