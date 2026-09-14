<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useModelStore } from '@/stores/model-store'
import { useCacheLabStore } from '@/stores/cache-lab-store'
import { commonPrefixLength, mutateVolatile } from '@/services/cache-lab'
import { formatPercent } from '@/utils/format'
import { Play, Square, Info, DatabaseZap, TriangleAlert, Check } from 'lucide-vue-next'

const { t } = useI18n()
const modelStore = useModelStore()
const lab = useCacheLabStore()

const SAMPLE =
  '[2026-09-14 16:04:11] You are a careful assistant. ' +
  'Follow the house style guide closely. '.repeat(40)

onMounted(async () => {
  // Seed the prompt first and unconditionally: the diagnosis is local work and
  // should be on screen even if the model list never arrives.
  if (!lab.systemPrompt) lab.systemPrompt = SAMPLE

  await modelStore.fetchModels()
  if (!lab.model && modelStore.chatModelNames.length > 0) {
    lab.model = modelStore.chatModelNames[0]!
  }
})

/** The prompt split at its first volatile span, for the highlighted preview. */
const promptParts = computed(() => {
  const text = lab.systemPrompt
  const first = lab.volatileSegments[0]
  if (!first) return { before: text, hot: '', after: '' }
  return {
    before: text.slice(0, first.start),
    hot: text.slice(first.start, first.end),
    after: text.slice(first.end),
  }
})

/** How much of the prompt is forfeited by the earliest volatile span. */
const forfeitedShare = computed(() => {
  const r = lab.earliestVolatileRatio
  return r === null ? null : 1 - r
})

const original = computed(() => lab.probes.find((p) => p.label === 'original'))
const rewritten = computed(() => lab.probes.find((p) => p.label === 'rewritten'))

const rows = computed(() =>
  [
    { key: 'original', label: t('cachelab.rows.original'), probe: original.value },
    { key: 'rewritten', label: t('cachelab.rows.rewritten'), probe: rewritten.value },
  ].filter((r) => r.probe),
)

/**
 * Characters the rewritten layout keeps when its volatile values change — the
 * prefix the cache can actually hold on to, turn after turn.
 */
