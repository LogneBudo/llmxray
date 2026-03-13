<script setup lang="ts">
import { computed } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark-store'
import type { BenchmarkResult } from '@/types/benchmark'
import { getBenchmarkLabel } from '@/data/benchmarks/baselines'
import BenchmarkRadarChart from './BenchmarkRadarChart.vue'
import BenchmarkCategoryHeatmap from './BenchmarkCategoryHeatmap.vue'

const benchmarkStore = useBenchmarkStore()

const emit = defineEmits<{
  viewDetails: [result: BenchmarkResult]
}>()

const results = computed(() => benchmarkStore.savedResults)
const activeResults = computed(() => benchmarkStore.activeResults)

const SUITE_COLORS: Record<string, string> = {
  mmlu_pro: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  arc: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  hellaswag: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  gsm8k: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  truthfulqa: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

function suiteColor(id: string): string {
  return SUITE_COLORS[id] ?? 'bg-surface text-text-muted border-border-default'
}

function suiteAbbrev(id: string): string {
  const abbrevs: Record<string, string> = {
    mmlu_pro: 'MMLU',
    arc: 'ARC',
    hellaswag: 'HSw',
    gsm8k: 'GSM',
    truthfulqa: 'TQA',
  }
  return abbrevs[id] ?? id.slice(0, 4).toUpperCase()
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(r: BenchmarkResult): string {
  const secs = Math.round((r.completedAt - r.startedAt) / 1000)
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Saved results list -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4">
        <h4 class="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Saved Results ({{ results.length }})
        </h4>
        <div v-if="results.length > 0" class="max-h-[400px] space-y-1.5 overflow-auto">
          <div
            v-for="r in results"
            :key="r.id"
            class="flex items-center gap-2 rounded-md border p-2.5 text-xs transition-colors cursor-pointer"
            :class="
              benchmarkStore.activeResultIds.includes(r.id)
                ? 'border-accent bg-accent/5'
                : 'border-border-default hover:border-accent/50'
            "
            @click="benchmarkStore.toggleActiveResult(r.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium text-text-primary">{{ r.modelName }}</div>
              <div class="mt-0.5 flex items-center gap-1 flex-wrap">
                <span
                  v-for="sid in r.benchmarkIds"
                  :key="sid"
                  class="inline-block rounded border px-1 py-px text-[9px] font-medium leading-tight"
                  :class="suiteColor(sid)"
                  :title="getBenchmarkLabel(sid)"
                >
                  {{ suiteAbbrev(sid) }}
                </span>
              </div>
              <div class="mt-0.5 text-[10px] text-text-muted">
                {{ formatDate(r.completedAt) }} · ctx {{ r.contextSize }} · {{ formatDuration(r) }}
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-bold" :class="r.accuracy >= 0.5 ? 'text-success' : 'text-error'">
                {{ Math.round(r.accuracy * 100) }}%
              </div>
              <div class="text-[10px] text-text-muted">{{ r.correctCount }}/{{ r.totalQuestions }}</div>
            </div>
            <button
              class="ml-1 shrink-0 text-text-muted hover:text-accent transition-colors"
              title="View full details"
              @click.stop="emit('viewDetails', r)"
            >
              &#x1F50D;
            </button>
            <button
              class="shrink-0 text-text-muted hover:text-error transition-colors"
              title="Delete result"
              @click.stop="benchmarkStore.deleteResult(r.id)"
            >
              ✕
            </button>
          </div>
        </div>
        <div v-else class="flex h-24 items-center justify-center text-xs text-text-muted">
          No saved results yet
        </div>
        <div v-if="results.length > 0" class="mt-2 text-[10px] text-text-muted text-center">
          Click to select (max 4) for comparison
        </div>
      </div>

      <!-- Radar + Heatmap -->
      <div class="lg:col-span-2 space-y-4">
        <BenchmarkRadarChart :results="activeResults" />
        <BenchmarkCategoryHeatmap :results="activeResults" />
      </div>
    </div>
  </div>
</template>
