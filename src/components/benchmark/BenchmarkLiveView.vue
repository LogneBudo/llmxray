<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark-store'
import { useModelStore } from '@/stores/model-store'
import { getBenchmarkLabel } from '@/data/benchmarks/baselines'

const benchmarkStore = useBenchmarkStore()
const modelStore = useModelStore()
const state = computed(() => benchmarkStore.runState)
const isThinkingModel = computed(() => modelStore.isThinkingModel(state.value.modelName))
const streamContainer = ref<HTMLElement | null>(null)

const progressPercent = computed(() => {
  if (state.value.totalQuestions === 0) return 0
  return Math.round((state.value.currentQuestionIndex / state.value.totalQuestions) * 100)
})

const accuracyPercent = computed(() => Math.round(state.value.liveAccuracy * 100))

const avgLatency = computed(() => Math.round(state.value.liveAvgLatencyMs))

const categoryEntries = computed(() =>
  Object.entries(state.value.categoryProgress).map(([cat, p]) => ({
    category: cat,
    label: getBenchmarkLabel(cat),
    accuracy: p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0,
    correct: p.correct,
    total: p.total,
  })),
)

const isThinking = computed(
  () => state.value.currentThinkingTokens && !state.value.currentTokens,
)

// Auto-scroll thinking stream
watch(
  () => state.value.currentThinkingTokens,
  () => {
    nextTick(() => {
      if (streamContainer.value) {
        streamContainer.value.scrollTop = streamContainer.value.scrollHeight
      }
    })
  },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Progress bar -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span class="text-sm font-medium text-text-primary">{{ state.modelName }}</span>
          <span
            class="rounded border px-1 py-px text-[9px] font-medium leading-tight"
            :class="isThinkingModel ? 'bg-warning/15 text-warning border-warning/30' : 'bg-accent/15 text-accent border-accent/30'"
          >
            {{ isThinkingModel ? 'Thinking' : 'Standard' }}
          </span>
        </div>
        <span class="text-xs text-text-muted">
          Question {{ state.currentQuestionIndex + 1 }} / {{ state.totalQuestions }}
        </span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-surface">
        <div
          class="h-full rounded-full bg-accent transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="mt-2 flex items-center gap-1 text-xs text-text-muted">
        <span v-if="state.currentQuestion">
          {{ getBenchmarkLabel(state.currentQuestion.category) }}
        </span>
        <span class="mx-1">&middot;</span>
        <span>{{ accuracyPercent }}% accuracy</span>
      </div>
    </div>

    <!-- Main content: question + answer -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <!-- Current question (60%) -->
      <div class="lg:col-span-3 rounded-lg border border-border-default bg-surface-raised p-4">
        <h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Current Question
        </h4>
        <template v-if="state.currentQuestion">
          <p class="mb-3 text-sm text-text-primary">{{ state.currentQuestion.question }}</p>
          <div class="space-y-1.5">
            <div
              v-for="(choice, idx) in state.currentQuestion.choices"
              :key="idx"
              class="rounded-md border px-3 py-1.5 text-xs"
              :class="
                choice.startsWith(state.currentQuestion!.correctAnswer + ')')
                  ? 'border-success/30 bg-success/5 text-success'
                  : 'border-border-default text-text-secondary'
              "
            >
              {{ choice }}
            </div>
          </div>
        </template>
        <div v-else class="flex h-32 items-center justify-center text-sm text-text-muted">
          Waiting for question...
        </div>
      </div>

      <!-- Model answer panel (40%) -->
      <div class="lg:col-span-2 space-y-3">
        <!-- Last answer result — persists until next answer arrives -->
        <div class="rounded-lg border p-4" :class="
          state.lastAnswer === null
            ? 'border-border-default bg-surface-raised'
            : state.lastAnswer.correct
              ? 'border-success/30 bg-success/5'
              : 'border-error/30 bg-error/5'
        ">
          <h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Last Answer
          </h4>
          <template v-if="state.lastAnswer">
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl font-bold"
                :class="state.lastAnswer.correct ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
              >
                {{ state.lastAnswer.modelAnswer }}
              </span>
              <div>
                <div class="text-sm font-medium" :class="state.lastAnswer.correct ? 'text-success' : 'text-error'">
                  {{ state.lastAnswer.correct ? 'Correct' : 'Incorrect' }}
                </div>
                <div v-if="!state.lastAnswer.correct" class="text-xs text-text-muted">
                  Expected: {{ state.lastAnswer.expectedAnswer }}
                </div>
                <div class="text-[10px] text-text-muted">
                  {{ Math.round(state.lastAnswer.latencyMs) }}ms
                </div>
              </div>
            </div>
          </template>
          <div v-else class="flex h-12 items-center justify-center text-xs text-text-muted">
            Waiting for first answer...
          </div>
        </div>

        <!-- Thinking stream — only shown while model is reasoning -->
        <div v-if="isThinking" class="rounded-lg border border-warning/20 bg-surface-raised p-4">
          <div class="mb-2 flex items-center gap-1">
            <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
            <h4 class="text-xs font-medium uppercase tracking-wide text-warning">Reasoning</h4>
          </div>
          <div
            ref="streamContainer"
            class="max-h-[150px] overflow-auto rounded-md bg-surface p-2 font-mono text-[10px] text-text-muted italic leading-relaxed"
          >
            {{ state.currentThinkingTokens }}
          </div>
        </div>

        <!-- Processing indicator when not thinking -->
        <div v-else-if="!state.currentTokens && state.lastAnswer" class="flex items-center gap-2 rounded-lg border border-border-default bg-surface-raised px-4 py-3">
          <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span class="text-xs text-text-muted">Processing question...</span>
        </div>
      </div>
    </div>

    <!-- Live stats -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-lg border border-border-default bg-surface-raised p-3 text-center">
        <div class="text-xs text-text-muted">Accuracy</div>
        <div class="mt-1 text-lg font-bold" :class="accuracyPercent >= 50 ? 'text-success' : 'text-error'">
          {{ accuracyPercent }}%
        </div>
      </div>
      <div class="rounded-lg border border-border-default bg-surface-raised p-3 text-center">
        <div class="text-xs text-text-muted">Avg Latency</div>
        <div class="mt-1 text-lg font-bold text-text-primary">{{ avgLatency }}ms</div>
      </div>
      <div class="rounded-lg border border-border-default bg-surface-raised p-3 text-center">
        <div class="text-xs text-text-muted">Progress</div>
        <div class="mt-1 text-lg font-bold text-accent">{{ progressPercent }}%</div>
      </div>
      <div class="rounded-lg border border-border-default bg-surface-raised p-3 text-center">
        <div class="text-xs text-text-muted">Categories</div>
        <div class="mt-1 text-lg font-bold text-text-primary">{{ categoryEntries.length }}</div>
      </div>
    </div>

    <!-- Category progress -->
    <div v-if="categoryEntries.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Category Progress
      </h4>
      <div class="space-y-2">
        <div v-for="cat in categoryEntries" :key="cat.category" class="flex items-center gap-3">
          <span class="w-28 truncate text-xs text-text-secondary">{{ cat.label }}</span>
          <div class="flex-1 h-2 overflow-hidden rounded-full bg-surface">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="cat.accuracy >= 50 ? 'bg-success' : 'bg-warning'"
              :style="{ width: `${cat.accuracy}%` }"
            />
          </div>
          <span class="w-14 text-right text-xs text-text-muted">
            {{ cat.correct }}/{{ cat.total }}
          </span>
        </div>
      </div>
    </div>

    <!-- Stop button -->
    <div class="flex justify-center">
      <button
        class="rounded-lg border border-error/50 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
        @click="benchmarkStore.cancelRun()"
      >
        Stop Benchmark
      </button>
    </div>
  </div>
</template>