const survivingPrefix = computed(() => {
  const rewrite = lab.rewrittenPrompt
  if (!rewrite) return 0
  return commonPrefixLength(rewrite, mutateVolatile(rewrite))
})

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <DatabaseZap class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('cachelab.title') }}</h2>
          <p class="mt-1 text-xs text-text-muted">{{ $t('cachelab.subtitle') }}</p>
        </div>
      </div>

      <!-- Explainer -->
      <div class="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
        <Info class="h-4 w-4 shrink-0 text-accent" />
        <p>{{ $t('cachelab.explainer') }}</p>
      </div>

      <!-- Controls -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="mb-1 block text-xs text-text-muted">{{ $t('cachelab.model') }}</label>
            <select
              v-model="lab.model"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option v-for="m in modelStore.chatModelNames" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="w-48">
            <label class="mb-1 block text-xs text-text-muted">{{ $t('cachelab.userMessage') }}</label>
            <input
              v-model="lab.userMessage"
              type="text"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs text-text-muted">{{ $t('cachelab.systemPrompt') }}</label>
          <textarea
            v-model="lab.systemPrompt"
            rows="5"
            class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
            :placeholder="$t('cachelab.systemPromptPlaceholder')"
          />
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="!lab.isRunning"
            :disabled="!lab.canRun"
            class="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            @click="lab.run"
          >
            <Play :size="12" />
            {{ $t('cachelab.measure') }}
          </button>
          <button
            v-else
            class="inline-flex items-center gap-1.5 rounded-md border border-error/50 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
            @click="lab.cancel"
          >
            <Square :size="12" />
            {{ $t('cachelab.cancel') }}
          </button>
          <span v-if="lab.isRunning" class="text-xs text-text-muted">
            {{ $t('cachelab.progress', { done: lab.progress.done, total: lab.progress.total }) }}
          </span>
          <span v-if="lab.error" class="text-xs text-error">{{ lab.error }}</span>
        </div>
      </div>

      <!-- Diagnosis: what is volatile, and what it costs by sitting where it does -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4">
        <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cachelab.diagnosis.title') }}</h3>

        <div v-if="lab.volatileSegments.length === 0" class="flex gap-2 text-xs text-success">
          <Check class="h-4 w-4 shrink-0" />
          <p>{{ $t('cachelab.diagnosis.clean') }}</p>
        </div>

        <div v-else class="space-y-3">
          <div class="flex gap-2 text-xs text-warning">
            <TriangleAlert class="h-4 w-4 shrink-0" />
            <p>
              {{ $t('cachelab.diagnosis.found', { count: lab.volatileSegments.length }) }}
              <template v-if="forfeitedShare !== null">
                {{ $t('cachelab.diagnosis.forfeits', { share: formatPercent(forfeitedShare) }) }}
              </template>
            </p>
          </div>

          <ul class="flex flex-wrap gap-2">
            <li
              v-for="(seg, i) in lab.volatileSegments"
              :key="i"
              class="rounded border border-warning/40 bg-warning/10 px-2 py-1 font-mono text-[11px] text-text-primary"
            >
              <span class="text-warning">{{ $t('cachelab.kinds.' + seg.kind) }}</span>
              · {{ seg.text }}
            </li>
          </ul>

          <!-- Where the shared prefix dies -->
          <div class="overflow-x-auto rounded border border-border-default bg-surface p-2 font-mono text-[11px] leading-relaxed">
            <span class="text-success">{{ promptParts.before }}</span
            ><span class="bg-error/25 text-error">{{ promptParts.hot }}</span
            ><span class="text-text-muted">{{ promptParts.after.slice(0, 160) }}</span
            ><span v-if="promptParts.after.length > 160" class="text-text-muted">…</span>
          </div>
          <p class="text-[11px] text-text-muted">{{ $t('cachelab.diagnosis.legend') }}</p>
        </div>
      </div>

      <!-- Measured results -->
      <div v-if="rows.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-4">
        <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cachelab.results.title') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-text-muted">
              <tr class="border-b border-border-default">
                <th class="py-2 pe-2 font-medium">{{ $t('cachelab.results.layout') }}</th>
                <th class="py-2 pe-2 font-medium">{{ $t('cachelab.results.promptTokens') }}</th>
                <th class="py-2 pe-2 font-medium">{{ $t('cachelab.results.reused') }}</th>
                <th class="py-2 pe-2 font-medium">{{ $t('cachelab.results.evaluated') }}</th>
                <th class="py-2 pe-2 font-medium">{{ $t('cachelab.results.prefill') }}</th>
                <th class="py-2 font-medium">{{ $t('cachelab.results.reuse') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.key" class="border-b border-border-default/50">
                <td class="py-2 pe-2 font-medium text-text-secondary">{{ row.label }}</td>
                <td class="py-2 pe-2 font-mono text-text-primary">{{ row.probe!.promptTokens }}</td>
                <td class="py-2 pe-2 font-mono text-success">{{ row.probe!.cachedTokens ?? '—' }}</td>
                <td class="py-2 pe-2 font-mono text-warning">{{ row.probe!.evaluatedTokens }}</td>
                <td class="py-2 pe-2 font-mono text-text-primary">{{ fmtMs(row.probe!.prefillMs) }}</td>
                <td class="py-2">
                  <div v-if="row.probe!.reuse !== undefined" class="flex items-center gap-2">
                    <div class="h-1.5 w-24 overflow-hidden rounded-full bg-surface-overlay">
                      <div class="h-full bg-success" :style="{ width: (row.probe!.reuse * 100) + '%' }" />
                    </div>
                    <span class="font-mono text-text-primary">{{ formatPercent(row.probe!.reuse) }}</span>
                  </div>
                  <span v-else class="text-text-muted">{{ $t('cachelab.results.unreported') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- The verdict, measured rather than estimated -->
        <div
          v-if="lab.verdict"
          class="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-text-secondary"
        >
          <p class="font-medium text-text-primary">{{ $t('cachelab.verdict.title') }}</p>
          <p class="mt-1">
            {{
              $t('cachelab.verdict.body', {
                tokens: lab.verdict.tokensSaved,
                ms: fmtMs(lab.verdict.msSaved),
                speedup: lab.verdict.speedup.toFixed(2),
              })
            }}
          </p>
          <p class="mt-2 text-[11px] text-text-muted">{{ $t('cachelab.verdict.footnote') }}</p>
        </div>
      </div>

      <!-- The rewrite the lab measured -->
      <div
        v-if="lab.volatileSegments.length > 0"
        class="rounded-lg border border-border-default bg-surface-raised p-4"
      >
        <h3 class="mb-2 text-sm font-medium text-text-secondary">{{ $t('cachelab.rewrite.title') }}</h3>
        <p class="mb-2 text-[11px] text-text-muted">
          {{ $t('cachelab.rewrite.body', { chars: survivingPrefix }) }}
        </p>
        <pre class="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-border-default bg-surface p-2 font-mono text-[11px] text-text-primary">{{ lab.rewrittenPrompt }}</pre>
      </div>
    </div>
  </div>
</template>
