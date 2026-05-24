<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useModelStore } from '@/stores/model-store'
import { useProtocolObservatoryStore, type ProtocolRunState } from '@/stores/protocol-observatory-store'
import { Play, Square, Info, Network } from 'lucide-vue-next'

const { t } = useI18n()
const modelStore = useModelStore()
const observatory = useProtocolObservatoryStore()

const lowerTab = ref<'response' | 'envelope'>('response')

onMounted(async () => {
  await modelStore.fetchModels()
  if (!observatory.model && modelStore.chatModelNames.length > 0) {
    observatory.model = modelStore.chatModelNames[0]!
  }
  if (!observatory.prompt) {
    observatory.prompt = 'In one sentence, why is the sky blue?'
  }
})

const protocols = computed(() => [
  { key: 'native', state: observatory.native, label: t('protocols.native.label'), badge: t('protocols.native.badge') },
  { key: 'openai', state: observatory.openai, label: t('protocols.openai.label'), badge: t('protocols.openai.badge') },
  { key: 'anthropic', state: observatory.anthropic, label: t('protocols.anthropic.label'), badge: t('protocols.anthropic.badge') },
])

const canRun = computed(
  () => observatory.model && observatory.prompt.trim().length > 0 && !observatory.isRunning,
)
const allCompleted = computed(() =>
  protocols.value.every((p) => p.state.status === 'completed' || p.state.status === 'error' || p.state.status === 'cancelled'),
)

function tokensPerSecond(state: ProtocolRunState): string {
  if (!state.totalMs || !state.outputTokens) return '—'
  const tps = (state.outputTokens / state.totalMs) * 1000
  return tps.toFixed(1)
}

function fmt(value: number | null, unit = 'ms'): string {
  if (value === null) return '—'
  return `${value} ${unit}`
}

function statusColor(status: string): string {
  switch (status) {
    case 'streaming':
      return 'text-warning'
    case 'completed':
      return 'text-accent'
    case 'error':
      return 'text-error'
    case 'cancelled':
      return 'text-text-muted'
    default:
      return 'text-text-muted'
  }
}

