<script setup lang="ts">
/**
 * Runs: one tool's calls to the model, end to end, as a waterfall. Each call is split into the
 * phases Ollama reports; the gaps between calls are the agent's own time, tool time when the
 * model asked for tools. Click a row for what it sent and got back; every row has an address
 * (/runs?turn=<id>&row=call-3) that opens it again. The arithmetic is in services/runs.ts.
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChartGantt, Link2, ScanLine } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live-store'
import { fetchLiveTurnText } from '@/services/live-client'
import { answerOf, buildRuns, rowKey, runOfTurn, toolExchanges, type Run, type RunCall, type RunRow } from '@/services/runs'
import RequestViewer from '@/components/live/RequestViewer.vue'
import { formatNumber } from '@/utils/format'
import type { LiveTurnText } from '@/types/live'

const { t } = useI18n()
const live = useLiveStore()
const route = useRoute()
const router = useRouter()
onMounted(() => live.start())
onUnmounted(() => live.stop())

// Kept text, fetched once per turn as runs are opened. A plain reactive map: runs re-group when text arrives.
const texts = reactive(new Map<string, LiveTurnText>())
const fetched = new Set<string>()

const runs = computed<Run[]>(() => buildRuns(live.turns, texts as Map<string, LiveTurnText>))
const run = computed<Run | null>(() => {
  const id = route.query.run as string | undefined
  const turnId = route.query.turn as string | undefined
  return (id && runs.value.find((r) => r.id === id)) || (turnId && runOfTurn(runs.value, turnId)) || runs.value[0] || null
})
watch(
  run,
  async (r) => {
    for (const c of r?.calls ?? []) {
      if (!c.turn.textKept || fetched.has(c.turn.id)) continue
      fetched.add(c.turn.id)
      const kept = await fetchLiveTurnText(c.turn.id)
      if (kept) texts.set(c.turn.id, kept)
    }
  },
  { immediate: true },
)

const rows = computed(() => run.value?.steps.flatMap((s) => [{ kind: 'step' as const, n: s.n }, ...s.rows]) ?? [])
const selectedKey = computed<string | null>(() => {
  const r = run.value
  if (!r) return null
  const row = route.query.row as string | undefined
  if (row) return row
  const turnId = route.query.turn as string | undefined
  const call = turnId ? r.calls.find((c) => c.turn.id === turnId) : null
  return call ? rowKey(call) : null
})
const selected = computed<RunRow | null>(() => {
  const r = run.value
  if (!r || !selectedKey.value) return null
  return r.steps.flatMap((s) => s.rows).find((x) => rowKey(x) === selectedKey.value) ?? null
})

function openRun(r: Run) {
  void router.replace({ query: { run: r.id } })
}
function openRow(row: RunRow) {
  if (!run.value) return
  void router.replace({ query: { run: run.value.id, row: rowKey(row) } })
}

// ---- scale and formatting -------------------------------------------------

const span = computed(() => (run.value ? Math.max(1, run.value.end - run.value.start) : 1))
const pct = (ms: number) => (ms / span.value) * 100
const left = (start: number) => `${pct(start - (run.value?.start ?? 0))}%`
const width = (ms: number) => `${Math.max(0.3, pct(ms))}%`
function fmt(ms: number): string {
  if (ms >= 10_000) return `${Math.round(ms / 1000)} s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms)} ms`
}
const ticks = computed(() => Array.from({ length: 6 }, (_, k) => ({ at: (k / 5) * 100, label: fmt((span.value * k) / 5) })))
const PHASE_COLOR: Record<string, string> = { queue: '#94a3b8', load: '#e11d48', prompt: '#d97706', answer: '#7c3aed' }
function phaseShare(c: RunCall, ms: number): string {
  const total = c.phases.reduce((s, p) => s + p.ms, 0) || 1
  return `${(ms / total) * 100}%`
}
function share(c: RunCall): string {
  return c.cachedShare == null ? t('runs.noCount') : t('runs.cachedOp', { share: Math.round(c.cachedShare * 100) })
}
function toolsLabel(names: string[]): string {
  const unique = [...new Set(names)]
  return names.length > 3 ? t('runs.tools', { n: names.length, names: unique.join(', ') }) : names.join(', ')
}

// ---- detail ---------------------------------------------------------------

const tab = ref<'input' | 'output'>('input')
const raw = ref(false)
watch(selectedKey, () => { tab.value = 'input' })

const selectedCall = computed<RunCall | null>(() => (selected.value?.kind === 'call' ? selected.value : null))
const selectedText = computed(() => (selectedCall.value ? texts.get(selectedCall.value.turn.id) ?? null : null))
const answer = computed(() => (run.value && selectedCall.value ? answerOf(run.value, selectedCall.value.index, texts as Map<string, LiveTurnText>) : null))
const exchanges = computed(() => {
  const s = selected.value
  return run.value && s && s.kind !== 'call' ? toolExchanges(run.value, s.after, texts as Map<string, LiveTurnText>) : []
})
const evaluated = (c: RunCall) => c.turn.prompt.evaluated ?? Math.max(0, (c.turn.prompt.tokens ?? 0) - (c.turn.prompt.cached ?? 0))

const link = computed(() => (run.value && selectedKey.value ? `${location.origin}${router.resolve({ name: 'runs', query: { run: run.value.id, row: selectedKey.value } }).href}` : ''))
const copied = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(link.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
const pretty = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2))
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-[110rem] space-y-4">
      <div class="flex items-start gap-3">
        <ChartGantt class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('runs.title') }}</h2>
          <p class="mt-1 max-w-4xl text-sm text-text-muted">{{ $t('runs.subtitle') }}</p>
        </div>
      </div>

      <div v-if="!run" class="rounded-lg border border-border-default bg-surface-raised p-6 text-base text-text-secondary">
        {{ $t('runs.empty') }}
        <router-link to="/live" class="ms-2 text-accent underline">{{ $t('runs.emptyLink') }}</router-link>
      </div>

      <template v-else>
        <!-- Recent runs -->
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="text-text-secondary">{{ $t('runs.pick') }}</span>
          <button
            v-for="r in runs.slice(0, 8)"
            :key="r.id"
            type="button"
            class="rounded-md border px-2.5 py-1 text-text-primary"
            :class="r.id === run.id ? 'border-accent bg-accent/10' : 'border-border-default bg-surface-raised hover:bg-surface-overlay'"
            @click="openRun(r)"
          >
            {{ $t('runs.pickRow', { client: r.clientLabel, calls: r.calls.length, duration: fmt(r.end - r.start) }) }}
          </button>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,34%)]">
          <!-- Waterfall -->
          <div class="min-w-0 rounded-lg border border-border-default bg-surface-raised">
            <div class="p-4">
              <h3 class="text-base font-semibold text-text-primary">{{ run.clientLabel }}</h3>
              <p class="text-sm text-text-muted">{{ new Date(run.start).toLocaleString() }} · {{ run.models.join(', ') }}</p>
              <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div><div class="text-text-muted">{{ $t('runs.facts.duration') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ fmt(run.end - run.start) }}</div></div>
                <div><div class="text-text-muted">{{ $t('runs.facts.calls') }}</div><div class="font-semibold text-text-primary">{{ run.calls.length }} <span class="font-normal text-text-secondary">{{ $t('runs.facts.callsSteps', { n: run.steps.length }) }}</span></div></div>
                <div><div class="text-text-muted">{{ $t('runs.facts.tokens') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ $t('runs.facts.tokensValue', { in: formatNumber(run.tokensIn), out: formatNumber(run.tokensOut) }) }}</div></div>
                <div><div class="text-text-muted">{{ $t('runs.facts.cached') }}</div><div class="font-semibold text-text-primary">{{ run.tokensIn ? $t('runs.facts.cachedValue', { share: Math.round((run.cachedTokens / run.tokensIn) * 100) }) : '—' }}</div></div>
                <div><div class="text-text-muted">{{ $t('runs.facts.model') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ fmt(run.modelMs) }}</div></div>
                <div><div class="text-text-muted">{{ $t('runs.facts.outside') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ fmt(Math.max(0, run.end - run.start - run.modelMs)) }}</div></div>
              </div>
              <div class="mt-3 space-y-1.5 text-sm text-text-primary">
                <p v-if="run.findings.loadMs > 1000" class="rounded-md bg-warning/10 px-3 py-1.5">{{ $t('runs.finding.load', { seconds: (run.findings.loadMs / 1000).toFixed(1), share: Math.round((run.findings.loadMs / (run.end - run.start)) * 100) }) }}</p>
                <p v-if="run.findings.emptyCache" class="rounded-md bg-warning/10 px-3 py-1.5">{{ $t('runs.finding.empty', { n: run.findings.emptyCache, seconds: (run.findings.emptyCachePrefillMs / 1000).toFixed(1) }) }}</p>
                <p v-if="run.findings.rejected" class="rounded-md bg-error/10 px-3 py-1.5">{{ $t('runs.finding.rejected', { n: run.findings.rejected }) }}</p>
                <p v-if="run.findings.errors" class="rounded-md bg-error/10 px-3 py-1.5">{{ $t('runs.finding.errors', { n: run.findings.errors }) }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-border-default px-4 py-2 text-xs text-text-secondary">
              <span v-for="k in ['queue', 'load', 'prompt', 'answer']" :key="k"><i class="rn-key" :style="{ background: PHASE_COLOR[k] }" />{{ $t(`runs.legend.${k}`) }}</span>
              <span><i class="rn-key" style="background: #0d9488" />{{ $t('runs.legend.tools') }}</span>
              <span><i class="rn-key" style="background: #cbd5e1" />{{ $t('runs.legend.agent') }}</span>
            </div>

            <div class="border-t border-border-default text-sm">
              <div class="rn-grid border-b border-border-default text-xs text-text-muted">
                <div class="px-3 py-1.5">{{ $t('runs.head.step') }}</div>
                <div class="px-2 py-1.5">{{ $t('runs.head.operation') }}</div>
                <div class="relative h-7">
                  <span v-for="(k, i) in ticks" :key="i" class="absolute top-1.5 whitespace-nowrap tabular-nums" :style="{ left: `${k.at}%`, transform: i === 0 ? 'none' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }">{{ k.label }}</span>
                </div>
              </div>

              <template v-for="(row, i) in rows" :key="i">
                <div v-if="row.kind === 'step'" class="rn-grid border-b border-border-default bg-surface-overlay/40 text-xs font-semibold text-text-secondary">
                  <div class="px-3 py-1.5">{{ $t('runs.step', { n: row.n }) }}<span v-if="row.n > 1" class="font-normal"> · {{ $t('runs.stepFresh') }}</span></div>
                  <div /><div />
                </div>
                <button
                  v-else
                  type="button"
                  class="rn-grid w-full border-b border-border-default text-start hover:bg-surface-overlay/60"
                  :class="selectedKey === rowKey(row) ? 'bg-accent/10' : ''"
                  @click="openRow(row)"
                >
                  <template v-if="row.kind === 'call'">
                    <div class="flex min-w-0 items-center gap-2 px-3 py-1.5">
                      <i class="h-2 w-2 shrink-0 rounded-full" style="background: #7c3aed" />
                      <span class="truncate text-text-primary">{{ $t('runs.call', { n: row.index + 1 }) }}</span>
                      <span v-for="f in row.flags" :key="f" class="whitespace-nowrap text-xs font-semibold text-error">{{ $t(`runs.flag.${f}`) }}</span>
                    </div>
                    <div class="truncate px-2 font-mono text-xs text-text-secondary">{{ share(row) }}</div>
                    <div class="relative h-8">
                      <div class="absolute top-2 flex h-4 overflow-hidden rounded" :style="{ left: left(row.start), width: width(row.ms) }">
                        <i v-for="p in row.phases.filter((x) => x.ms > 0)" :key="p.key" class="block h-full" :style="{ width: phaseShare(row, p.ms), background: PHASE_COLOR[p.key] }" />
                      </div>
                      <span class="rn-ms" :style="pct(row.start - run.start + row.ms) < 88 ? { left: `calc(${left(row.start)} + ${width(row.ms)} + 0.35rem)` } : { right: `calc(${100 - pct(row.start - run.start)}% + 0.35rem)` }">{{ fmt(row.ms) }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex min-w-0 items-center gap-2 py-1.5 ps-7 pe-3">
                      <i class="h-2 w-2 shrink-0 rounded-full" :style="{ background: row.kind === 'tools' ? '#0d9488' : '#cbd5e1' }" />
                      <span class="truncate text-text-primary">{{ row.kind === 'tools' ? toolsLabel(row.tools) : $t('runs.agent') }}</span>
                    </div>
                    <div class="truncate px-2 font-mono text-xs text-text-secondary">{{ row.kind }}</div>
                    <div class="relative h-8">
                      <div class="absolute top-2 h-4 rounded" :style="{ left: left(row.start), width: width(row.ms), background: row.kind === 'tools' ? '#0d9488' : '#cbd5e1' }" />
                      <span class="rn-ms" :style="pct(row.start - run.start + row.ms) < 88 ? { left: `calc(${left(row.start)} + ${width(row.ms)} + 0.35rem)` } : { right: `calc(${100 - pct(row.start - run.start)}% + 0.35rem)` }">{{ fmt(row.ms) }}</span>
                    </div>
                  </template>
                </button>
              </template>
            </div>
          </div>

          <!-- Detail -->
          <div class="min-w-0 self-start rounded-lg border border-border-default bg-surface-raised xl:sticky xl:top-0">
            <p v-if="!selected" class="p-4 text-sm text-text-muted">{{ $t('runs.detail.none') }}</p>

            <template v-else>
              <div class="border-b border-border-default p-4 text-sm">
                <!-- A call -->
                <template v-if="selectedCall">
                  <h3 class="flex items-center gap-2 text-base font-semibold text-text-primary">
                    {{ $t('runs.call', { n: selectedCall.index + 1 }) }}
                    <span class="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">{{ selectedCall.turn.model }}</span>
                  </h3>
                  <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><div class="text-text-muted">{{ $t('runs.detail.wall') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ fmt(selectedCall.ms) }}</div></div>
                    <div><div class="text-text-muted">{{ $t('runs.detail.prompt') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ $t('runs.detail.promptValue', { tokens: formatNumber(selectedCall.turn.prompt.tokens ?? 0) }) }} <span class="font-normal text-text-secondary">{{ selectedCall.cachedShare != null ? $t('runs.detail.cachedShare', { share: Math.round(selectedCall.cachedShare * 100) }) : '' }}</span></div></div>
                    <div><div class="text-text-muted">{{ $t('runs.detail.answer') }}</div><div class="font-semibold tabular-nums text-text-primary">{{ $t('runs.detail.answerValue', { tokens: formatNumber(selectedCall.turn.gen.tokens ?? 0) }) }} <span class="font-normal text-text-secondary">{{ selectedCall.turn.gen.tps != null ? $t('runs.detail.rate', { tps: selectedCall.turn.gen.tps }) : '' }}</span></div></div>
                    <div><div class="text-text-muted">{{ $t('runs.detail.toolsAsked') }}</div><div class="font-semibold text-text-primary">{{ selectedCall.turn.toolCalls.length }}</div></div>
                  </div>
                  <div class="mt-3 flex h-5 overflow-hidden rounded">
                    <i v-for="p in selectedCall.phases.filter((x) => x.ms > 0)" :key="p.key" class="block h-full" :style="{ width: phaseShare(selectedCall, p.ms), background: PHASE_COLOR[p.key] }" />
                  </div>
                  <div class="mt-2 grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5">
                    <template v-for="p in selectedCall.phases" :key="p.key">
                      <i class="rn-key mt-1" :style="{ background: PHASE_COLOR[p.key] }" />
                      <span class="text-text-secondary">{{ $t(`runs.detail.phase.${p.key}`, { tokens: formatNumber(p.key === 'prompt' ? evaluated(selectedCall) : selectedCall.turn.gen.tokens ?? 0) }) }}</span>
                      <span class="text-end tabular-nums text-text-primary">{{ p.ms ? fmt(p.ms) : '' }}</span>
                    </template>
                  </div>
                  <p v-if="selectedCall.turn.prefix && !selectedCall.turn.prefix.identical && selectedCall.turn.prefix.breakTokensEst" class="mt-2 text-text-secondary">
                    {{ $t('runs.detail.break', { tokens: formatNumber(selectedCall.turn.prefix.breakTokensEst) }) }}
                  </p>
                </template>

                <!-- A gap -->
                <template v-else-if="selected.kind !== 'call'">
                  <h3 class="flex items-center gap-2 text-base font-semibold text-text-primary">
                    {{ selected.kind === 'tools' ? toolsLabel(selected.tools) : $t('runs.agent') }}
                    <span class="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">{{ $t('runs.detail.after', { n: selected.after + 1 }) }}</span>
                  </h3>
                  <p class="mt-2 text-lg font-semibold tabular-nums text-text-primary">{{ fmt(selected.ms) }}</p>
                  <p class="mt-1 text-text-secondary">{{ selected.kind === 'tools' ? $t('runs.detail.toolsMeasured') : $t('runs.detail.agentOnly') }}</p>
                </template>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <code class="min-w-0 break-all rounded border border-border-default bg-surface-overlay px-1.5 py-0.5 text-xs text-text-secondary">{{ link }}</code>
                  <button type="button" class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-text-primary hover:bg-surface-overlay" @click="copyLink">
                    <Link2 class="h-3.5 w-3.5" />{{ copied ? $t('runs.detail.copied') : $t('runs.detail.copy') }}
                  </button>
                  <router-link v-if="selectedCall" :to="{ name: 'xray', query: { turn: selectedCall.turn.id } }" class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-text-primary hover:bg-surface-overlay">
                    <ScanLine class="h-3.5 w-3.5" />{{ $t('runs.detail.xray') }}
                  </router-link>
                </div>
              </div>

              <!-- What was sent and what came back -->
              <div class="p-4 text-sm">
                <template v-if="selectedCall">
                  <div class="mb-3 flex items-center gap-1 border-b border-border-default">
                    <button v-for="k in (['input', 'output'] as const)" :key="k" type="button" class="-mb-px border-b-2 px-2 py-1.5" :class="tab === k ? 'border-accent font-semibold text-text-primary' : 'border-transparent text-text-secondary'" @click="tab = k">{{ $t(`runs.detail.${k}`) }}</button>
                  </div>
                  <p v-if="!selectedCall.turn.textKept" class="text-text-muted">{{ $t('runs.detail.noText') }}</p>
                  <template v-else-if="tab === 'input'">
                    <RequestViewer
                      v-if="selectedText"
                      :request="selectedText.request"
                      :protocol="selectedCall.turn.protocol"
                      :break-char="selectedCall.turn.prefix && !selectedCall.turn.prefix.identical ? selectedCall.turn.prefix.breakChar : null"
                      :prompt-tokens="selectedCall.turn.prompt.tokens"
                    />
                  </template>
                  <template v-else>
                    <div class="mb-2 flex justify-end">
                      <div class="inline-flex overflow-hidden rounded-md border border-border-default text-xs">
                        <button type="button" class="px-2 py-1" :class="!raw ? 'bg-text-primary text-surface-raised' : 'text-text-secondary'" @click="raw = false">{{ $t('runs.detail.pretty') }}</button>
                        <button type="button" class="px-2 py-1" :class="raw ? 'bg-text-primary text-surface-raised' : 'text-text-secondary'" @click="raw = true">{{ $t('runs.detail.raw') }}</button>
                      </div>
                    </div>
                    <p v-if="!answer" class="text-text-muted">{{ $t('runs.detail.noAnswer') }}</p>
                    <pre v-else-if="raw" class="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded bg-surface-overlay p-3 font-mono text-xs text-text-primary">{{ JSON.stringify(answer, null, 2) }}</pre>
                    <div v-else class="space-y-2">
                      <details v-if="answer.thinking" class="rounded border border-border-default">
                        <summary class="cursor-pointer px-3 py-1.5 text-xs font-semibold text-text-secondary">{{ $t('runs.detail.thinking') }}</summary>
                        <pre class="whitespace-pre-wrap break-words px-3 pb-2 font-mono text-xs text-text-secondary">{{ answer.thinking }}</pre>
                      </details>
                      <pre class="whitespace-pre-wrap break-words rounded border border-border-default p-3 text-sm text-text-primary">{{ answer.content || $t('runs.detail.emptyAnswer') }}</pre>
                      <div v-for="(c, k) in answer.toolCalls" :key="k" class="rounded border border-border-default">
                        <div class="border-b border-border-default px-3 py-1 text-xs font-semibold text-accent">{{ $t('runs.detail.asked', { name: c.name }) }}</div>
                        <pre class="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-text-primary">{{ pretty(c.arguments) }}</pre>
                      </div>
                    </div>
                  </template>
                </template>

                <template v-else>
                  <div class="mb-2 flex justify-end">
                    <div class="inline-flex overflow-hidden rounded-md border border-border-default text-xs">
                      <button type="button" class="px-2 py-1" :class="!raw ? 'bg-text-primary text-surface-raised' : 'text-text-secondary'" @click="raw = false">{{ $t('runs.detail.pretty') }}</button>
                      <button type="button" class="px-2 py-1" :class="raw ? 'bg-text-primary text-surface-raised' : 'text-text-secondary'" @click="raw = true">{{ $t('runs.detail.raw') }}</button>
                    </div>
                  </div>
                  <p v-if="!exchanges.length" class="text-text-muted">{{ $t('runs.detail.agentOnly') }}</p>
                  <pre v-else-if="raw" class="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded bg-surface-overlay p-3 font-mono text-xs text-text-primary">{{ JSON.stringify(exchanges, null, 2) }}</pre>
                  <div v-else class="space-y-2">
                    <div v-for="(x, k) in exchanges" :key="k" class="space-y-1">
                      <div class="rounded border border-border-default">
                        <div class="border-b border-border-default px-3 py-1 text-xs font-semibold text-accent">{{ $t('runs.detail.asked', { name: x.name }) }}</div>
                        <pre class="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-text-primary">{{ x.arguments == null ? '—' : pretty(x.arguments) }}</pre>
                      </div>
                      <div class="rounded border border-border-default">
                        <div class="border-b border-border-default px-3 py-1 text-xs font-semibold text-success">{{ $t('runs.detail.result') }}</div>
                        <pre class="max-h-72 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-text-primary">{{ x.result ?? $t('runs.detail.noResult') }}</pre>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <p class="max-w-4xl text-sm text-text-muted">{{ $t('runs.foot') }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.rn-grid {
  display: grid;
  grid-template-columns: minmax(13rem, 30%) 8rem minmax(0, 1fr);
  align-items: center;
}
.rn-key {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 0.2rem;
  margin-inline-end: 0.35rem;
  vertical-align: -1px;
}
.rn-ms {
  position: absolute;
  top: 0.45rem;
  font-size: 0.75rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}
</style>
