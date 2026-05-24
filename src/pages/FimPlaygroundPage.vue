<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { ollamaClient } from '@/services/ollama-client'
import { Play, Square, Info } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const modelStore = useModelStore()

const selectedModel = ref('')
const prefix = ref('def fibonacci(n):\n    if n <= 1:\n        return n\n    ')
const suffix = ref('\n\nprint(fibonacci(10))')
const output = ref('')
const isRunning = ref(false)
const error = ref<string | null>(null)
const metrics = ref<{
  totalDuration?: number
  loadDuration?: number
  promptEvalCount?: number
  evalCount?: number
  evalDuration?: number
} | null>(null)
let abortController: AbortController | null = null

// Coding-model name patterns — models that typically support FIM via `suffix`
const CODING_PATTERNS = [
  /codellama/i,
  /code-?qwen/i,
  /qwen.*coder/i,
  /codegemma/i,
  /codestral/i,
  /starcoder/i,
  /deepseek-coder/i,
  /\bcoder\b/i,
]

const codingModels = computed(() =>
  modelStore.chatModelNames.filter((n) => CODING_PATTERNS.some((p) => p.test(n))),
)
const nonCodingModels = computed(() =>
  modelStore.chatModelNames.filter((n) => !CODING_PATTERNS.some((p) => p.test(n))),
)

const selectedIsCodingModel = computed(() =>
  CODING_PATTERNS.some((p) => p.test(selectedModel.value)),
)

const tokensPerSecond = computed(() => {
  if (!metrics.value?.evalCount || !metrics.value?.evalDuration) return null
  return (metrics.value.evalCount / (metrics.value.evalDuration / 1e9)).toFixed(1)
})

onMounted(async () => {
  await modelStore.fetchModels()
  // Prefer coding model if available
  if (codingModels.value.length > 0) {
    selectedModel.value = codingModels.value[0]!
  } else if (modelStore.chatModelNames.length > 0) {
    selectedModel.value = modelStore.chatModelNames[0]!
  }
})

async function run() {
  if (!selectedModel.value) return
  isRunning.value = true
  output.value = ''
  error.value = null
  metrics.value = null
  abortController = new AbortController()

  try {
    const stream = await ollamaClient.streamGenerate(
      {
        model: selectedModel.value,
        prompt: prefix.value,
        suffix: suffix.value,
      },
      abortController.signal,
    )

    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const chunk = JSON.parse(line)
          if (chunk.response) output.value += chunk.response
          if (chunk.done) {
            metrics.value = {
              totalDuration: chunk.total_duration,
              loadDuration: chunk.load_duration,
              promptEvalCount: chunk.prompt_eval_count,
              evalCount: chunk.eval_count,
              evalDuration: chunk.eval_duration,
            }
          }
        } catch {
          // skip malformed
        }
      }
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    isRunning.value = false
    abortController = null
  }
}

function cancel() {
  abortController?.abort()
}

function formatMs(ns?: number): string {
  if (ns === undefined) return '—'
  const ms = ns / 1e6
  if (ms < 1000) return `${ms.toFixed(0)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-4xl space-y-4">
      <!-- Header -->
      <div>
        <h2 class="text-lg font-semibold text-text-primary">{{ $t('fim.title') }}</h2>
        <p class="mt-1 text-xs text-text-muted">{{ $t('fim.subtitle') }}</p>
      </div>

      <!-- Info banner -->
      <div class="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
        <Info class="h-4 w-4 shrink-0 text-accent" />
        <p>{{ $t('fim.explainer') }}</p>
      </div>

      <!-- Model picker -->
      <div>
        <label class="mb-1 block text-xs text-text-muted">{{ $t('fim.model') }}</label>
        <select
          v-model="selectedModel"
          class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <optgroup v-if="codingModels.length > 0" :label="t('fim.codingModels')">
            <option v-for="m in codingModels" :key="m" :value="m">{{ m }}</option>
          </optgroup>
          <optgroup v-if="nonCodingModels.length > 0" :label="t('fim.otherModels')">
            <option v-for="m in nonCodingModels" :key="m" :value="m">{{ m }}</option>
          </optgroup>
        </select>
        <p v-if="!selectedIsCodingModel && selectedModel" class="mt-1 text-[10px] text-warning">
          {{ $t('fim.notCodingModelWarning') }}
        </p>
      </div>

      <!-- Prefix / Suffix -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs text-text-muted">{{ $t('fim.prefix') }}</label>
          <textarea
            v-model="prefix"
            rows="10"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
            :placeholder="$t('fim.prefixPlaceholder')"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">{{ $t('fim.suffix') }}</label>
          <textarea
            v-model="suffix"
            rows="10"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
            :placeholder="$t('fim.suffixPlaceholder')"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          v-if="!isRunning"
          :disabled="!selectedModel"
          class="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-surface hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="run"
        >
          <Play :size="12" />
          {{ $t('fim.generate') }}
        </button>
        <button
          v-else
          class="inline-flex items-center gap-1.5 rounded-md border border-error/50 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
          @click="cancel"
        >
          <Square :size="12" />
          {{ $t('common.actions.cancel') }}
        </button>
      </div>

      <!-- Output -->
      <div v-if="output || isRunning || error">
        <label class="mb-1 block text-xs text-text-muted">{{ $t('fim.completion') }}</label>
        <div class="rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs whitespace-pre-wrap">
          <span v-if="output" class="text-accent">{{ output }}</span>
          <span v-else-if="isRunning" class="text-text-muted italic">{{ $t('fim.streaming') }}</span>
          <span v-else-if="error" class="text-error">{{ error }}</span>
        </div>

        <!-- Stitched preview -->
        <div v-if="output && !isRunning" class="mt-3">
          <label class="mb-1 block text-xs text-text-muted">{{ $t('fim.stitched') }}</label>
          <div class="rounded-lg border border-border-default bg-surface px-3 py-2 font-mono text-xs whitespace-pre-wrap">
            <span class="text-text-secondary">{{ prefix }}</span><span class="bg-accent/10 text-accent">{{ output }}</span><span class="text-text-secondary">{{ suffix }}</span>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div v-if="metrics" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg border border-border-default bg-surface px-3 py-2">
          <p class="text-[10px] text-text-muted">{{ $t('fim.metrics.totalDuration') }}</p>
          <p class="mt-0.5 text-sm font-medium text-text-primary">{{ formatMs(metrics.totalDuration) }}</p>
        </div>
        <div class="rounded-lg border border-border-default bg-surface px-3 py-2">
          <p class="text-[10px] text-text-muted">{{ $t('fim.metrics.loadDuration') }}</p>
          <p class="mt-0.5 text-sm font-medium text-text-primary">{{ formatMs(metrics.loadDuration) }}</p>
        </div>
        <div class="rounded-lg border border-border-default bg-surface px-3 py-2">
          <p class="text-[10px] text-text-muted">{{ $t('fim.metrics.evalCount') }}</p>
          <p class="mt-0.5 text-sm font-medium text-text-primary">{{ metrics.evalCount ?? '—' }}</p>
        </div>
        <div class="rounded-lg border border-border-default bg-surface px-3 py-2">
          <p class="text-[10px] text-text-muted">{{ $t('fim.metrics.tokensPerSecond') }}</p>
          <p class="mt-0.5 text-sm font-medium text-text-primary">{{ tokensPerSecond ?? '—' }} tok/s</p>
        </div>
      </div>
    </div>
  </div>
</template>
