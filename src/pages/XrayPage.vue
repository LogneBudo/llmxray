<script setup lang="ts">
/**
 * The prompt X-ray. One bar per turn, to scale: colour says what each part of
 * the prompt was, brightness says what happened to it. Reads the same turns
 * the Live page records; the arithmetic is in services/xray.ts.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ScanLine } from '@lucide/vue'
import { useLiveStore } from '@/stores/live-store'
import { xrayConversations, type XrayConversation, type XraySegment, type XrayTurn } from '@/services/xray'
import RequestViewer from '@/components/live/RequestViewer.vue'
import { formatNumber } from '@/utils/format'

const live = useLiveStore()
onMounted(() => live.start())
onUnmounted(() => live.stop())

const conversations = computed<XrayConversation[]>(() => xrayConversations(live.turns))
const pickedKey = ref<string | null>(null)
const conversation = computed<XrayConversation | null>(() => {
  if (!conversations.value.length) return null
  return conversations.value.find((c) => c.key === pickedKey.value) ?? conversations.value[0]!
})
watch(conversations, (list) => {
  if (list.length && !list.some((c) => c.key === pickedKey.value)) pickedKey.value = list[0]!.key
})

/** The most recent turns fit on a screen; the rest are a scroll away. */
const SHOWN = 40
const shown = computed<XrayTurn[]>(() => conversation.value?.turns.slice(-SHOWN) ?? [])

function width(seg: XraySegment, x: XrayTurn): string {
  const max = conversation.value?.maxTokens ?? 1
  const total = x.tokens ?? x.segments.reduce((n, s) => n + s.tokens, 0)
  const chars = x.segments.reduce((n, s) => n + s.chars, 0)
  // Scale by characters within the turn, by the daemon's tokens across turns.
  const share = chars > 0 ? seg.chars / chars : 0
  return `${Math.max(0.4, (share * total * 100) / max)}%`
}

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtS(ms: number | null | undefined): string {
  return ms == null ? '—' : (ms / 1000).toFixed(1)
}
function costLabel(x: XrayTurn): { key: string; params: Record<string, string | number> } {
  if (x.note?.kind === 'cut') return { key: 'xray.cost.cut', params: { lost: formatNumber(x.note.lostTokens) } }
  if (x.note?.kind === 'first') return { key: 'xray.cost.first', params: {} }
  if (x.cachedShare == null) return { key: 'xray.cost.unknown', params: {} }
  return { key: 'xray.cost.cached', params: { share: Math.round(x.cachedShare * 100) } }
}

// ---- click: the request behind a segment ---------------------------------

const picked = ref<{ x: XrayTurn; seg: XraySegment } | null>(null)
const requestEl = ref<HTMLElement | null>(null)

