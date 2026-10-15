<script setup lang="ts">
/**
 * The shared box: what each tool asked the daemon for and what it cost the
 * others. Reads the same turns the Live page records; the attribution is in
 * services/ledger.ts and stated on the page in plain words.
 */
import { computed, onMounted, onUnmounted } from 'vue'
import { Users } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live-store'
import { buildLedger, type LedgerRow } from '@/services/ledger'
import { formatDuration, formatNumber } from '@/utils/format'

const live = useLiveStore()
onMounted(() => live.start())
onUnmounted(() => live.stop())

const ledger = computed(() => buildLedger(live.turns))
const modelCount = computed(() => new Set(live.turns.map((t) => t.model)).size)

function fmtMs(ms: number): string {
  if (ms >= 60_000) {
    const m = Math.floor(ms / 60_000)
    const s = Math.round((ms % 60_000) / 1000)
    return s ? `${m} min ${s} s` : `${m} min`
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : `${Math.round(ms)} ms`
}
function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function tone(r: LedgerRow): 'bad' | 'warn' | 'good' {
  if (r.costToOthersMs >= 30_000) return 'bad'
  if (r.costToOthersMs > 0 || r.fix) return 'warn'
  return 'good'
}
function suggestedCtx(r: LedgerRow): string {
  const p = r.maxPromptTokens ?? 2048
  const pow = Math.max(2048, 2 ** Math.ceil(Math.log2(p * 2)))
  return formatNumber(pow)
}
function whoList(r: LedgerRow): string {
  return r.waitedBehind.map((w) => `${w.clientLabel} (${fmtMs(w.ms)})`).join(', ')
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <div class="flex items-start gap-3">
        <Users class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('ledger.title') }}</h2>
          <p class="mt-1 max-w-4xl text-sm text-text-muted">{{ $t('ledger.subtitle') }}</p>
        </div>
      </div>

      <div v-if="!ledger" class="rounded-lg border border-border-default bg-surface-raised p-6 text-base text-text-secondary">
        {{ $t('ledger.empty') }}
        <router-link to="/live" class="ms-2 text-accent underline">{{ $t('ledger.emptyLink') }}</router-link>
      </div>

      <template v-else>
        <!-- The one sentence -->
        <p class="max-w-4xl text-lg text-text-primary">
          <template v-if="ledger.rows.length === 1">{{ $t('ledger.lead.one', { models: $t('ledger.models', { n: modelCount }, modelCount), span: formatDuration(ledger.to - ledger.from) }) }}</template>
          <template v-else-if="ledger.totalCostMs === 0">{{ $t('ledger.lead.fine', { tools: ledger.rows.length, models: $t('ledger.models', { n: modelCount }, modelCount), span: formatDuration(ledger.to - ledger.from) }) }}</template>
          <template v-else>{{ $t('ledger.lead.cost', { tools: ledger.rows.length, models: $t('ledger.models', { n: modelCount }, modelCount), span: formatDuration(ledger.to - ledger.from), cost: fmtMs(ledger.totalCostMs) }) }}</template>
        </p>

        <!-- Who cost whom -->
        <section>
          <h3 class="text-base font-semibold text-text-primary">{{ $t('ledger.rows.title') }}</h3>
          <p class="mb-2 max-w-4xl text-sm text-text-muted">{{ $t('ledger.rows.hint') }}</p>
          <div class="rounded-lg border border-border-default bg-surface-raised px-4">
            <div
              v-for="r in ledger.rows"
              :key="r.clientId"
              class="grid items-start gap-4 border-t border-border-default/60 py-3 first:border-t-0"
              style="grid-template-columns: 11rem 1fr 11rem"
            >
              <div>
                <div class="text-base font-semibold text-text-primary">{{ r.clientLabel }}</div>
                <div class="text-sm text-text-muted">{{ $t('ledger.rows.requests', { n: r.requests }, r.requests) }} · {{ r.models.join(', ') }}</div>
              </div>

              <div class="max-w-3xl space-y-1 text-base text-text-primary">
                <p v-if="r.unloadsEveryTime">
                  {{ $t('ledger.rows.keepAliveZero', { n: r.reloadsCausedForOthers }, r.reloadsCausedForOthers) }}
                  <span class="block text-sm text-text-muted">{{ $t('ledger.rows.keepAliveZeroFix') }}</span>
                </p>
                <p v-if="r.fix === 'context'">
                  {{ $t('ledger.rows.context', { context: formatNumber(r.maxContext ?? 0), prompt: formatNumber(r.maxPromptTokens ?? 0) }) }}
                  <span class="block text-sm text-text-muted">{{ $t('ledger.rows.contextFix', { suggested: suggestedCtx(r) }) }}</span>
                </p>
                <p v-if="r.waitedMs > 0" class="text-sm text-text-secondary">{{ $t('ledger.rows.waited', { ms: fmtMs(r.waitedMs), who: whoList(r) }) }}</p>
                <p v-if="r.reloadsPaidMs > 0" class="text-sm text-text-secondary">{{ $t('ledger.rows.paidReloads', { ms: fmtMs(r.reloadsPaidMs) }) }}</p>
                <p v-if="!r.unloadsEveryTime && r.fix !== 'context' && r.costToOthersMs === 0">{{ $t('ledger.rows.fine') }}</p>
              </div>

              <div class="text-end tabular-nums">
                <span class="block text-2xl font-semibold" :class="tone(r) === 'bad' ? 'text-error' : tone(r) === 'warn' ? 'text-warning' : 'text-success'">{{ fmtMs(r.costToOthersMs) }}</span>
                <span class="text-sm text-text-muted">{{ r.costToOthersMs > 0 ? $t('ledger.rows.costToOthers') : $t('ledger.rows.noCost') }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Slots -->
        <section>
          <h3 class="text-base font-semibold text-text-primary">{{ $t('ledger.slots.title') }}</h3>
          <p class="mb-2 max-w-4xl text-sm text-text-muted">{{ $t('ledger.slots.hint') }}</p>
          <div class="rounded-lg border border-border-default bg-surface-raised p-4 text-base text-text-primary">
            <p v-if="ledger.slots.max == null" class="text-text-muted">{{ $t('ledger.slots.unknown') }}</p>
            <template v-else>
              <p v-if="!ledger.slots.changes.length">{{ $t('ledger.slots.steady', { n: ledger.slots.max }) }}</p>
              <p v-for="c in ledger.slots.changes" :key="c.at" :class="c.to < c.from ? 'text-warning' : ''">
                {{ $t('ledger.slots.change', { from: c.from, to: c.to, time: fmtTime(c.at), client: c.clientLabel, model: formatNumber(Math.round((live.turns.find((t) => t.at === c.at)?.prompt.contextRequested) ?? 0)) }) }}
              </p>
            </template>
          </div>
        </section>

        <!-- Events -->
        <section>
          <h3 class="text-base font-semibold text-text-primary">{{ $t('ledger.events.title') }}</h3>
          <p class="mb-2 max-w-4xl text-sm text-text-muted">{{ $t('ledger.events.hint') }}</p>
          <div class="rounded-lg border border-border-default bg-surface-raised px-4">
            <p v-if="!ledger.events.length" class="py-3 text-text-muted">{{ $t('ledger.events.none') }}</p>
            <div v-for="(e, i) in ledger.events.slice(-60)" :key="i" class="grid gap-4 border-t border-border-default/60 py-2 text-base first:border-t-0" style="grid-template-columns: 6rem 1fr">
              <span class="text-sm text-text-muted tabular-nums">{{ fmtTime(e.at) }}</span>
              <span>
                <span :class="e.kind === 'load' ? 'text-warning' : 'text-error'">{{ e.kind === 'load' ? $t('ledger.events.load', { client: e.clientLabel, ms: fmtMs(e.ms), model: e.model }) : $t('ledger.events.wait', { client: e.clientLabel, ms: fmtMs(e.ms) }) }}</span>
                <span class="text-text-secondary">
                  <template v-if="e.kind === 'load' && e.cause === 'keepalive'"> {{ $t('ledger.events.causeKeepalive', { by: e.byClientLabel ?? e.clientLabel }) }}</template>
                  <template v-else-if="e.kind === 'load' && e.cause === 'switch'"> {{ $t('ledger.events.causeSwitch', { by: e.byClientLabel ?? e.clientLabel }) }}</template>
                  <template v-else-if="e.kind === 'load' && e.cause === 'idle'"> {{ $t('ledger.events.causeIdle') }}</template>
                  <template v-else-if="e.kind === 'load'"> {{ $t('ledger.events.causeFirst') }}</template>
                  <template v-else-if="e.byClientLabel"> {{ $t('ledger.events.behind', { by: e.byClientLabel }) }}</template>
                </span>
              </span>
            </div>
          </div>
        </section>

        <p class="max-w-4xl text-sm text-text-muted">{{ $t('ledger.foot') }}</p>
      </template>
    </div>
  </div>
</template>
