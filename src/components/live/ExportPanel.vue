<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchLiveExport, saveLiveExport, testLiveExport } from '@/services/live-client'
import type { LiveExport, LiveExportTest } from '@/types/live'

const props = defineProps<{
  /** Whether Keep the prompt text is on: the text can be included only then. */
  keepText: boolean
  /** Where the settings file lives, for the help line. */
  configDir?: string
}>()

const { t } = useI18n()

const view = ref<LiveExport | null>(null)
const address = ref('')
const headers = ref('')
const busy = ref(false)
const tested = ref<LiveExportTest | null>(null)
const now = ref(Date.now())

const state = computed(() => view.value?.state ?? 'off')
const sending = computed(() => view.value?.enabled ?? false)
const url = computed(() => view.value?.url ?? '')
const configFile = computed(() => (props.configDir ? `${props.configDir.replace(/[\\/]observe$/, '')}/export.json` : '~/.llmxray/export.json'))

const ago = computed(() => {
  const at = view.value?.lastSentAt
  if (!at) return null
  const s = Math.max(0, Math.round((now.value - at) / 1000))
  return s < 60 ? t('live.export.agoSeconds', { n: s }) : t('live.export.agoMinutes', { n: Math.round(s / 60) })
})

const statusLine = computed(() => {
  const v = view.value
  if (!v || state.value === 'off') return t('live.export.status.off')
  if (state.value === 'failing') return t('live.export.status.failing', { url: url.value, error: v.lastError ?? '?', failed: v.failed })
  if (!v.sent) return t('live.export.status.waiting', { url: url.value })
  return t('live.export.status.sending', {
    url: url.value,
    turns: t('live.export.turnsCount', { n: v.sent }, v.sent),
    runs: t('live.export.runsCount', { n: v.runs }, v.runs),
    ago: ago.value ?? '',
  })
})

const includeHelp = computed(() => {
  if (!props.keepText) return t('live.export.includeNeedsKeep')
  return view.value?.includeText ? t('live.export.includeOn') : t('live.export.includeOff')
})

async function refresh() {
  const v = await fetchLiveExport()
  if (!v) return
  // The field follows the server until the person starts typing in it.
  if (!view.value || address.value === view.value.address) address.value = v.address
  view.value = v
}

async function save(change: Parameters<typeof saveLiveExport>[0]) {
  busy.value = true
  const v = await saveLiveExport(change)
  busy.value = false
  if (v) {
    view.value = v
    address.value = v.address
  }
}

/** The address and any newly typed headers, saved together. */
function withTyped(change: Parameters<typeof saveLiveExport>[0] = {}) {
  const out = { ...change, address: address.value }
  if (headers.value.trim()) out.headers = headers.value
  return out
}

async function toggleSending() {
  tested.value = null
  await save(withTyped({ enabled: !sending.value }))
  headers.value = ''
}

async function saveAddress() {
  if (view.value && address.value !== view.value.address) await save({ address: address.value })
}

async function saveHeaders() {
  if (!headers.value.trim()) return
  await save({ headers: headers.value })
  headers.value = ''
}

async function removeHeaders() {
  await save({ headers: '' })
}

async function sendTest() {
  await save(withTyped())
  headers.value = ''
  busy.value = true
  tested.value = await testLiveExport()
  busy.value = false
}

function useAddress(value: string) {
  address.value = value
  void saveAddress()
}

const DESTINATIONS = [
  { key: 'jaeger', address: 'http://localhost:4318', command: 'docker run -p 16686:16686 -p 4318:4318 jaegertracing/jaeger' },
  { key: 'phoenix', address: 'http://localhost:6006', command: 'docker run -p 6006:6006 arizephoenix/phoenix' },
  { key: 'langfuse', address: 'https://cloud.langfuse.com/api/public/otel', command: null },
  { key: 'other', address: null, command: null },
] as const

const CARRIES = [
  'operation',
  'provider',
  'model',
  'input',
  'output',
  'finish',
  'client',
  'cached',
  'timings',
  'cut',
  'cpu',
  'tools',
] as const
const CARRY_KEYS: Record<(typeof CARRIES)[number], string> = {
  operation: 'gen_ai.operation.name',
  provider: 'gen_ai.provider.name',
  model: 'gen_ai.request.model',
  input: 'gen_ai.usage.input_tokens',
  output: 'gen_ai.usage.output_tokens',
  finish: 'gen_ai.response.finish_reasons',
  client: 'llmxray.client',
  cached: 'llmxray.cached_tokens · cached_share',
  timings: 'llmxray.prefill_ms · load_ms · queue_ms',
  cut: 'llmxray.prompt_cut',
  cpu: 'llmxray.cpu_share',
  tools: 'llmxray.tool_calls',
}

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  void refresh()
  timer = setInterval(() => {
    now.value = Date.now()
    void refresh()
  }, 3000)
})
onUnmounted(() => clearInterval(timer))
watch(
  () => props.keepText,
  (on) => {
    // Turning Keep text off also takes the text out of the spans, on the server too.
    if (!on && view.value?.includeText) void save({ includeText: false })
  },
)
</script>