async function pick(x: XrayTurn, seg: XraySegment) {
  picked.value = { x, seg }
  await live.select(x.turn.id)
  requestEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const pickedState = computed(() => (picked.value ? `xray.legend.${picked.value.seg.state}` : ''))

// ---- opened from a run: /xray?turn=<id> lands on that turn's conversation and request --------

const route = useRoute()
const wanted = ref<string | null>((route.query.turn as string | undefined) ?? null)
watch(
  conversations,
  (list) => {
    if (!wanted.value) return
    const c = list.find((x) => x.turns.some((y) => y.turn.id === wanted.value))
    const x = c?.turns.find((y) => y.turn.id === wanted.value)
    if (!c || !x) return
    wanted.value = null
    pickedKey.value = c.key
    const seg = x.segments.find((s) => s.state === 'recomputed') ?? x.segments[0]
    if (seg) void pick(x, seg)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <div class="flex items-start gap-3">
        <ScanLine class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('xray.title') }}</h2>
          <p class="mt-1 max-w-4xl text-sm text-text-muted">{{ $t('xray.subtitle') }}</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="!conversation" class="rounded-lg border border-border-default bg-surface-raised p-6 text-base text-text-secondary">
        {{ $t('xray.empty') }}
        <router-link to="/live" class="ms-2 text-accent underline">{{ $t('xray.emptyLink') }}</router-link>
      </div>

      <template v-else>
        <!-- Conversation picker -->
        <label class="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <span>{{ $t('xray.pick') }}</span>
          <select v-model="pickedKey" class="rounded-md border border-border-default bg-surface-raised px-2 py-1 text-base text-text-primary">
            <option v-for="c in conversations" :key="c.key" :value="c.key">
              {{ $t('xray.pickOption', { client: c.clientLabel, model: c.model, turns: c.turns.length }) }}
            </option>
          </select>
        </label>

        <!-- Chart -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4">
          <div class="mb-1 flex justify-between ps-[8.5rem] pe-[9rem] text-xs text-text-muted">
            <span>0</span>
            <span>{{ $t('xray.scale', { tokens: formatNumber(conversation.maxTokens) }) }}</span>
          </div>

          <div v-for="(x, i) in shown" :key="x.turn.id" class="border-t border-border-default/60 py-2 first:border-t-0">
            <div class="grid items-center gap-4" style="grid-template-columns: 8rem 1fr 9rem">
              <div class="text-sm text-text-muted">
                <b class="block text-base text-text-primary">{{ $t('xray.turn', { n: conversation.turns.length - shown.length + i + 1 }) }}</b>
                {{ fmtTime(x.turn.at) }}
              </div>

              <div class="flex h-7 items-center gap-[2px]">
                <button
                  v-for="(seg, j) in x.segments"
                  :key="j"
                  type="button"
                  class="xr-seg relative h-6 rounded-[0.3rem] transition hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-white/70"
                  :class="[`xr-${seg.part}`, `xr-${seg.state}`, picked?.x === x && picked?.seg === seg ? 'ring-2 ring-white' : '']"
                  :style="{ width: width(seg, x) }"
                  :title="`${$t(`xray.part.${seg.part}`)} · ${$t(`xray.legend.${seg.state}`)} · ~${formatNumber(seg.tokens)} tokens`"
                  @click="pick(x, seg)"
                />
              </div>

              <div class="text-end tabular-nums">
                <span class="block text-base font-semibold text-text-primary">{{ fmtS(x.prefillMs) }} s</span>
                <span class="text-xs text-text-muted">{{ $t(costLabel(x).key, costLabel(x).params) }}</span>
              </div>
            </div>

            <p v-if="x.note && x.note.kind !== 'first'" class="mt-1 ps-[8.5rem] text-sm text-text-secondary">
              <template v-if="x.note.kind === 'reloaded'">{{ $t('xray.note.reloaded', { seconds: fmtS(x.note.loadMs) }) }}</template>
              <template v-else-if="x.note.kind === 'break'">
                {{ x.note.breakTokens != null ? $t('xray.note.break', { part: $t(`xray.part.${x.note.part}`), tokens: formatNumber(x.note.breakTokens) }) : $t('xray.note.breakNoTokens', { part: $t(`xray.part.${x.note.part}`) }) }}
                <span v-if="x.note.costMs != null && x.note.costMs > 500"> {{ $t('xray.note.breakCost', { seconds: fmtS(x.note.costMs) }) }}</span>
              </template>
              <template v-else-if="x.note.kind === 'tools-added'">{{ $t('xray.note.toolsAdded', { tools: x.note.tools, tokens: formatNumber(x.note.toolTokens) }) }}</template>
              <template v-else-if="x.note.kind === 'cut'">
                <span class="font-medium text-error">{{ $t(x.note.mode === 'history' ? 'xray.note.cutHistory' : 'xray.note.cut', { context: formatNumber(x.note.context), lost: formatNumber(x.note.lostTokens) }) }}</span>
                <span v-if="x.note.systemLost"> {{ $t('xray.note.cutSystem') }}</span>
                <span v-if="x.note.toolsLost"> {{ $t('xray.note.cutTools') }}</span>
              </template>
            </p>
          </div>

          <!-- Legend -->
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted">
            <span class="text-text-primary">{{ $t('xray.legend.what') }}</span>
            <span><i class="xr-key xr-system" />{{ $t('xray.legend.system') }}</span>
            <span><i class="xr-key xr-tools" />{{ $t('xray.legend.tools') }}</span>
            <span><i class="xr-key xr-history" />{{ $t('xray.legend.history') }}</span>
            <span><i class="xr-key xr-message" />{{ $t('xray.legend.message') }}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted">
            <span class="text-text-primary">{{ $t('xray.legend.happened') }}</span>
            <span><i class="xr-key xr-history xr-cached" />{{ $t('xray.legend.cached') }}</span>
            <span><i class="xr-key xr-history xr-recomputed" />{{ $t('xray.legend.recomputed') }}</span>
            <span><i class="xr-key xr-cut" />{{ $t('xray.legend.cut') }}</span>
          </div>
        </div>

        <!-- Totals -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 text-base text-text-primary">
          <h3 class="mb-1 text-sm font-medium text-text-secondary">{{ $t('xray.totals.title') }}</h3>
          <p v-if="conversation.totals.prefillMs > 0">
            {{ $t('xray.totals.line', { total: fmtS(conversation.totals.prefillMs), turns: conversation.turns.length }) }}
            <span v-if="conversation.totals.avoidableMs > 500"> {{ $t('xray.totals.avoidable', { avoidable: fmtS(conversation.totals.avoidableMs) }) }}</span>
            <span v-if="conversation.totals.cutTurns > 0" class="text-error"> {{ $t('xray.totals.cut', { n: conversation.totals.cutTurns }, conversation.totals.cutTurns) }}</span>
          </p>
          <p v-else class="text-text-muted">{{ $t('xray.totals.noPrefill') }}</p>
        </div>

        <!-- Request behind a click -->
        <div ref="requestEl" class="rounded-lg border border-border-default bg-surface-raised p-4">
          <h3 class="text-sm font-medium text-text-secondary">{{ $t('xray.request.title') }}</h3>
          <p class="mt-1 text-sm text-text-muted">{{ $t('xray.request.hint') }}</p>
          <template v-if="picked">
            <p class="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-text-secondary">
              {{ $t('xray.request.selected', { n: conversation.turns.indexOf(picked.x) + 1, part: $t(`xray.part.${picked.seg.part}`), state: $t(pickedState) }) }}
              <router-link :to="{ name: 'runs', query: { turn: picked.x.turn.id } }" class="text-accent hover:underline">{{ $t('xray.request.openRun') }}</router-link>
            </p>
            <RequestViewer
              v-if="live.selectedText"
              class="mt-2"
              :request="live.selectedText.request"
              :protocol="picked.x.turn.protocol"
              :break-char="picked.x.turn.prefix && !picked.x.turn.prefix.identical ? picked.x.turn.prefix.breakChar : null"
              :prompt-tokens="picked.x.turn.prompt.tokens"
            />
            <p v-else class="mt-2 text-sm text-text-muted">{{ $t('xray.request.noText') }}</p>
          </template>
          <p v-else class="mt-3 text-sm text-text-muted">{{ $t('xray.request.none') }}</p>
        </div>

        <p class="max-w-4xl text-sm text-text-muted">{{ $t('xray.foot') }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.xr-system { background: #5b6cff; }
.xr-tools { background: #8b5cf6; }
.xr-history { background: #2f6b8f; }
.xr-message { background: #19a3a3; }
.xr-cached { opacity: 0.38; }
.xr-recomputed { opacity: 1; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.18); }
.xr-cut {
  background: repeating-linear-gradient(135deg, #4a5168 0 5px, #2b324a 5px 10px) !important;
  opacity: 0.9;
}
.xr-seg.xr-cut::after {
  content: '';
  position: absolute;
  left: 0.3rem;
  right: 0.3rem;
  top: 50%;
  border-top: 2px solid #aab2c6;
}
.xr-key {
  display: inline-block;
  width: 1.1rem;
  height: 0.75rem;
  border-radius: 0.2rem;
  vertical-align: middle;
  margin-inline-end: 0.35rem;
}
</style>
