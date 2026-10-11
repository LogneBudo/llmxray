<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useModelStore } from '@/stores/model-store'
import { useDecisionLabStore } from '@/stores/decision-lab-store'
import { answerBars } from '@/services/decision-lab'
import type { DecisionAnswer, DecisionQuestionType } from '@/types/decision'
import { Play, Square, Info, Scale, Plus, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()
const modelStore = useModelStore()
const lab = useDecisionLabStore()

const TYPES: DecisionQuestionType[] = ['choice', 'noul', 'score']

onMounted(async () => {
  // Seed first and unconditionally: the editor is useful before (or without) a model list.
  lab.seedSample()
  await modelStore.fetchModels()
  if (!lab.model && modelStore.decisionModelNames.length > 0) {
    lab.model = modelStore.decisionModelNames[0]!
  }
})

const answers = computed(() => {
  const r = lab.result
  if (!r) return []
  return Object.entries(r.answers).map(([key, answer]) => ({ key, answer, bars: answerBars(answer) }))
})

function barLabel(answer: DecisionAnswer, label: string): string {
  if (answer.type === 'noul') return t(`decisionlab.results.${label}`)
  return label
}

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <Scale class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('decisionlab.title') }}</h2>
          <p class="mt-1 text-xs text-text-muted">{{ $t('decisionlab.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-start gap-2 rounded-lg border border-border-default bg-surface-raised p-3 text-xs text-text-secondary">
        <Info class="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>{{ $t('decisionlab.explainer') }}</p>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <!-- Left: inputs -->
        <div class="space-y-4 lg:col-span-3">
          <!-- Model -->
          <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-2">
            <label class="text-xs font-medium text-text-secondary">{{ $t('decisionlab.model') }}</label>
            <select
              v-if="modelStore.decisionModelNames.length > 0"
              v-model="lab.model"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary"
            >
              <option v-for="name in modelStore.decisionModelNames" :key="name" :value="name">{{ name }}</option>
            </select>
            <div v-else class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
              <p class="font-medium text-warning">{{ $t('decisionlab.noModels') }}</p>
              <p class="mt-1">
                {{ $t('decisionlab.noModelsHint') }}
                <RouterLink to="/settings?tab=models" class="ms-1 text-accent underline">{{ $t('common.nav.models') }}</RouterLink>
              </p>
            </div>
          </div>

          <!-- State -->
          <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-2">
            <label class="text-xs font-medium text-text-secondary">{{ $t('decisionlab.state') }}</label>
            <textarea
              v-model="lab.state"
              rows="4"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs text-text-primary"
              :placeholder="$t('decisionlab.statePlaceholder')"
            />
          </div>

          <!-- Questions -->
          <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-text-secondary">{{ $t('decisionlab.questions') }} ({{ lab.questions.length }})</label>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                @click="lab.addQuestion()"
              >
                <Plus class="h-3.5 w-3.5" />
                {{ $t('decisionlab.addQuestion') }}
              </button>
            </div>

            <div
              v-for="q in lab.questions"
              :key="q.id"
              class="rounded-lg border bg-surface p-3 space-y-2"
              :class="lab.problems.has(q.id) ? 'border-warning/50' : 'border-border-default'"
            >
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('decisionlab.key') }}</label>
                  <input v-model="q.key" class="mt-0.5 w-full rounded border border-border-default bg-surface-raised px-2 py-1 font-mono text-xs text-text-primary" />
                </div>
                <div>
                  <label class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('decisionlab.type') }}</label>
                  <select v-model="q.type" class="mt-0.5 w-full rounded border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary">
                    <option v-for="ty in TYPES" :key="ty" :value="ty">{{ $t(`decisionlab.types.${ty}`) }}</option>
                  </select>
                </div>
                <button
                  type="button"
                  class="self-end rounded p-1.5 text-text-muted hover:text-error transition-colors"
                  :title="$t('decisionlab.remove')"
                  @click="lab.removeQuestion(q.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('decisionlab.instructions') }}</label>
                <input
                  v-model="q.instructions"
                  class="mt-0.5 w-full rounded border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary"
                  :placeholder="$t('decisionlab.instructionsPlaceholder')"
                />
              </div>
              <div v-if="q.type !== 'noul'">
                <label class="text-[10px] uppercase tracking-wide text-text-muted">{{ $t('decisionlab.criteria') }}</label>
                <textarea
                  v-model="q.criteriaText"
                  rows="3"
                  class="mt-0.5 w-full rounded border border-border-default bg-surface-raised px-2 py-1 font-mono text-xs text-text-primary"
                />
                <p class="mt-0.5 text-[10px] text-text-muted">{{ $t(`decisionlab.criteriaHint.${q.type}`) }}</p>
              </div>
              <p v-if="lab.problems.has(q.id)" class="text-[11px] text-warning">
                {{ $t(`decisionlab.problems.${lab.problems.get(q.id)}`) }}
              </p>
            </div>
          </div>

          <!-- Run -->
          <div class="flex items-center gap-3">
            <button
              v-if="!lab.isRunning"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
              :disabled="!lab.canRun"
              @click="lab.run()"
            >
              <Play class="h-4 w-4" />
              {{ $t('decisionlab.run') }}
            </button>
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary"
              @click="lab.cancel()"
            >
              <Square class="h-4 w-4" />
              {{ $t('decisionlab.cancel') }}
            </button>
            <span v-if="lab.isRunning" class="text-xs text-text-muted">{{ $t('decisionlab.running') }}</span>
            <span v-if="lab.error" class="text-xs text-error">{{ lab.error }}</span>
          </div>
        </div>

        <!-- Right: answers -->
        <div class="space-y-4 lg:col-span-2">
          <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
            <h3 class="text-sm font-medium text-text-primary">{{ $t('decisionlab.results.title') }}</h3>

            <div v-if="answers.length === 0" class="text-xs text-text-muted">—</div>

            <div v-for="a in answers" :key="a.key" class="space-y-1.5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-mono text-xs text-text-primary">{{ a.key }}</span>
                <span class="text-[10px] text-text-muted">
                  <template v-if="a.answer.type === 'choice'">
                    {{ $t('decisionlab.results.chosen') }}: <span class="font-medium text-text-primary">{{ a.answer.choice }}</span>
                    · {{ $t('decisionlab.results.confidence') }} {{ pct(a.answer.confidence) }}
                  </template>
                  <template v-else-if="a.answer.type === 'score'">
                    {{ $t('decisionlab.results.score') }} <span class="font-medium text-text-primary">{{ a.answer.score.toFixed(2) }}</span>
                    / {{ Object.keys(a.answer.legend).length - 1 }}
                    · {{ $t('decisionlab.results.confidence') }} {{ pct(a.answer.confidence) }}
                  </template>
                  <template v-else>
                    {{ pct(a.answer.noul) }}
                  </template>
                </span>
              </div>
              <div v-for="bar in a.bars" :key="bar.label" class="flex items-center gap-2 text-[11px]">
                <span class="w-28 shrink-0 truncate" :class="bar.winner ? 'font-medium text-text-primary' : 'text-text-secondary'" :title="bar.label">
                  {{ barLabel(a.answer, bar.label) }}
                </span>
                <div class="h-2.5 flex-1 overflow-hidden rounded bg-surface">
                  <div
                    class="h-full rounded transition-[width]"
                    :class="bar.winner ? 'bg-accent' : 'bg-text-muted/40'"
                    :style="{ width: `${Math.max(bar.probability * 100, 0.5)}%` }"
                  />
                </div>
                <span class="w-14 shrink-0 text-end font-mono text-text-secondary">{{ pct(bar.probability) }}</span>
              </div>
            </div>

            <p v-if="lab.result" class="text-[10px] text-text-muted">
              {{ $t('decisionlab.results.usage', { input: lab.result.usage.input_tokens, output: lab.result.usage.output_tokens, ms: lab.elapsedMs === null ? '—' : fmtMs(lab.elapsedMs) }) }}
            </p>
            <p v-if="lab.result" class="text-[10px] text-text-muted">{{ $t('decisionlab.results.footnote') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