<template>
  <section class="@container mt-5 border-t border-border-default pt-4" :aria-label="$t('live.export.title')">
    <h3 class="flex flex-wrap items-center gap-2 text-base font-semibold text-text-primary">
      {{ $t('live.export.title') }}
      <span
        class="rounded-full border px-2 py-0.5 text-xs font-semibold"
        :class="{
          'border-text-muted text-text-muted': state === 'off',
          'border-success text-success': state === 'sending',
          'border-error text-error': state === 'failing',
        }"
      >{{ $t(`live.export.state.${state}`) }}</span>
    </h3>
    <p class="mt-1 text-sm text-text-secondary">{{ $t('live.export.lead') }}</p>

    <label class="mt-4 block text-sm font-semibold text-text-primary" for="export-address">{{ $t('live.export.address') }}</label>
    <input
      id="export-address"
      v-model="address"
      type="text"
      spellcheck="false"
      placeholder="http://localhost:4318"
      class="mt-1 w-full rounded-md border border-border-default bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent"
      @change="saveAddress"
    />
    <p class="mt-1 text-xs text-text-muted">
      {{ $t('live.export.addressHelp') }}
      <template v-if="view?.source === 'env'"> {{ $t('live.export.fromEnv') }}</template>
    </p>

    <label class="mt-4 block text-sm font-semibold text-text-primary" for="export-headers">
      {{ $t('live.export.headers') }} <span class="font-normal text-text-muted">{{ $t('live.export.headersHint') }}</span>
    </label>
    <textarea
      id="export-headers"
      v-model="headers"
      rows="2"
      spellcheck="false"
      placeholder="Authorization: Basic …"
      class="mt-1 w-full rounded-md border border-border-default bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent"
      @change="saveHeaders"
    />
    <p class="mt-1 text-xs text-text-muted">
      <template v-if="view?.headerNames?.length">
        {{ $t('live.export.headersSet', { names: view.headerNames.join(', ') }) }}
        <button class="ms-1 text-accent hover:underline" @click="removeHeaders">{{ $t('live.export.headersRemove') }}</button>
      </template>
      <template v-else>{{ $t('live.export.headersHelp', { file: configFile }) }}</template>
    </p>

    <label
      class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-text-primary"
      :class="keepText ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
    >
      <input
        type="checkbox"
        class="h-4 w-4 accent-[var(--color-accent)]"
        :checked="keepText && (view?.includeText ?? false)"
        :disabled="!keepText || !view"
        @change="save({ includeText: ($event.target as HTMLInputElement).checked })"
      />
      {{ $t('live.export.includeText') }}
    </label>
    <p class="mt-1 text-xs text-text-muted">{{ includeHelp }}</p>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        class="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        :class="sending ? 'bg-surface-overlay !text-text-primary border border-border-default' : 'bg-accent hover:bg-accent-hover'"
        :disabled="busy || (!sending && !address.trim())"
        @click="toggleSending"
      >
        {{ sending ? $t('live.export.stop') : $t('live.export.start') }}
      </button>
      <button
        class="rounded-md border border-border-default px-3 py-1.5 text-sm text-text-primary hover:bg-surface-overlay disabled:opacity-40"
        :disabled="busy || !address.trim()"
        @click="sendTest"
      >
        {{ $t('live.export.test') }}
      </button>
    </div>

    <p
      class="mt-3 rounded-md border-s-4 bg-surface px-3 py-2 text-sm"
      :class="{
        'border-text-muted text-text-secondary': state === 'off',
        'border-success text-text-secondary': state === 'sending',
        'border-error text-text-primary': state === 'failing',
      }"
      role="status"
    >
      {{ statusLine }}
    </p>
    <p v-if="tested" class="mt-2 text-sm" :class="tested.ok ? 'text-success' : 'text-error'" role="status">
      {{ tested.ok ? $t('live.export.testOk', { url: tested.url }) : $t('live.export.testFail', { url: tested.url ?? address, error: tested.error }) }}
    </p>

    <div class="mt-5 grid gap-6 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div>
        <h4 class="mb-2 text-sm font-semibold text-text-primary">{{ $t('live.export.carries') }}</h4>
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="row in CARRIES" :key="row" class="border-t border-border-default">
              <td class="py-1 pe-3 align-top font-mono text-xs text-text-secondary">{{ CARRY_KEYS[row] }}</td>
              <td class="py-1 align-top text-text-primary">{{ $t(`live.export.carry.${row}`) }}</td>
            </tr>
            <tr class="border-t border-border-default">
              <td class="py-1 pe-3 align-top font-mono text-xs text-text-secondary">gen_ai.input.messages · output.messages</td>
              <td class="py-1 align-top text-text-muted">{{ $t('live.export.carry.text') }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-2 text-xs text-text-muted">{{ $t('live.export.spanNote') }}</p>
      </div>
      <div>
        <h4 class="mb-2 text-sm font-semibold text-text-primary">{{ $t('live.export.where') }}</h4>
        <ul>
          <li v-for="d in DESTINATIONS" :key="d.key" class="border-t border-border-default py-2 first:border-t-0 first:pt-0">
            <p class="text-sm font-semibold text-text-primary">{{ $t(`live.export.dest.${d.key}.name`) }}</p>
            <code v-if="d.command" class="mt-1 block overflow-x-auto whitespace-nowrap rounded bg-surface px-2 py-1 font-mono text-xs text-text-primary">{{ d.command }}</code>
            <p class="mt-1 text-xs text-text-secondary">
              {{ $t(`live.export.dest.${d.key}.use`, { address: d.address ?? '' }) }}
              <button v-if="d.address" class="ms-1 text-accent hover:underline" @click="useAddress(d.address)">{{ $t('live.export.useThis') }}</button>
            </p>
            <p v-if="d.key === 'langfuse'" class="mt-1 text-xs text-warning">{{ $t('live.export.dest.langfuse.away') }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
