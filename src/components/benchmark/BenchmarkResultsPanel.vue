<script setup lang="ts">
import { ref, computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { BenchmarkResult } from '@/types/benchmark'
import { getBenchmarkLabel } from '@/data/benchmarks/baselines'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

const props = defineProps<{
  result: BenchmarkResult
  contextPressureResult?: BenchmarkResult | null
}>()

const filterCategory = ref<string | null>(null)
const filterCorrect = ref<boolean | null>(null)
const expandedQuestions = ref(false)
const expandedThinking = ref<string | null>(null)

const filteredQuestions = computed(() => {
  let qs = props.result.questionResults
  if (filterCategory.value) qs = qs.filter((q) => q.category === filterCategory.value)
  if (filterCorrect.value !== null) qs = qs.filter((q) => q.correct === filterCorrect.value)
  return qs
})

const categories = computed(() =>
  props.result.categories.map((c) => ({
    ...c,
    label: getBenchmarkLabel(c.category),
    accuracyPct: Math.round(c.accuracy * 100),
    avgLatencyRound: Math.round(c.avgLatencyMs),
    avgTtftRound: Math.round(c.avgTtftMs ?? c.avgLatencyMs),
    confidencePct: Math.round(c.avgConfidence * 100),
  })),
)

const maxLatency = computed(() =>
  Math.max(...props.result.categories.map((c) => c.avgLatencyMs), 1),
)

// Confidence vs Accuracy scatter data
const scatterData = computed(() => {
  const points = props.result.questionResults.map((qr) => ({
    x: qr.avgTokenConfidence,
    y: qr.correct ? 1 : 0,
  }))

  return {
    datasets: [
      {
        label: 'Questions',
        data: points,
        backgroundColor: points.map((p) =>
          p.y === 1 ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)',
        ),
        pointRadius: 4,
      },
    ],
  }
})

const scatterOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { x: number | null; y: number | null } }) =>
          `Confidence: ${Math.round((ctx.parsed.x ?? 0) * 100)}% | ${ctx.parsed.y === 1 ? 'Correct' : 'Incorrect'}`,
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Avg Token Confidence', color: '#94a3b8' },
      min: 0,
      max: 1,
      ticks: { color: '#64748b' },
      grid: { color: 'rgba(71, 85, 105, 0.2)' },
    },
    y: {
      title: { display: true, text: 'Correct (1) / Incorrect (0)', color: '#94a3b8' },
      min: -0.1,
      max: 1.1,
      ticks: { color: '#64748b', stepSize: 1 },
      grid: { color: 'rgba(71, 85, 105, 0.2)' },
    },
  },
}

