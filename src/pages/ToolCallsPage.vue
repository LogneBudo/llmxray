<script setup lang="ts">
/**
 * Tool-call fidelity: twelve request shapes agents send, scored per model on
 * what the daemon returned. Cases in data/tool-fidelity/cases.ts, scoring in
 * services/tool-fidelity.ts; this page only runs and shows.
 */
import { computed, onMounted, ref } from 'vue'
import { Wrench } from '@lucide/vue'
import { useModelStore } from '@/stores/model-store'
import { TOOL_CASES } from '@/data/tool-fidelity/cases'
import { runToolFidelity, summarise, type CaseResult, type Outcome } from '@/services/tool-fidelity'

const modelStore = useModelStore()
onMounted(() => {
  if (!modelStore.models.length) void modelStore.fetchModels()
  restore()
})

const toolModels = computed(() => modelStore.modelNames.filter((n) => modelStore.getCapabilities(n).includes('tools')))
const otherModels = computed(() => modelStore.chatModelNames.filter((n) => !toolModels.value.includes(n)))
const picked = ref<Set<string>>(new Set())
function toggle(name: string) {
  const s = new Set(picked.value)
  if (s.has(name)) s.delete(name)
  else s.add(name)
  picked.value = s
}

const results = ref<CaseResult[]>([])
const running = ref(false)
const done = ref(0)
const total = ref(0)
let abort: AbortController | null = null

const STORE_KEY = 'llmxray-toolcalls-last'
function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) results.value = JSON.parse(raw) as CaseResult[]
  } catch {
    /* nothing kept */
  }
}
function keep() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(results.value))
  } catch {
    /* storage blocked: the results stay on screen */
  }
}

async function run() {
  if (!picked.value.size || running.value) return
  running.value = true
  results.value = []
  done.value = 0
  total.value = picked.value.size * TOOL_CASES.length
  abort = new AbortController()
  runOrder.value = [...picked.value]
  await runToolFidelity(runOrder.value, TOOL_CASES, {
    onResult: (r, d) => {
      results.value = [...results.value, r]
      done.value = d
    },
  }, abort.signal)
  running.value = false
  keep()
}
function stop() {
  abort?.abort()
}

const summaries = computed(() => summarise(results.value))
const runOrder = ref<string[]>([])
const models = computed(() => (running.value ? runOrder.value : summaries.value.map((s) => s.model)))
function summaryOf(model: string) {
  return summaries.value.find((s) => s.model === model)
}
/** The cell being worked on right now: results arrive model by model, case by case. */
const current = computed<{ model: string; caseId: string } | null>(() => {
  if (!running.value) return null
  const i = results.value.length
  const model = runOrder.value[Math.floor(i / TOOL_CASES.length)]
  const c = TOOL_CASES[i % TOOL_CASES.length]
  return model && c ? { model, caseId: c.id } : null
})
function cell(caseId: string, model: string): CaseResult | undefined {
  return results.value.find((r) => r.caseId === caseId && r.model === model)
}
const selected = ref<CaseResult | null>(null)

