<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { ChatSettings } from '@/types/conversation'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { useMemoryStore } from '@/stores/memory-store'
import { useModelStore } from '@/stores/model-store'
import { useRagStore } from '@/stores/rag-store'
import { ollamaClient } from '@/services/ollama-client'
import { useRouter } from 'vue-router'

const props = defineProps<{
  modelValue: ChatSettings
  selectedModel: string
  ragEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChatSettings]
  'update:ragEnabled': [value: boolean]
}>()

const systemPrompt = ref(props.modelValue.systemPrompt)
const temperature = ref(props.modelValue.options.temperature ?? 0.7)
const numPredict = ref(props.modelValue.options.num_predict ?? -1)
const numCtx = ref(props.modelValue.options.num_ctx ?? 4096)
const topP = ref(props.modelValue.options.top_p ?? 0.9)
const topK = ref(props.modelValue.options.top_k ?? 40)
const repeatPenalty = ref(props.modelValue.options.repeat_penalty ?? 1.1)
const seed = ref(props.modelValue.options.seed ?? -1)
const stopSequences = ref(props.modelValue.options.stop?.join(', ') ?? '')
const mirostat = ref(props.modelValue.options.mirostat ?? 0)

// Sync from parent when model defaults change
watch(() => props.modelValue.options, (opts) => {
  temperature.value = opts.temperature ?? 0.7
  numPredict.value = opts.num_predict ?? -1
  numCtx.value = opts.num_ctx ?? 4096
  topP.value = opts.top_p ?? 0.9
  topK.value = opts.top_k ?? 40
  repeatPenalty.value = opts.repeat_penalty ?? 1.1
  seed.value = opts.seed ?? -1
  stopSequences.value = opts.stop?.join(', ') ?? ''
  mirostat.value = opts.mirostat ?? 0
}, { deep: true })

// Emit on any change
watch(
  [systemPrompt, temperature, numPredict, numCtx, topP, topK, repeatPenalty, seed, stopSequences, mirostat],
  () => {
    const stops = stopSequences.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    emit('update:modelValue', {
      systemPrompt: systemPrompt.value,
      options: {
        temperature: temperature.value,
        num_predict: numPredict.value === -1 ? undefined : numPredict.value,
        num_ctx: numCtx.value,
        top_p: topP.value,
        top_k: topK.value,
        repeat_penalty: repeatPenalty.value,
        seed: seed.value === -1 ? undefined : seed.value,
        stop: stops.length > 0 ? stops : undefined,
        mirostat: mirostat.value,
      },
    })
  },
  { deep: true },
)

// Sync from parent if modelValue changes externally
watch(
  () => props.modelValue,
  (val) => {
    systemPrompt.value = val.systemPrompt
    temperature.value = val.options.temperature ?? 0.7
    numPredict.value = val.options.num_predict ?? -1
    numCtx.value = val.options.num_ctx ?? 4096
    topP.value = val.options.top_p ?? 0.9
    topK.value = val.options.top_k ?? 40
    repeatPenalty.value = val.options.repeat_penalty ?? 1.1
    seed.value = val.options.seed ?? -1
    mirostat.value = val.options.mirostat ?? 0
  },
)

const toolStore = useToolWorkshopStore()
const chatRouter = useRouter()
const memoryStore = useMemoryStore()
const modelStore = useModelStore()
const ragStore = useRagStore()

const modelSupportsTools = computed(() => modelStore.supportsTools(props.selectedModel))

// Auto-disable all tools when switching to a model that doesn't support them
watch(() => props.selectedModel, (name) => {
  if (name && !modelStore.supportsTools(name) && toolStore.enabledTools.length > 0) {
    toolStore.disableAll()
  }
})
const showAdvanced = ref(false)
const showTools = ref(false)
const showMemory = ref(false)
const isPulling = ref(false)
const pullStatus = ref('')
const pullModelName = ref('')

// Well-known embedding models that users can pull
const SUGGESTED_EMBEDDING_MODELS = [
  { name: 'nomic-embed-text', description: 'Nomic — 137M params, fast & good', size: '274 MB' },
  { name: 'mxbai-embed-large', description: 'mixedbread.ai — 335M params, high quality', size: '670 MB' },
  { name: 'all-minilm', description: 'MiniLM — 23M params, very lightweight', size: '46 MB' },
  { name: 'snowflake-arctic-embed', description: 'Snowflake — 110M params, balanced', size: '229 MB' },
]