// Context pressure detection
const pressureCategories = computed(() => {
  if (!props.contextPressureResult) return []
  return props.result.categories
    .map((cat) => {
      const other = props.contextPressureResult!.categories.find((c) => c.category === cat.category)
      if (!other) return null
      const drop = cat.accuracy - other.accuracy
      return { category: cat.category, label: getBenchmarkLabel(cat.category), drop: Math.round(drop * 100) }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && Math.abs(c.drop) > 5)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Summary header -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-text-primary">{{ result.modelName }}</h3>
          <span class="text-xs text-text-muted">
            {{ result.totalQuestions }} questions · {{ Math.round(result.accuracy * 100) }}% accuracy · ctx {{ result.contextSize }}
            · {{ Math.round((result.completedAt - result.startedAt) / 1000) }}s total
          </span>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold" :class="result.accuracy >= 0.5 ? 'text-success' : 'text-error'">
            {{ Math.round(result.accuracy * 100) }}%
          </div>
          <div class="text-[10px] text-text-muted">{{ result.correctCount }}/{{ result.totalQuestions }}</div>
        </div>
      </div>
    </div>

    <!-- X-Ray Diagnostics: Confidence vs Accuracy -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Confidence vs Accuracy — X-Ray Scatter
      </h4>
      <div class="mb-2 flex items-center justify-between text-[10px] text-text-muted">
        <span>Confused (low conf, wrong)</span>
        <span>Calibrated (high conf, right)</span>
      </div>
      <div class="mx-auto max-w-lg">
        <Scatter :data="scatterData" :options="scatterOptions" />
      </div>
      <div class="mt-2 flex items-center justify-between text-[10px] text-text-muted">
        <span>Overconfident (high conf, wrong)</span>
        <span>Lucky (low conf, right)</span>
      </div>
    </div>

    <!-- Per-Category Latency Bars -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Per-Category Total Time
      </h4>
      <div class="space-y-2">
        <div v-for="cat in categories" :key="cat.category" class="flex items-center gap-3">
          <span class="w-24 truncate text-xs text-text-secondary">{{ cat.label }}</span>
          <div class="flex-1 h-3 overflow-hidden rounded-full bg-surface">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="cat.avgLatencyRound > maxLatency * 0.75 ? 'bg-error' : cat.avgLatencyRound > maxLatency * 0.5 ? 'bg-warning' : 'bg-accent'"
              :style="{ width: `${(cat.avgLatencyMs / maxLatency) * 100}%` }"
            />
          </div>
          <span class="w-20 text-right text-xs text-text-muted">{{ cat.avgLatencyRound }}ms</span>
          <span class="w-12 text-right text-xs" :class="cat.accuracyPct >= 50 ? 'text-success' : 'text-error'">
            {{ cat.accuracyPct }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Context Pressure -->
    <div v-if="pressureCategories.length > 0" class="rounded-lg border border-warning/30 bg-warning/5 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-warning">
        Context Pressure — Accuracy Degradation
      </h4>
      <div class="space-y-1">
        <div v-for="pc in pressureCategories" :key="pc.category" class="flex items-center justify-between text-xs">
          <span class="text-text-secondary">{{ pc.label }}</span>
          <span :class="pc.drop < 0 ? 'text-error' : 'text-success'">
            {{ pc.drop > 0 ? '+' : '' }}{{ pc.drop }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Category Breakdown Table -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Category Breakdown
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-default text-left text-text-muted">
              <th class="pb-2 pr-4">Category</th>
              <th class="pb-2 pr-4">Accuracy</th>
              <th class="pb-2 pr-4">Correct</th>
              <th class="pb-2 pr-4">Avg TTFT</th>
              <th class="pb-2 pr-4">Avg Total</th>
              <th class="pb-2">Avg Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.category" class="border-b border-border-default/50">
              <td class="py-2 pr-4 text-text-primary">{{ cat.label }}</td>
              <td class="py-2 pr-4" :class="cat.accuracyPct >= 50 ? 'text-success' : 'text-error'">
                {{ cat.accuracyPct }}%
              </td>
              <td class="py-2 pr-4 text-text-secondary">{{ cat.correctCount }}/{{ cat.questionCount }}</td>
              <td class="py-2 pr-4 text-text-secondary">{{ cat.avgTtftRound }}ms</td>
              <td class="py-2 pr-4 text-text-secondary">{{ cat.avgLatencyRound }}ms</td>
              <td class="py-2 text-text-secondary">{{ cat.confidencePct }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Per-Question Detail (collapsible) -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4">
      <button
        class="flex w-full items-center justify-between"
        @click="expandedQuestions = !expandedQuestions"
      >
        <h4 class="text-xs font-medium uppercase tracking-wide text-text-muted">
          Per-Question Detail ({{ result.questionResults.length }})
        </h4>
        <span class="text-xs text-text-muted">{{ expandedQuestions ? '▲' : '▼' }}</span>
      </button>

      <template v-if="expandedQuestions">
        <!-- Filters -->
        <div class="mt-3 flex items-center gap-2">
          <button
            class="rounded-md border px-2 py-0.5 text-[10px] transition-colors"
            :class="filterCategory === null ? 'border-accent text-accent' : 'border-border-default text-text-muted'"
            @click="filterCategory = null"
          >
            All
          </button>
          <button
            v-for="cat in result.categories"
            :key="cat.category"
            class="rounded-md border px-2 py-0.5 text-[10px] transition-colors"
            :class="filterCategory === cat.category ? 'border-accent text-accent' : 'border-border-default text-text-muted'"
            @click="filterCategory = cat.category"
          >
            {{ getBenchmarkLabel(cat.category) }}
          </button>
          <span class="mx-1 text-text-muted">|</span>
          <button
            class="rounded-md border px-2 py-0.5 text-[10px] transition-colors"
            :class="filterCorrect === null ? 'border-accent text-accent' : 'border-border-default text-text-muted'"
            @click="filterCorrect = null"
          >
            All
          </button>
          <button
            class="rounded-md border px-2 py-0.5 text-[10px] transition-colors"
            :class="filterCorrect === true ? 'border-success text-success' : 'border-border-default text-text-muted'"
            @click="filterCorrect = true"
          >
            Correct
          </button>
          <button
            class="rounded-md border px-2 py-0.5 text-[10px] transition-colors"
            :class="filterCorrect === false ? 'border-error text-error' : 'border-border-default text-text-muted'"
            @click="filterCorrect = false"
          >
            Wrong
          </button>
        </div>

        <!-- Question list -->
        <div class="mt-3 max-h-[400px] space-y-1 overflow-auto">
          <div
            v-for="qr in filteredQuestions"
            :key="qr.questionId"
            class="rounded-md border border-border-default/50"
          >
            <button
              class="flex w-full items-center gap-3 px-3 py-2 text-xs text-left"
              :class="qr.thinkingResponse ? 'cursor-pointer hover:bg-surface' : ''"
              @click="qr.thinkingResponse && (expandedThinking = expandedThinking === qr.questionId ? null : qr.questionId)"
            >
              <span
                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                :class="qr.correct ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
              >
                {{ qr.correct ? '✓' : '✗' }}
              </span>
              <span class="w-16 shrink-0 text-text-muted">{{ qr.questionId }}</span>
              <span class="flex-1 truncate text-text-secondary" :title="qr.fullResponse">
                {{ qr.modelAnswer }} (expected {{ qr.expectedAnswer }})
              </span>
              <span class="w-28 shrink-0 text-right text-text-muted" :title="`TTFT ${Math.round(qr.ttftMs ?? qr.latencyMs)}ms · Total ${Math.round(qr.latencyMs)}ms`">
                {{ Math.round(qr.ttftMs ?? qr.latencyMs) }}ms / {{ Math.round(qr.latencyMs) }}ms
              </span>
              <span class="w-14 shrink-0 text-right text-text-muted">{{ Math.round(qr.avgTokenConfidence * 100) }}%</span>
              <span v-if="qr.thinkingResponse" class="w-4 shrink-0 text-center text-text-muted">
                {{ expandedThinking === qr.questionId ? '▲' : '▼' }}
              </span>
            </button>
            <div
              v-if="expandedThinking === qr.questionId && qr.thinkingResponse"
              class="border-t border-border-default/50 bg-surface px-3 py-2"
            >
              <div class="mb-1 text-[10px] font-medium uppercase tracking-wide text-warning">Reasoning</div>
              <div class="max-h-[200px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-text-muted italic">{{ qr.thinkingResponse }}</div>
              <div v-if="qr.fullResponse" class="mt-2">
                <div class="mb-1 text-[10px] font-medium uppercase tracking-wide text-accent">Response</div>
                <div class="font-mono text-[10px] text-text-secondary">{{ qr.fullResponse }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
