<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Radio, Copy, Check, Pause, Play, Trash2, TriangleAlert, Info } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live-store'
import RequestViewer from '@/components/live/RequestViewer.vue'
import { cacheShare, cacheFixSavingMs, messageTokensEst } from '@/services/live-findings'
import { formatDuration, formatNumber } from '@/utils/format'
import type { LiveTurn } from '@/types/live'

const { tm, rt } = useI18n()
const live = useLiveStore()

onMounted(() => live.start())
onUnmounted(() => live.stop())

// ---- setup / empty state -------------------------------------------------

type TabKey = 'copilot' | 'webui' | 'continue' | 'n8n' | 'code'
const TABS: TabKey[] = ['copilot', 'webui', 'continue', 'n8n', 'code']
const tab = ref<TabKey>('copilot')
const copied = ref(false)

const dockerAddress = computed(() => live.address.replace(/\/\/[^:]+:/, '//host.docker.internal:'))
const hostPort = computed(() => live.address.replace(/^https?:\/\//, ''))

const steps = computed(() => {
  const raw = tm(`live.setup.steps.${tab.value}`) as unknown[]
  const params = { address: live.address, dockerAddress: dockerAddress.value, hostPort: hostPort.value }
  return raw.map((s) => rt(s as string, params))
})

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(live.address)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* clipboard blocked: the address is still on screen */
  }
}

// ---- live view -------------------------------------------------------------

