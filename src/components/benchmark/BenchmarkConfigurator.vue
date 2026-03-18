<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { useBenchmarkStore } from '@/stores/benchmark-store'
import { BUILTIN_SUITES, BUILTIN_SUITE_IDS } from '@/data/benchmarks'
import ModelCapabilityIcons from '@/components/common/ModelCapabilityIcons.vue'
import BenchmarkBuilderDialog from './BenchmarkBuilderDialog.vue'
import type { BenchmarkSuite } from '@/types/benchmark'

const emit = defineEmits<{
  openImport: []
}>()

const showBuilder = ref(false)
const editingSuite = ref<BenchmarkSuite | undefined>(undefined)

function openBuilder(suite?: BenchmarkSuite) {
  editingSuite.value = suite
  showBuilder.value = true
}

async function onBuilderSaved(suite: BenchmarkSuite) {
  await benchmarkStore.importCustomSuite(JSON.stringify(suite))
  showBuilder.value = false
  editingSuite.value = undefined
}

const modelStore = useModelStore()
const benchmarkStore = useBenchmarkStore()

const selectedModels = ref<string[]>([])
const selectedSuiteIds = ref<string[]>([...BUILTIN_SUITE_IDS])
const contextSize = ref(2048)

const allSuites = computed(() => {
  const builtIn = [...BUILTIN_SUITES.values()]
  return [...builtIn, ...benchmarkStore.customSuites]
})

const totalQuestions = computed(() =>
  allSuites.value
    .filter((s) => selectedSuiteIds.value.includes(s.id))
    .reduce((sum, s) => sum + s.questions.length, 0),
)

const estimatedMinutes = computed(() => {
  const secs = selectedModels.value.length * totalQuestions.value * 3
  return Math.ceil(secs / 60)
})

const canRun = computed(
  () =>
    selectedModels.value.length > 0 &&
    selectedSuiteIds.value.length > 0 &&
    !benchmarkStore.isRunning,
)

function toggleModel(name: string) {
  const idx = selectedModels.value.indexOf(name)
  if (idx >= 0) {
    selectedModels.value = selectedModels.value.filter((m) => m !== name)
  } else if (selectedModels.value.length < 4) {
    selectedModels.value = [...selectedModels.value, name]
  }
}

function toggleSuite(id: string) {
  const idx = selectedSuiteIds.value.indexOf(id)
  if (idx >= 0) {
    selectedSuiteIds.value = selectedSuiteIds.value.filter((s) => s !== id)
  } else {
    selectedSuiteIds.value = [...selectedSuiteIds.value, id]
  }
}

function startBenchmark() {
  if (!canRun.value) return
  benchmarkStore.startRun(
    {
      modelNames: selectedModels.value,
      suiteIds: selectedSuiteIds.value,
      contextSize: contextSize.value,
    },
    BUILTIN_SUITES,
  )
}

onMounted(() => {
  if (modelStore.models.length === 0) {
    modelStore.fetchModels()
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Model Selection -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary">{{ $t('benchmark.configurator.models') }}</h3>
        <span class="text-xs text-text-muted">{{ selectedModels.length }}/4 {{ $t('benchmark.configurator.selected') }}</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="name in modelStore.chatModelNames"
          :key="name"
          class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
          :class="
            selectedModels.includes(name)
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border-default text-text-secondary hover:border-accent hover:text-text-primary'
          "
          @click="toggleModel(name)"
        >
          <ModelCapabilityIcons :model-name="name" />
          <span>{{ name }}</span>
        </button>
      </div>
    </div>

    <!-- Suite Selection -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary">{{ $t('benchmark.configurator.benchmarkSuites') }}</h3>
        <div class="flex gap-2">
          <button
            class="rounded-md border border-border-default px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
            @click="openBuilder()"
          >
            {{ $t('benchmark.builder.createSuite') }}
          </button>
          <button
            class="rounded-md border border-border-default px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
            @click="$emit('openImport')"
          >
            {{ $t('benchmark.configurator.importCustom') }}
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="suite in allSuites"
          :key="suite.id"
          class="flex flex-col items-start rounded-md border p-3 text-left transition-colors"
          :class="
            selectedSuiteIds.includes(suite.id)
              ? 'border-accent bg-accent/10'
              : 'border-border-default hover:border-accent/50'
          "
          @click="toggleSuite(suite.id)"
        >
          <div class="flex w-full items-center justify-between">
            <span
              class="text-xs font-medium"
              :class="selectedSuiteIds.includes(suite.id) ? 'text-accent' : 'text-text-primary'"
            >
              {{ suite.name }}
            </span>
            <span class="text-[10px] text-text-muted">{{ suite.questions.length }}q</span>
          </div>
          <span class="mt-1 text-[10px] text-text-muted line-clamp-2">{{ suite.description }}</span>
          <div v-if="!suite.builtIn" class="mt-1 flex items-center gap-2">
            <span class="inline-block rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] text-warning">{{ $t('benchmark.configurator.custom') }}</span>
            <button
              class="text-[9px] text-text-muted hover:text-accent transition-colors"
              @click.stop="openBuilder(suite)"
            >
              {{ $t('common.actions.edit') }}
            </button>
          </div>
        </button>
      </div>
    </div>

    <!-- Context Size + Run -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-xs text-text-muted">{{ $t('benchmark.configurator.context') }}</span>
        <button
          v-for="size in [2048, 8192]"
          :key="size"
          class="rounded-md border px-2.5 py-1 text-xs transition-colors"
          :class="
            contextSize === size
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border-default text-text-secondary hover:border-accent'
          "
          @click="contextSize = size"
        >
          {{ size >= 1024 ? `${size / 1024}k` : size }}
        </button>
      </div>

      <div class="flex-1" />

      <span v-if="canRun" class="text-xs text-text-muted">
        ~{{ estimatedMinutes }} min · {{ totalQuestions }} questions × {{ selectedModels.length }} model{{ selectedModels.length > 1 ? 's' : '' }}
      </span>

      <button
        :disabled="!canRun"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="
          canRun
            ? 'bg-accent text-surface hover:bg-accent-hover'
            : 'bg-surface-overlay text-text-muted cursor-not-allowed'
        "
        @click="startBenchmark"
      >
        {{ $t('benchmark.configurator.runBenchmark') }}
      </button>
    </div>

    <!-- Builder Dialog -->
    <BenchmarkBuilderDialog
      v-if="showBuilder"
      :edit-suite="editingSuite"
      @close="showBuilder = false"
      @saved="onBuilderSaved"
    />
  </div>
</template>