function jsonPretty(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <Network class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('protocols.title') }}</h2>
          <p class="mt-1 text-xs text-text-muted">{{ $t('protocols.subtitle') }}</p>
        </div>
      </div>

      <!-- Explainer -->
      <div class="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
        <Info class="h-4 w-4 shrink-0 text-accent" />
        <p>{{ $t('protocols.explainer') }}</p>
      </div>

      <!-- Controls -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="mb-1 block text-xs text-text-muted">{{ $t('protocols.model') }}</label>
            <select
              v-model="observatory.model"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option v-for="m in modelStore.chatModelNames" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="w-32">
            <label class="mb-1 block text-xs text-text-muted">{{ $t('protocols.maxTokens') }}</label>
            <input
              v-model.number="observatory.maxTokens"
              type="number"
              min="16"
              max="2048"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs text-text-muted">{{ $t('protocols.prompt') }}</label>
          <textarea
            v-model="observatory.prompt"
            rows="3"
            class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            :placeholder="$t('protocols.promptPlaceholder')"
          />
        </div>

        <div class="flex gap-2">
          <button
            v-if="!observatory.isRunning"
            :disabled="!canRun"
            class="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            @click="observatory.runAll"
          >
            <Play :size="12" />
            {{ $t('protocols.runAll') }}
          </button>
          <button
            v-else
            class="inline-flex items-center gap-1.5 rounded-md border border-error/50 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
            @click="observatory.cancel"
          >
            <Square :size="12" />
            {{ $t('common.actions.cancel') }}
          </button>
        </div>
      </div>

      <!-- 3-column response panel -->
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div
          v-for="p in protocols"
          :key="p.key"
          class="flex flex-col rounded-lg border border-border-default bg-surface-raised"
        >
          <!-- Column header -->
          <div class="border-b border-border-default px-4 py-2">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-sm font-medium text-text-primary">{{ p.label }}</span>
              <span class="text-[10px] uppercase tracking-wide" :class="statusColor(p.state.status)">
                {{ p.state.status }}
              </span>
            </div>
            <code class="block mt-0.5 text-[10px] font-mono text-text-muted">{{ p.state.endpoint }}</code>
            <span class="text-[10px] text-accent">{{ p.badge }}</span>
          </div>

          <!-- Streaming output -->
          <div class="flex-1 px-4 py-3 min-h-[180px]">
            <div v-if="p.state.error" class="rounded-md border border-error/30 bg-error/10 px-2 py-1.5 text-[11px] text-error whitespace-pre-wrap">
              {{ p.state.error }}
            </div>
            <p
              v-else-if="!p.state.outputText && p.state.status === 'idle'"
              class="text-[11px] text-text-muted italic"
            >
              {{ $t('protocols.notRunYet') }}
            </p>
            <p
              v-else-if="!p.state.outputText && p.state.status === 'streaming'"
              class="flex items-center gap-2 text-[11px] text-text-muted italic"
            >
              <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              {{ $t('protocols.waitingForFirstToken') }}
            </p>
            <p v-else class="whitespace-pre-wrap text-xs text-text-primary leading-relaxed">{{ p.state.outputText }}</p>
          </div>

          <!-- Metrics footer -->
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border-default px-4 py-2 text-[10px]">
            <div class="flex justify-between">
              <span class="text-text-muted">TTFT</span>
              <span class="font-mono text-text-primary">{{ fmt(p.state.ttftMs) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('protocols.metrics.total') }}</span>
              <span class="font-mono text-text-primary">{{ fmt(p.state.totalMs) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">{{ $t('protocols.metrics.tokens') }}</span>
              <span class="font-mono text-text-primary">{{ p.state.outputTokens || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-text-muted">tok/s</span>
              <span class="font-mono text-text-primary">{{ tokensPerSecond(p.state) }}</span>
            </div>
            <div class="col-span-2 flex justify-between">
              <span class="text-text-muted">{{ $t('protocols.metrics.finish') }}</span>
              <span class="font-mono text-text-primary truncate ms-2">{{ p.state.finishReason ?? '—' }}</span>
            </div>
          </div>

          <!-- Inspect envelope -->
          <details class="border-t border-border-default px-4 py-2 text-[11px]">
            <summary class="cursor-pointer select-none text-text-secondary hover:text-text-primary">
              {{ $t('protocols.inspectEnvelope') }} ({{ p.state.rawChunks.length }})
            </summary>
            <div v-if="p.state.firstChunkRaw" class="mt-2 space-y-1.5">
              <div>
                <p class="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">{{ $t('protocols.firstChunk') }}</p>
                <pre class="rounded bg-surface px-2 py-1.5 font-mono text-[10px] text-text-secondary overflow-x-auto max-h-40 whitespace-pre">{{ jsonPretty(p.state.firstChunkRaw) }}</pre>
              </div>
              <div v-if="p.state.finalChunkRaw && p.state.finalChunkRaw !== p.state.firstChunkRaw">
                <p class="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">{{ $t('protocols.finalChunk') }}</p>
                <pre class="rounded bg-surface px-2 py-1.5 font-mono text-[10px] text-text-secondary overflow-x-auto max-h-40 whitespace-pre">{{ jsonPretty(p.state.finalChunkRaw) }}</pre>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- Lower tabs: Response diff / Envelope diff -->
      <div v-if="allCompleted && protocols.some(p => p.state.outputText)" class="rounded-lg border border-border-default bg-surface-raised">
        <div class="flex gap-1 border-b border-border-default px-4 py-2">
          <button
            class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            :class="lowerTab === 'response' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-overlay'"
            @click="lowerTab = 'response'"
          >
            {{ $t('protocols.tabs.responseDiff') }}
          </button>
          <button
            class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            :class="lowerTab === 'envelope' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-overlay'"
            @click="lowerTab = 'envelope'"
          >
            {{ $t('protocols.tabs.envelopeDiff') }}
          </button>
        </div>

        <!-- Response diff: side-by-side text -->
        <div v-if="lowerTab === 'response'" class="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          <div v-for="p in protocols" :key="p.key">
            <p class="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{{ p.label }}</p>
            <div class="rounded-md bg-surface px-3 py-2 text-xs text-text-primary whitespace-pre-wrap min-h-[80px]">{{ p.state.outputText || '—' }}</div>
            <p class="mt-1 text-[10px] text-text-muted">{{ p.state.outputText.length }} {{ $t('protocols.chars') }}</p>
          </div>
        </div>

        <!-- Envelope diff: top-level field names + finish-reason naming + usage shape -->
        <div v-if="lowerTab === 'envelope'" class="p-4">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border-default text-left text-[10px] uppercase tracking-wide text-text-muted">
                <th class="py-2 ps-2">{{ $t('protocols.envelopeDiff.aspect') }}</th>
                <th class="py-2" v-for="p in protocols" :key="p.key">{{ p.label }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-default">
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.streamWrapper') }}</td>
                <td class="py-2 font-mono text-text-primary">NDJSON (one JSON per line)</td>
                <td class="py-2 font-mono text-text-primary">SSE (data: …)</td>
                <td class="py-2 font-mono text-text-primary">SSE (event: + data: …)</td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.topLevelFields') }}</td>
                <td v-for="p in protocols" :key="p.key" class="py-2 font-mono text-text-primary text-[10px]">
                  {{ [...p.state.fieldNames].join(', ') || '—' }}
                </td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.finishField') }}</td>
                <td class="py-2 font-mono text-text-primary"><code>done</code> + <code>done_reason</code></td>
                <td class="py-2 font-mono text-text-primary"><code>choices[].finish_reason</code></td>
                <td class="py-2 font-mono text-text-primary"><code>message_stop</code> event</td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.finishValue') }}</td>
                <td v-for="p in protocols" :key="p.key" class="py-2 font-mono text-text-primary">{{ p.state.finishReason ?? '—' }}</td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.usageField') }}</td>
                <td class="py-2 font-mono text-text-primary"><code>eval_count</code> + <code>prompt_eval_count</code></td>
                <td class="py-2 font-mono text-text-primary"><code>usage.{prompt,completion,total}_tokens</code></td>
                <td class="py-2 font-mono text-text-primary"><code>usage.{input,output}_tokens</code></td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.tokensReported') }}</td>
                <td v-for="p in protocols" :key="p.key" class="py-2 font-mono text-text-primary">{{ p.state.outputTokens || '—' }}</td>
              </tr>
              <tr>
                <td class="py-2 ps-2 font-medium text-text-secondary">{{ $t('protocols.envelopeDiff.errorShape') }}</td>
                <td class="py-2 font-mono text-text-primary text-[10px]"><code>{"error": "string"}</code></td>
                <td class="py-2 font-mono text-text-primary text-[10px]"><code>{"error": {"message", "type", "code"}}</code></td>
                <td class="py-2 font-mono text-text-primary text-[10px]"><code>{"type": "error", "error": {...}, "request_id"}</code></td>
              </tr>
            </tbody>
          </table>
          <p class="mt-3 text-[10px] text-text-muted">
            {{ $t('protocols.envelopeDiff.footnote') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