const SHOWN = 50
const rows = computed(() => live.newestFirst.slice(0, SHOWN))

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtMs(ms: number | null): string {
  if (ms == null) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(0)} ms`
}
function fmtTokens(n: number | null): string {
  return n == null ? '—' : formatNumber(n)
}
function shareOf(turn: LiveTurn): number | null {
  return cacheShare(turn)
}
function shareColor(share: number | null): string {
  if (share == null) return 'bg-surface-overlay'
  if (share >= 0.8) return 'bg-success'
  if (share >= 0.5) return 'bg-warning'
  return 'bg-error'
}

const selected = computed(() => live.selected)
const selectedShare = computed(() => (selected.value ? cacheShare(selected.value) : null))

/** The anatomy as shares of the prompt, by characters. */
const anatomyParts = computed(() => {
  const a = selected.value?.anatomy
  if (!a || a.totalChars === 0) return []
  const tokens = selected.value!.prompt.tokens
  const toTokens = (chars: number) => (tokens == null ? null : Math.round((chars / a.totalChars) * tokens))
  return [
    { key: 'system', chars: a.systemChars, color: '#7c3aed' },
    { key: 'tools', chars: a.toolsChars, color: '#2563eb' },
    { key: 'history', chars: a.historyChars, color: '#0891b2' },
    { key: 'message', chars: a.messageChars, color: '#16a34a' },
  ]
    .filter((p) => p.chars > 0)
    .map((p) => ({ ...p, share: p.chars / a.totalChars, tokens: toTokens(p.chars) }))
})

const breakInfo = computed(() => {
  const s = selected.value
  if (!s?.prefix || s.prefix.identical) return null
  const after =
    s.prefix.breakTokensEst != null && s.prompt.tokens != null ? s.prompt.tokens - s.prefix.breakTokensEst : null
  const saving = cacheFixSavingMs(s)
  const msg = messageTokensEst(s)
  return {
    tokens: s.prefix.breakTokensEst,
    chars: s.prefix.breakChar,
    after,
    from: s.prompt.prefillMs,
    to: saving != null && s.prompt.prefillMs != null ? Math.max(0, s.prompt.prefillMs - saving) : null,
    messageTokens: msg,
  }
})

watch(
  () => live.selectedId,
  (id) => {
    if (id) void live.select(id)
  },
)

function findingParams(f: { params: Record<string, string | number> }) {
  const p = { ...f.params }
  for (const k of Object.keys(p)) if (typeof p[k] === 'number') p[k] = formatNumber(p[k] as number)
  return p
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <!-- Header -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <Radio class="mt-1 h-6 w-6 shrink-0 text-accent" />
          <div>
            <h2 class="text-lg font-semibold text-text-primary">{{ $t('live.title') }}</h2>
            <p class="mt-1 text-sm text-text-muted">
              {{ live.hasTraffic ? $t('live.live.lead') : $t('live.subtitle') }}
            </p>
          </div>
        </div>

        <div v-if="live.hasTraffic" class="flex flex-wrap items-center gap-2 text-sm">
          <span class="inline-flex items-center gap-1.5 font-medium" :class="live.connected ? 'text-success' : 'text-warning'">
            <span class="h-2 w-2 rounded-full" :class="live.connected ? 'bg-success' : 'bg-warning animate-pulse'" />
            {{ live.connected ? $t('live.live.listening', { address: hostPort }) : $t('live.live.disconnected') }}
          </span>
          <span class="rounded bg-surface-overlay px-2 py-0.5 text-text-secondary">{{ $t('live.live.clients', live.clients.length) }}</span>
          <span class="rounded bg-surface-overlay px-2 py-0.5 text-text-secondary">
            {{ $t('live.live.turns', live.turns.length) }} · {{ formatDuration(live.sessionMs) }}
          </span>
          <button
            class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-text-secondary hover:bg-surface-overlay"
            @click="live.togglePause"
          >
            <component :is="live.paused ? Play : Pause" :size="12" />
            {{ live.paused ? $t('live.live.resume', { n: live.pending.length }) : $t('live.live.pause') }}
          </button>
          <button
            class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-text-secondary hover:bg-surface-overlay"
            @click="live.clear"
          >
            <Trash2 :size="12" />
            {{ $t('live.live.clear') }}
          </button>
        </div>
      </div>

      <!-- ================= EMPTY STATE = SETUP ================= -->
      <template v-if="!live.hasTraffic">
        <div class="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div class="rounded-lg border border-border-default bg-surface-raised p-5">
            <template v-if="live.status?.listening">
              <p class="text-base text-text-secondary">{{ $t('live.setup.lead') }}</p>
              <div class="my-3 flex flex-wrap items-center gap-3">
                <code class="rounded-lg border border-dashed border-accent bg-surface px-4 py-2 text-3xl text-text-primary select-all">{{ live.address }}</code>
                <button
                  class="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-sm text-text-primary hover:bg-surface-overlay"
                  @click="copyAddress"
                >
                  <component :is="copied ? Check : Copy" :size="14" />
                  {{ copied ? $t('live.setup.copied') : $t('live.setup.copy') }}
                </button>
              </div>
              <p class="text-base text-text-secondary">{{ $t('live.setup.note') }}</p>

              <div class="mt-5 flex items-center gap-3 text-base text-text-secondary">
                <span class="h-3 w-3 shrink-0 animate-pulse rounded-full bg-warning" />
                {{ $t('live.setup.waiting') }}
              </div>
            </template>
            <template v-else-if="live.status">
              <div class="flex gap-2 text-base text-warning">
                <TriangleAlert class="h-4 w-4 shrink-0" />
                <p>{{ $t('live.setup.offline', { port: live.status.port }) }}</p>
              </div>
              <button
                class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface hover:bg-accent-hover disabled:opacity-50"
                :disabled="live.retrying"
                @click="live.retryListen"
              >
                {{ $t('live.setup.retry') }}
              </button>
            </template>
            <template v-else>
              <div class="flex gap-2 text-base text-warning">
                <TriangleAlert class="h-4 w-4 shrink-0" />
                <p>{{ $t('live.setup.unreachable') }}</p>
              </div>
            </template>

            <div class="mt-5 border-t border-border-default pt-4">
              <label class="inline-flex cursor-pointer items-center gap-2 text-base text-text-primary">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-[var(--color-accent)]"
                  :checked="live.status?.keepText ?? false"
                  :disabled="!live.status"
                  @change="live.setKeepText(($event.target as HTMLInputElement).checked)"
                />
                {{ $t('live.privacy.toggle') }}
              </label>
              <p class="mt-1 text-sm text-text-muted">
                {{ live.status?.keepText ? $t('live.privacy.on') : $t('live.privacy.off') }}
                {{ $t('live.privacy.always') }}
                <template v-if="live.status?.keepText && live.status.textDir"> {{ $t('live.privacy.where', { dir: live.status.textDir }) }}</template>
              </p>
            </div>
          </div>

          <div class="rounded-lg border border-border-default bg-surface-raised p-5">
            <div class="mb-3 flex flex-wrap gap-1 border-b border-border-default">
              <button
                v-for="k in TABS"
                :key="k"
                class="-mb-px border-b-2 px-3 py-2 text-base"
                :class="tab === k ? 'border-accent font-semibold text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'"
                @click="tab = k"
              >
                {{ $t(`live.setup.tabs.${k}`) }}
              </button>
            </div>
            <ol class="list-decimal space-y-2 ps-5 text-base text-text-secondary">
              <li v-for="(s, i) in steps" :key="i">{{ s }}</li>
            </ol>
          </div>
        </div>
      </template>

      <!-- ================= LIVE VIEW ================= -->
      <template v-else>
        <!-- Findings -->
        <div class="space-y-2">
          <div
            v-for="f in live.findings"
            :key="f.kind + f.turnId"
            class="grid grid-cols-[0.25rem_1fr_auto] items-center gap-3 rounded-lg border border-border-default bg-surface-raised px-3 py-2"
          >
            <div class="h-full min-h-9 rounded" :class="f.severity === 'error' ? 'bg-error' : 'bg-warning'" />
            <div class="text-base">
              <p class="font-semibold text-text-primary">
                {{ $t(`live.findings.${f.kind}.title`, findingParams(f)) }}
              </p>
              <p class="text-sm text-text-secondary">
                <template v-if="f.kind === 'context'">
                  {{ $t('live.findings.context.body', findingParams(f)) }}
                </template>
                <template v-else-if="f.kind === 'truncated'">
                  {{ $t(Number(f.params.systemChars) > 0 ? 'live.findings.truncated.body' : 'live.findings.truncated.bodyNoSystem', findingParams(f)) }}
                </template>
                <template v-else-if="f.kind === 'prefix'">
                  {{ $t(f.params.breakTokens === -1 ? 'live.findings.prefix.body' : 'live.findings.prefix.bodyWithBreak', findingParams(f)) }}
                </template>
                <template v-else-if="f.kind === 'drop'">
                  {{ $t(f.params.breakTokens === -1 ? 'live.findings.drop.body' : 'live.findings.drop.bodyWithBreak', findingParams(f)) }}
                </template>
                <template v-else-if="f.kind === 'cpu'">
                  {{ $t(f.params.context === -1 ? 'live.findings.cpu.bodyNoContext' : 'live.findings.cpu.body', findingParams(f)) }}
                </template>
                <template v-else>
                  {{ $t('live.findings.tools.body', findingParams(f)) }}
                </template>
              </p>
            </div>
            <button class="whitespace-nowrap text-sm text-accent hover:underline" @click="live.selectedId = f.turnId">
              {{ $t('live.findings.show') }} →
            </button>
          </div>
          <p v-if="live.findings.length === 0" class="flex items-center gap-2 text-sm text-text-muted">
            <Info class="h-3.5 w-3.5" /> {{ $t('live.findings.none') }}
          </p>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <!-- Turn stream -->
          <div class="rounded-lg border border-border-default bg-surface-raised p-4">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="text-text-muted">
                  <tr class="border-b border-border-default">
                    <th class="py-2 pe-2 font-medium">{{ $t('live.table.time') }}</th>
                    <th class="py-2 pe-2 font-medium">{{ $t('live.table.client') }}</th>
                    <th class="py-2 pe-2 font-medium">{{ $t('live.table.model') }}</th>
                    <th class="py-2 pe-2 text-end font-medium">{{ $t('live.table.prompt') }}</th>
                    <th class="py-2 pe-2 font-medium">{{ $t('live.table.cache') }}</th>
                    <th class="py-2 pe-2 text-end font-medium">{{ $t('live.table.prefill') }}</th>
                    <th class="py-2 pe-2 text-end font-medium">{{ $t('live.table.gen') }}</th>
                    <th class="py-2 text-end font-medium">{{ $t('live.table.tools') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in rows"
                    :key="row.id"
                    class="cursor-pointer border-b border-border-default/50 hover:bg-surface-overlay/60"
                    :class="row.id === live.selectedId ? 'bg-accent/10' : ''"
                    @click="live.selectedId = row.id"
                  >
                    <td class="py-1.5 pe-2 font-mono text-text-secondary">{{ fmtTime(row.at) }}</td>
                    <td class="py-1.5 pe-2">
                      <span class="rounded bg-surface-overlay px-1.5 py-0.5 text-text-secondary" :title="row.client.userAgent">
                        {{ row.client.label }} · {{ $t(`live.table.mode.${row.mode}`) }}
                      </span>
                    </td>
                    <td class="py-1.5 pe-2 text-text-primary">{{ row.model }}</td>
                    <td class="py-1.5 pe-2 text-end font-mono text-text-primary">{{ fmtTokens(row.prompt.tokens) }}</td>
                    <td class="py-1.5 pe-2">
                      <span v-if="row.error" class="text-error">{{ $t('live.table.failed') }}</span>
                      <div v-else-if="shareOf(row) !== null" class="flex items-center gap-2">
                        <div class="h-1.5 w-16 overflow-hidden rounded-full bg-surface-overlay">
                          <div class="h-full" :class="shareColor(shareOf(row))" :style="{ width: shareOf(row)! * 100 + '%' }" />
                        </div>
                        <span class="font-mono text-text-primary">{{ Math.round(shareOf(row)! * 100) }}%</span>
                      </div>
                      <span
                        v-else
                        class="text-text-muted"
                        :title="row.protocol.startsWith('openai') ? $t('live.table.unreportedHint') : ''"
                      >{{ $t('live.table.unreported') }}</span>
                    </td>
                    <td class="py-1.5 pe-2 text-end font-mono text-text-primary">{{ fmtMs(row.prompt.prefillMs) }}</td>
                    <td class="py-1.5 pe-2 text-end font-mono text-text-primary">{{ row.gen.tps != null ? row.gen.tps + ' tok/s' : '—' }}</td>
                    <td class="py-1.5 text-end font-mono text-text-primary">{{ row.mode === 'agent' || row.toolCalls.length ? row.toolCalls.length : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="live.turns.length > SHOWN" class="mt-2 text-xs text-text-muted">
              {{ $t('live.table.showing', { shown: SHOWN, total: live.turns.length }) }}
            </p>
          </div>

          <div class="space-y-4">
            <!-- Selected turn -->
            <div v-if="selected" class="rounded-lg border border-border-default bg-surface-raised p-4 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-base font-semibold text-text-primary">
                  {{ $t('live.turn.title') }} {{ selected.seq }} · {{ selected.client.label }} · {{ $t(`live.table.mode.${selected.mode}`) }}
                </span>
                <span class="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-text-secondary">{{ fmtTime(selected.at) }}</span>
              </div>

              <!-- Anatomy -->
              <div v-if="anatomyParts.length" class="mt-3">
                <p class="text-text-secondary">
                  {{
                    selected.prompt.tokens != null
                      ? $t('live.turn.anatomyTitle', { tokens: formatNumber(selected.prompt.tokens) })
                      : $t('live.turn.anatomyTitleChars', { chars: formatNumber(selected.anatomy.totalChars) })
                  }}
                </p>
                <div class="mt-1.5 flex h-6 overflow-hidden rounded">
                  <div
                    v-for="p in anatomyParts"
                    :key="p.key"
                    class="flex items-center justify-center overflow-hidden text-xs text-white"
                    :style="{ flex: p.chars, background: p.color }"
                    :title="$t(`live.turn.${p.key}`)"
                  >
                    {{ p.share >= 0.08 ? Math.round(p.share * 100) + '%' : '' }}
                  </div>
                </div>
                <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                  <span v-for="p in anatomyParts" :key="p.key" class="inline-flex items-center gap-1">
                    <i class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: p.color }" />
                    {{ $t(`live.turn.${p.key}`) }} {{ p.tokens != null ? formatNumber(p.tokens) : formatNumber(p.chars) }}
                  </span>
                </div>
              </div>

              <!-- Where the cache broke -->
              <div v-if="breakInfo" class="mt-3 rounded-r border-l-[3px] border-error bg-error/5 p-3">
                <p class="font-semibold text-text-primary">
                  {{
                    breakInfo.tokens != null
                      ? $t('live.turn.breakTitle', { tokens: formatNumber(breakInfo.tokens) })
                      : $t('live.turn.breakTitleChars', { chars: formatNumber(breakInfo.chars) })
                  }}
                </p>
                <pre
                  v-if="live.selectedText?.snippet"
                  class="mt-2 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-text-secondary"
                ><span class="text-success">{{ live.selectedText.snippet.before }}</span><mark class="rounded-sm bg-error/30 text-text-primary">{{ live.selectedText.snippet.after }}</mark></pre>
                <p v-else-if="!selected.textKept" class="mt-1 text-text-muted">{{ $t('live.turn.textHint') }}</p>
                <p v-if="breakInfo.after != null" class="mt-2 text-text-secondary">
                  {{ $t('live.turn.breakBody', { after: formatNumber(breakInfo.after) }) }}
                  <template v-if="breakInfo.from != null && breakInfo.to != null">
                    {{ $t('live.turn.breakFix', { from: fmtMs(breakInfo.from), to: fmtMs(breakInfo.to) }) }}
                  </template>
                </p>
              </div>
              <p v-else-if="selected.prefix?.identical" class="mt-3 flex items-center gap-1.5 text-success">
                <Check class="h-3.5 w-3.5" /> {{ $t('live.turn.identical') }}
              </p>
              <p v-else-if="selected.mode === 'chat' || selected.mode === 'agent'" class="mt-3 text-text-muted">
                {{ $t('live.turn.first') }}
              </p>

              <!-- Numbers -->
              <p
                v-if="selected.prompt.tokens == null && selected.protocol.startsWith('openai') && !selected.error"
                class="mt-3 text-text-muted"
              >
                {{ $t('live.table.unreportedHint') }}
              </p>

              <dl class="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                <dt class="text-text-secondary">{{ $t('live.turn.promptTokens') }}</dt>
                <dd class="text-end font-mono text-text-primary">{{ fmtTokens(selected.prompt.tokens) }}</dd>
                <dt class="text-text-secondary">{{ $t('live.turn.fromCache') }}</dt>
                <dd class="text-end font-mono text-text-primary">
                  {{ fmtTokens(selected.prompt.cached) }}<template v-if="selectedShare != null"> ({{ Math.round(selectedShare * 100) }}%)</template>
                </dd>
                <dt class="text-text-secondary">{{ $t('live.turn.prefill') }}</dt>
                <dd class="text-end font-mono text-text-primary">
                  {{ fmtMs(selected.prompt.prefillMs) }}<template v-if="selected.prompt.prefillTps != null"> · {{ $t('live.turn.realRate', { tps: formatNumber(selected.prompt.prefillTps) }) }}</template>
                </dd>
                <dt class="text-text-secondary">{{ $t('live.turn.generation') }}</dt>
                <dd class="text-end font-mono text-text-primary">
                  {{ fmtTokens(selected.gen.tokens) }}<template v-if="selected.gen.tps != null"> · {{ selected.gen.tps }} tok/s</template>
                </dd>
                <template v-if="selected.mode === 'agent' || selected.toolCalls.length">
                  <dt class="text-text-secondary">{{ $t('live.turn.toolCalls') }}</dt>
                  <dd class="text-end font-mono text-text-primary">{{ selected.toolCalls.length ? selected.toolCalls.join(', ') : $t('live.turn.noTools') }}</dd>
                </template>
                <template v-if="selected.fit">
                  <dt class="text-text-secondary">{{ $t('live.turn.context') }}</dt>
                  <dd class="text-end font-mono" :class="(selected.fit.cpuShare ?? 0) >= 0.05 ? 'text-warning' : 'text-text-primary'">
                    {{ selected.fit.contextLength != null ? formatNumber(selected.fit.contextLength) : '—' }}
                    <template v-if="selected.fit.cpuShare != null">
                      · {{ selected.fit.cpuShare >= 0.05 ? $t('live.turn.onCpu', { cpu: Math.round(selected.fit.cpuShare * 100) }) : $t('live.turn.onGpu') }}
                    </template>
                  </dd>
                  <template v-if="selected.fit.runner">
                    <dt class="text-text-secondary">{{ $t('live.turn.runner') }}</dt>
                    <dd class="text-end font-mono text-text-primary">{{ selected.fit.runner }}</dd>
                  </template>
                </template>
                <dt class="text-text-secondary">{{ $t('live.turn.protocol') }}</dt>
                <dd class="text-end font-mono text-text-primary">{{ selected.path }}</dd>
                <template v-if="selected.error">
                  <dt class="text-text-secondary">{{ $t('live.turn.error') }}</dt>
                  <dd class="text-end font-mono text-error">{{ selected.error }}</dd>
                </template>
                <template v-if="selected.client.userAgent">
                  <dt class="text-text-secondary">{{ $t('live.turn.userAgent') }}</dt>
                  <dd class="truncate text-end font-mono text-text-muted" :title="selected.client.userAgent">{{ selected.client.userAgent }}</dd>
                </template>
              </dl>

            </div>

            <!-- Per client -->
            <div class="space-y-2">
              <div
                v-for="c in live.clients"
                :key="c.clientId"
                class="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-4 rounded-lg border border-border-default bg-surface-raised p-3"
              >
                <div>
                  <p class="text-xs uppercase tracking-wide text-text-muted">{{ $t('live.clients.client') }}</p>
                  <p class="text-base font-semibold text-text-primary">{{ c.label }}</p>
                  <p class="text-xs text-text-secondary">
                    {{ c.modes.map((m) => $t(`live.table.mode.${m}`)).join(' · ') }} · {{ $t('live.live.turns', c.turns) }}
                  </p>
                </div>
                <div class="text-end">
                  <p class="text-xs uppercase tracking-wide text-text-muted">{{ $t('live.clients.tokens') }}</p>
                  <p class="font-mono text-base text-text-primary">{{ formatNumber(c.tokens) }}</p>
                </div>
                <div class="text-end">
                  <p class="text-xs uppercase tracking-wide text-text-muted">{{ $t('live.clients.toolCalls') }}</p>
                  <p class="font-mono text-base text-text-primary">{{ c.toolCalls || '—' }}</p>
                </div>
                <div class="text-end">
                  <p class="text-xs uppercase tracking-wide text-text-muted">{{ $t('live.clients.prefill') }}</p>
                  <p class="font-mono text-base text-text-primary">{{ formatDuration(c.prefillMs) }}</p>
                </div>
                <div class="text-end" :title="$t('live.clients.savesHint')">
                  <p class="text-xs uppercase tracking-wide text-text-muted">{{ $t('live.clients.saves') }}</p>
                  <p
                    class="font-mono text-base"
                    :class="c.cacheFixSavesMs != null && c.cacheFixSavesMs > 1000 ? 'text-success' : 'text-text-muted'"
                  >
                    <template v-if="c.cacheFixSavesMs == null">{{ $t('live.clients.unknown') }}</template>
                    <template v-else-if="c.cacheFixSavesMs <= 1000">{{ $t('live.clients.nothing') }}</template>
                    <template v-else>{{ $t('live.clients.savesAbout', { time: formatDuration(c.cacheFixSavesMs) }) }}</template>
                  </p>
                </div>
              </div>
            </div>

            <!-- Privacy toggle stays reachable in the live view -->
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 accent-[var(--color-accent)]"
                :checked="live.status?.keepText ?? false"
                @change="live.setKeepText(($event.target as HTMLInputElement).checked)"
              />
              {{ $t('live.privacy.toggle') }}
            </label>
          </div>
        </div>

        <!-- The request itself, full width: a conversation and a tool list, not a JSON dump -->
        <div v-if="selected && live.selectedText" class="rounded-lg border border-border-default bg-surface-raised p-4">
          <h3 class="mb-3 text-base font-semibold text-text-primary">
            {{ $t('live.viewer.title') }} · {{ $t('live.turn.title') }} {{ selected.seq }}
          </h3>
          <RequestViewer
            :request="live.selectedText.request"
            :protocol="selected.protocol"
            :break-char="selected.prefix && !selected.prefix.identical ? selected.prefix.breakChar : null"
            :prompt-tokens="selected.prompt.tokens"
          />
        </div>
      </template>
    </div>
  </div>
</template>