const TONE: Record<Outcome, string> = {
  valid: 'bg-success/80',
  'wrong-tool': 'bg-error/80',
  'hallucinated-tool': 'bg-error/80',
  'missing-args': 'bg-warning/80',
  'bad-args': 'bg-warning/80',
  'in-prose': 'bg-error/60',
  'no-call': 'bg-error/60',
  'unneeded-call': 'bg-warning/60',
  'wrong-count': 'bg-warning/60',
  error: 'bg-surface-overlay',
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <div class="flex items-start gap-3">
        <Wrench class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('toolcalls.title') }}</h2>
          <p class="mt-1 max-w-4xl text-sm text-text-muted">{{ $t('toolcalls.subtitle') }}</p>
        </div>
      </div>

      <!-- Models -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4">
        <h3 class="text-base font-semibold text-text-primary">{{ $t('toolcalls.models') }}</h3>
        <p class="mb-2 text-sm text-text-muted">{{ $t('toolcalls.modelsHint') }}</p>
        <div class="flex flex-wrap gap-2">
          <label v-for="n in [...toolModels, ...otherModels]" :key="n" class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-base" :class="picked.has(n) ? 'border-accent bg-accent/10 text-text-primary' : 'border-border-default text-text-secondary'">
            <input type="checkbox" class="h-4 w-4" :checked="picked.has(n)" :disabled="running" @change="toggle(n)" />
            {{ n }}<span v-if="!toolModels.includes(n)" class="text-xs text-text-muted">?</span>
          </label>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button v-if="!running" class="rounded-md bg-accent px-4 py-2 text-base font-medium text-white disabled:opacity-50" :disabled="!picked.size" @click="run">
            {{ $t('toolcalls.run', { n: TOOL_CASES.length, m: picked.size }, picked.size) }}
          </button>
          <template v-else>
            <span class="text-base text-text-secondary">{{ $t('toolcalls.running', { done, total }) }}</span>
            <span class="h-2 w-48 overflow-hidden rounded bg-surface-overlay" role="progressbar" :aria-valuenow="done" :aria-valuemax="total"><span class="block h-full bg-accent transition-[width] duration-300" :style="{ width: `${total ? (done / total) * 100 : 0}%` }" /></span>
            <button class="rounded-md border border-border-default px-3 py-1.5 text-base text-text-secondary" @click="stop">{{ $t('toolcalls.stop') }}</button>
          </template>
          <span v-if="!picked.size && !running" class="text-sm text-text-muted">{{ $t('toolcalls.noModels') }}</span>
        </div>
      </div>

      <!-- Results -->
      <div v-if="results.length || running" class="rounded-lg border border-border-default bg-surface-raised p-4">
        <h3 class="text-base font-semibold text-text-primary">{{ $t('toolcalls.results.title') }}</h3>
        <p class="mb-3 text-sm text-text-muted">{{ $t('toolcalls.results.legend') }}</p>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-base">
            <thead>
              <tr>
                <th class="py-2 pe-4 text-start font-medium text-text-secondary"></th>
                <th v-for="m in models" :key="m" class="min-w-[9rem] px-2 py-2 text-center">
                  <div class="font-semibold text-text-primary">{{ m }}</div>
                  <div v-if="summaryOf(m) && (!running || current?.model !== m)" class="text-sm" :class="summaryOf(m)!.score >= 80 ? 'text-success' : summaryOf(m)!.score >= 50 ? 'text-warning' : 'text-error'">{{ $t('toolcalls.results.score', { n: summaryOf(m)!.score }) }}</div>
                  <div v-else-if="running && current?.model === m" class="text-sm text-accent">{{ $t('toolcalls.results.working') }}</div>
                  <div v-else class="text-sm text-text-muted">{{ $t('toolcalls.results.queued') }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="c in TOOL_CASES" :key="c.id">
              <tr class="border-t border-border-default/60">
                <td class="py-2 pe-4">
                  <div class="text-text-primary">{{ c.title }}</div>
                  <div class="text-sm text-text-muted">{{ c.why }}</div>
                </td>
                <td v-for="m in models" :key="m" class="px-2 py-2 text-center">
                  <button
                    v-if="cell(c.id, m)"
                    type="button"
                    class="h-9 w-full rounded-md text-sm font-medium text-white"
                    :class="[TONE[cell(c.id, m)!.outcome], selected === cell(c.id, m) ? 'ring-2 ring-white' : '']"
                    :title="cell(c.id, m)!.detail"
                    @click="selected = selected === cell(c.id, m) ? null : cell(c.id, m)!"
                  >
                    {{ $t(`toolcalls.outcome.${cell(c.id, m)!.outcome}`) }}
                  </button>
                  <span v-else-if="current && current.model === m && current.caseId === c.id" class="tc-working flex h-9 w-full items-center justify-center gap-2 rounded-md border border-accent/60 text-sm text-accent" :aria-label="$t('toolcalls.results.working')">
                    <span class="tc-dot" /><span class="tc-dot" /><span class="tc-dot" />
                  </span>
                  <span v-else class="flex h-9 w-full items-center justify-center rounded-md border border-dashed border-border-default text-sm text-text-muted">{{ $t('toolcalls.results.queued') }}</span>
                </td>
              </tr>
              <tr v-if="selected && selected.caseId === c.id">
                <td :colspan="models.length + 1" class="pb-3">
                  <div class="rounded-md border border-accent/40 bg-surface p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h4 class="text-base font-semibold text-text-primary">{{ selected.model }} · {{ $t(`toolcalls.outcome.${selected.outcome}`) }}</h4>
                        <p class="mt-1 text-base text-text-secondary">{{ selected.detail }} <span class="text-text-muted">· {{ $t('toolcalls.detail.ms', { ms: Math.round(selected.ms) }) }}</span></p>
                      </div>
                      <button type="button" class="rounded-md border border-border-default px-2 py-1 text-sm text-text-secondary" @click="selected = null">{{ $t('toolcalls.detail.close') }}</button>
                    </div>
                    <div class="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <p class="text-sm font-medium text-text-secondary">{{ $t('toolcalls.detail.calls') }}</p>
                        <pre v-if="selected.calls.length" class="mt-1 max-h-72 overflow-auto rounded bg-surface-overlay p-3 text-sm text-text-primary">{{ JSON.stringify(selected.calls, null, 2) }}</pre>
                        <p v-else class="mt-1 text-sm text-text-muted">{{ $t('toolcalls.detail.noCalls') }}</p>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-text-secondary">{{ $t('toolcalls.detail.content') }}</p>
                        <pre v-if="selected.content" class="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-surface-overlay p-3 text-sm text-text-primary">{{ selected.content }}</pre>
                        <p v-else class="mt-1 text-sm text-text-muted">{{ selected.calls.length ? $t('toolcalls.detail.noContentCall') : $t('toolcalls.detail.noContent') }}</p>
                      </div>
                      <div v-if="selected.thinking" class="md:col-span-2">
                        <p class="text-sm font-medium text-text-secondary">{{ $t('toolcalls.detail.thinking') }}</p>
                        <pre class="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-surface-overlay p-3 text-sm text-text-secondary">{{ selected.thinking }}</pre>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>

        <p class="mt-3 text-sm text-text-muted">{{ $t('toolcalls.saved') }}</p>
      </div>

      <p class="max-w-4xl text-sm text-text-muted">{{ $t('toolcalls.foot') }}</p>
    </div>
  </div>
</template>

<style scoped>
.tc-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: currentColor;
  animation: tc-pulse 1.2s ease-in-out infinite;
}
.tc-dot:nth-child(2) { animation-delay: 0.2s; }
.tc-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes tc-pulse {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-0.2rem); }
}
@media (prefers-reduced-motion: reduce) {
  .tc-dot { animation: none; opacity: 0.8; }
}
</style>