async function pullEmbeddingModel(name: string) {
  isPulling.value = true
  pullModelName.value = name
  pullStatus.value = 'Starting download...'
  try {
    await ollamaClient.pullModel(name, (status, completed, total) => {
      if (completed && total) {
        const pct = Math.round((completed / total) * 100)
        pullStatus.value = `${status} ${pct}%`
      } else {
        pullStatus.value = status
      }
    })
    pullStatus.value = 'Done!'
    // Refresh model list
    await modelStore.fetchModels()
    // Auto-select the pulled model
    memoryStore.settings.ragMemory.embeddingModel = name
  } catch (e) {
    pullStatus.value = `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  } finally {
    isPulling.value = false
    setTimeout(() => {
      pullStatus.value = ''
      pullModelName.value = ''
    }, 3000)
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto">
    <div class="space-y-5 p-4 pb-12">
      <!-- System Prompt -->
      <div>
        <label class="mb-1.5 block text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.systemPrompt') }}</label>
        <textarea
          v-model="systemPrompt"
          rows="6"
          class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
          :placeholder="$t('dashboard.settings.systemPromptPlaceholder')"
        />
        <p class="mt-1 text-[10px] text-text-muted">
          {{ $t('dashboard.settings.systemPromptHint') }}
        </p>
      </div>

      <!-- Knowledge Base toggle -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.knowledgeBase') }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            :class="ragEnabled && ragStore.readyDocuments.length > 0
              ? 'bg-accent/10 text-accent'
              : 'bg-surface-overlay text-text-muted'"
          >
            {{ ragEnabled && ragStore.readyDocuments.length > 0 ? $t('dashboard.settings.kbEnabled') : $t('dashboard.settings.kbDisabled') }}
          </span>
        </div>
        <button
          class="h-4 w-7 shrink-0 rounded-full transition-colors"
          :class="ragEnabled && ragStore.readyDocuments.length > 0 ? 'bg-accent' : 'bg-surface-overlay'"
          :disabled="ragStore.readyDocuments.length === 0"
          @click="emit('update:ragEnabled', !ragEnabled)"
        >
          <span
            class="block h-3 w-3 rounded-full bg-white transition-transform"
            :class="ragEnabled && ragStore.readyDocuments.length > 0 ? 'translate-x-3.5' : 'translate-x-0.5'"
          />
        </button>
      </div>
      <p v-if="ragStore.readyDocuments.length > 0" class="text-[10px] text-text-muted -mt-3">
        {{ ragStore.enabledDocuments.length }}/{{ ragStore.readyDocuments.length }} {{ $t('dashboard.settings.documents') }} &middot;
        <button class="text-accent hover:underline" @click="chatRouter.push('/rag')">{{ $t('dashboard.settings.manage') }}</button>
      </p>
      <p v-else class="text-[10px] text-text-muted -mt-3">
        {{ $t('dashboard.settings.noDocumentsIngested') }} &middot;
        <button class="text-accent hover:underline" @click="chatRouter.push('/rag')">{{ $t('dashboard.settings.addDocuments') }}</button>
      </p>

      <!-- Temperature -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.temperature') }}</label>
          <span class="text-xs text-text-muted">{{ temperature.toFixed(2) }}</span>
        </div>
        <input
          v-model.number="temperature"
          type="range"
          min="0"
          max="2"
          step="0.05"
          class="w-full accent-accent"
        />
        <div class="mt-0.5 flex justify-between text-[10px] text-text-muted">
          <span>{{ $t('dashboard.settings.precise') }}</span>
          <span>{{ $t('dashboard.settings.creative') }}</span>
        </div>
      </div>

      <!-- Max Tokens -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.maxTokens') }}</label>
          <span class="text-xs text-text-muted">{{ numPredict === -1 ? $t('dashboard.settings.unlimited') : numPredict }}</span>
        </div>
        <input
          v-model.number="numPredict"
          type="number"
          min="-1"
          max="32768"
          class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          :placeholder="$t('dashboard.settings.maxTokensPlaceholder')"
        />
        <p class="mt-1 text-[10px] text-text-muted">
          {{ $t('dashboard.settings.maxTokensHint') }}
        </p>
      </div>

      <!-- Context Window -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.contextWindow') }}</label>
          <span class="text-xs text-text-muted">{{ numCtx.toLocaleString() }}</span>
        </div>
        <select
          v-model.number="numCtx"
          class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
        >
          <option :value="2048">2,048</option>
          <option :value="4096">4,096</option>
          <option :value="8192">8,192</option>
          <option :value="16384">16,384</option>
          <option :value="32768">32,768</option>
          <option :value="65536">65,536</option>
          <option :value="131072">131,072</option>
        </select>
        <p class="mt-1 text-[10px] text-text-muted">
          {{ $t('dashboard.settings.contextWindowHint') }}
        </p>
      </div>

      <!-- Advanced toggle -->
      <button
        class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showAdvanced = !showAdvanced"
      >
        <span>{{ $t('dashboard.settings.advancedSampling') }}</span>
        <span class="transition-transform" :class="{ 'rotate-180': showAdvanced }">▾</span>
      </button>

      <div v-if="showAdvanced" class="space-y-4 pl-1">
        <!-- Top-P -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.topP') }}</label>
            <span class="text-xs text-text-muted">{{ topP.toFixed(2) }}</span>
          </div>
          <input
            v-model.number="topP"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full accent-accent"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.topPHint') }}
          </p>
        </div>

        <!-- Top-K -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.topK') }}</label>
            <span class="text-xs text-text-muted">{{ topK }}</span>
          </div>
          <input
            v-model.number="topK"
            type="range"
            min="1"
            max="100"
            step="1"
            class="w-full accent-accent"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.topKHint') }}
          </p>
        </div>

        <!-- Repeat Penalty -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.repeatPenalty') }}</label>
            <span class="text-xs text-text-muted">{{ repeatPenalty.toFixed(2) }}</span>
          </div>
          <input
            v-model.number="repeatPenalty"
            type="range"
            min="1.0"
            max="2.0"
            step="0.05"
            class="w-full accent-accent"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.repeatPenaltyHint') }}
          </p>
        </div>

        <!-- Mirostat -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.mirostat') }}</label>
            <span class="text-xs text-text-muted">{{ mirostat === 0 ? $t('dashboard.settings.mirostatOff') : `v${mirostat}` }}</span>
          </div>
          <select
            v-model.number="mirostat"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          >
            <option :value="0">{{ $t('dashboard.settings.mirostatDisabled') }}</option>
            <option :value="1">{{ $t('dashboard.settings.mirostatV1') }}</option>
            <option :value="2">{{ $t('dashboard.settings.mirostatV2') }}</option>
          </select>
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.mirostatHint') }}
          </p>
        </div>

        <!-- Seed -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.seed') }}</label>
            <span class="text-xs text-text-muted">{{ seed === -1 ? $t('dashboard.settings.seedRandom') : seed }}</span>
          </div>
          <input
            v-model.number="seed"
            type="number"
            min="-1"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            :placeholder="$t('dashboard.settings.seedPlaceholder')"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.seedHint') }}
          </p>
        </div>

        <!-- Stop sequences -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-text-secondary">{{ $t('dashboard.settings.stopSequences') }}</label>
          <input
            v-model="stopSequences"
            type="text"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
            :placeholder="$t('dashboard.settings.stopSequencesPlaceholder')"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            {{ $t('dashboard.settings.stopSequencesHint') }}
          </p>
        </div>
      </div>

      <!-- Tools toggle (hidden when model doesn't support tools) -->
      <template v-if="modelSupportsTools">
        <button
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
          @click="showTools = !showTools"
        >
          <span>
            {{ $t('dashboard.settings.tools') }}
            <span v-if="toolStore.enabledDefinitions.length > 0" class="ml-1 text-accent">
              ({{ toolStore.enabledDefinitions.length }} {{ $t('dashboard.settings.active') }})
            </span>
          </span>
          <span class="transition-transform" :class="{ 'rotate-180': showTools }">▾</span>
        </button>

        <div v-if="showTools" class="pl-1 space-y-2">
        <div v-if="toolStore.allTools.length > 0" class="space-y-1">
          <div
            v-for="tool in toolStore.allTools"
            :key="tool.id"
            class="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-[11px]"
          >
            <button
              class="h-4 w-7 shrink-0 rounded-full transition-colors"
              :class="tool.enabled ? 'bg-accent' : 'bg-surface-overlay'"
              @click="toolStore.toggleEnabled(tool.id)"
            >
              <span
                class="block h-3 w-3 rounded-full bg-white transition-transform"
                :class="tool.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
              />
            </button>
            <span
              class="font-mono"
              :class="tool.enabled ? 'text-text-primary' : 'text-text-muted'"
            >
              {{ tool.definition.function.name }}
            </span>
          </div>
        </div>
        <p v-else class="text-[10px] text-text-muted px-2">{{ $t('dashboard.settings.noToolsDefined') }}</p>
        <button
          class="w-full rounded-lg border border-dashed border-border-default px-3 py-1.5 text-[11px] text-text-muted hover:border-accent hover:text-text-primary transition-colors"
          @click="chatRouter.push('/tools')"
        >
          {{ $t('dashboard.settings.manageInToolWorkshop') }}
        </button>
      </div>
      </template>

      <!-- Memory toggle -->
      <button
        class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showMemory = !showMemory"
      >
        <span>
          {{ $t('dashboard.memory.memory') }}
          <span v-if="memoryStore.factCount > 0" class="ml-1 text-accent">
            ({{ memoryStore.factCount }} {{ $t('dashboard.memory.facts') }})
          </span>
        </span>
        <span class="transition-transform" :class="{ 'rotate-180': showMemory }">▾</span>
      </button>

      <div v-if="showMemory" class="space-y-4 pl-1">
        <!-- Sliding Window -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">{{ $t('dashboard.memory.slidingWindow') }}</p>
            <p class="text-[10px] text-text-muted">{{ $t('dashboard.memory.slidingWindowHint') }}</p>
          </div>
          <button
            class="h-4 w-7 shrink-0 rounded-full transition-colors"
            :class="memoryStore.settings.slidingWindow.enabled ? 'bg-accent' : 'bg-surface-overlay'"
            @click="memoryStore.settings.slidingWindow.enabled = !memoryStore.settings.slidingWindow.enabled"
          >
            <span
              class="block h-3 w-3 rounded-full bg-white transition-transform"
              :class="memoryStore.settings.slidingWindow.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </button>
        </div>
        <div v-if="memoryStore.settings.slidingWindow.enabled">
          <div class="mb-1 flex items-center justify-between">
            <label class="text-[10px] text-text-muted">{{ $t('dashboard.memory.maxMessages') }}</label>
            <span class="text-[10px] text-text-muted">{{ memoryStore.settings.slidingWindow.maxMessages }}</span>
          </div>
          <input
            v-model.number="memoryStore.settings.slidingWindow.maxMessages"
            type="range"
            min="10"
            max="200"
            step="10"
            class="w-full accent-accent"
          />
        </div>

        <!-- Auto-Summarization -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">{{ $t('dashboard.memory.autoSummarize') }}</p>
            <p class="text-[10px] text-text-muted">{{ $t('dashboard.memory.autoSummarizeHint') }}</p>
          </div>
          <button
            class="h-4 w-7 shrink-0 rounded-full transition-colors"
            :class="memoryStore.settings.autoSummarize.enabled ? 'bg-accent' : 'bg-surface-overlay'"
            @click="memoryStore.settings.autoSummarize.enabled = !memoryStore.settings.autoSummarize.enabled"
          >
            <span
              class="block h-3 w-3 rounded-full bg-white transition-transform"
              :class="memoryStore.settings.autoSummarize.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </button>
        </div>
        <div v-if="memoryStore.settings.autoSummarize.enabled">
          <div class="mb-1 flex items-center justify-between">
            <label class="text-[10px] text-text-muted">{{ $t('dashboard.memory.triggerAfter') }}</label>
            <span class="text-[10px] text-text-muted">{{ memoryStore.settings.autoSummarize.triggerThreshold }} {{ $t('dashboard.memory.messages') }}</span>
          </div>
          <input
            v-model.number="memoryStore.settings.autoSummarize.triggerThreshold"
            type="range"
            min="10"
            max="100"
            step="5"
            class="w-full accent-accent"
          />
        </div>

        <!-- User Facts -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">{{ $t('dashboard.memory.userMemories') }}</p>
            <p class="text-[10px] text-text-muted">{{ $t('dashboard.memory.userMemoriesHint') }}</p>
          </div>
          <button
            class="h-4 w-7 shrink-0 rounded-full transition-colors"
            :class="memoryStore.settings.userFacts.enabled ? 'bg-accent' : 'bg-surface-overlay'"
            @click="memoryStore.settings.userFacts.enabled = !memoryStore.settings.userFacts.enabled"
          >
            <span
              class="block h-3 w-3 rounded-full bg-white transition-transform"
              :class="memoryStore.settings.userFacts.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </button>
        </div>
        <div v-if="memoryStore.settings.userFacts.enabled && memoryStore.facts.length > 0" class="space-y-1">
          <div
            v-for="fact in memoryStore.facts"
            :key="fact.id"
            class="flex items-center gap-2 rounded-md bg-surface px-2 py-1 text-[11px]"
          >
            <span class="flex-1 text-text-secondary">{{ fact.content }}</span>
            <button
              class="shrink-0 text-text-muted hover:text-error transition-colors"
              @click="memoryStore.removeFact(fact.id)"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
        </div>

        <!-- RAG Message Memory -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">{{ $t('dashboard.memory.messageMemoryRag') }}</p>
            <p class="text-[10px] text-text-muted">{{ $t('dashboard.memory.messageMemoryHint') }}</p>
          </div>
          <button
            class="h-4 w-7 shrink-0 rounded-full transition-colors"
            :class="memoryStore.settings.ragMemory.enabled ? 'bg-accent' : 'bg-surface-overlay'"
            @click="memoryStore.settings.ragMemory.enabled = !memoryStore.settings.ragMemory.enabled"
          >
            <span
              class="block h-3 w-3 rounded-full bg-white transition-transform"
              :class="memoryStore.settings.ragMemory.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <div v-if="memoryStore.settings.ragMemory.enabled" class="space-y-2">
          <!-- Embedding model picker -->
          <div>
            <label class="mb-1 block text-[10px] text-text-muted">{{ $t('dashboard.memory.embeddingModel') }}</label>
            <select
              v-model="memoryStore.settings.ragMemory.embeddingModel"
              class="w-full rounded-lg border border-border-default bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            >
              <option value="" disabled>{{ $t('dashboard.memory.selectEmbeddingModel') }}</option>
              <option v-for="name in modelStore.embeddingModelNames" :key="name" :value="name">
                {{ name }} {{ modelStore.capabilityIcons(name) }}
              </option>
            </select>
          </div>

          <!-- No embedding models available: suggest pulling one -->
          <div v-if="modelStore.embeddingModelNames.length === 0" class="rounded-lg border border-accent/20 bg-accent/5 p-2">
            <p class="mb-2 text-[10px] text-accent">{{ $t('dashboard.memory.noEmbeddingModels') }}</p>
            <div class="space-y-1.5">
              <div
                v-for="model in SUGGESTED_EMBEDDING_MODELS"
                :key="model.name"
                class="flex items-center gap-2"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[11px] font-mono text-text-primary">{{ model.name }}</p>
                  <p class="text-[9px] text-text-muted">{{ model.description }} ({{ model.size }})</p>
                </div>
                <button
                  :disabled="isPulling"
                  class="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] text-white hover:bg-accent-hover disabled:opacity-30 transition-colors"
                  @click="pullEmbeddingModel(model.name)"
                >
                  {{ isPulling && pullModelName === model.name ? $t('dashboard.settings.pulling') : $t('dashboard.settings.pull') }}
                </button>
              </div>
            </div>
            <p v-if="pullStatus" class="mt-2 text-[9px] text-text-muted">{{ pullStatus }}</p>
          </div>

          <!-- Top-K slider -->
          <div>
            <div class="mb-1 flex items-center justify-between">
              <label class="text-[10px] text-text-muted">{{ $t('dashboard.memory.retrieveTop') }}</label>
              <span class="text-[10px] text-text-muted">{{ memoryStore.settings.ragMemory.topK }} {{ $t('dashboard.memory.messages') }}</span>
            </div>
            <input
              v-model.number="memoryStore.settings.ragMemory.topK"
              type="range"
              min="1"
              max="10"
              step="1"
              class="w-full accent-accent"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
