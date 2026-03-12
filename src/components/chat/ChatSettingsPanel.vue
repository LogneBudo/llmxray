<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatSettings } from '@/types/conversation'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { useMemoryStore } from '@/stores/memory-store'
import { useModelStore } from '@/stores/model-store'
import { ollamaClient } from '@/services/ollama-client'
import { useRouter } from 'vue-router'

const props = defineProps<{
  modelValue: ChatSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChatSettings]
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
    <div class="space-y-5 p-4">
      <!-- System Prompt -->
      <div>
        <label class="mb-1.5 block text-xs font-medium text-text-secondary">System Prompt</label>
        <textarea
          v-model="systemPrompt"
          rows="6"
          class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
          placeholder="You are a helpful assistant..."
        />
        <p class="mt-1 text-[10px] text-text-muted">
          Instructions sent before the conversation. Sets the model's behavior and persona.
        </p>
      </div>

      <!-- Temperature -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">Temperature</label>
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
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <!-- Max Tokens -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">Max Tokens</label>
          <span class="text-xs text-text-muted">{{ numPredict === -1 ? 'Unlimited' : numPredict }}</span>
        </div>
        <input
          v-model.number="numPredict"
          type="number"
          min="-1"
          max="32768"
          class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          placeholder="-1 for unlimited"
        />
        <p class="mt-1 text-[10px] text-text-muted">
          Maximum response length. -1 = unlimited.
        </p>
      </div>

      <!-- Context Window -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-text-secondary">Context Window</label>
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
          Total context the model can see. Higher = more memory, slower.
        </p>
      </div>

      <!-- Advanced toggle -->
      <button
        class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showAdvanced = !showAdvanced"
      >
        <span>Advanced Sampling</span>
        <span class="transition-transform" :class="{ 'rotate-180': showAdvanced }">▾</span>
      </button>

      <div v-if="showAdvanced" class="space-y-4 pl-1">
        <!-- Top-P -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Top-P</label>
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
            Nucleus sampling. Lower = more focused on likely tokens.
          </p>
        </div>

        <!-- Top-K -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Top-K</label>
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
            Limits sampling to the top K tokens at each step.
          </p>
        </div>

        <!-- Repeat Penalty -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Repeat Penalty</label>
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
            Penalizes tokens that already appeared. Higher = less repetition.
          </p>
        </div>

        <!-- Mirostat -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Mirostat</label>
            <span class="text-xs text-text-muted">{{ mirostat === 0 ? 'Off' : `v${mirostat}` }}</span>
          </div>
          <select
            v-model.number="mirostat"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          >
            <option :value="0">Disabled</option>
            <option :value="1">Mirostat v1</option>
            <option :value="2">Mirostat v2</option>
          </select>
          <p class="mt-1 text-[10px] text-text-muted">
            Adaptive perplexity-based sampling. Overrides top-p/top-k when enabled.
          </p>
        </div>

        <!-- Seed -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Seed</label>
            <span class="text-xs text-text-muted">{{ seed === -1 ? 'Random' : seed }}</span>
          </div>
          <input
            v-model.number="seed"
            type="number"
            min="-1"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            placeholder="-1 for random"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            Fixed seed for reproducible outputs. -1 = random.
          </p>
        </div>

        <!-- Stop sequences -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-text-secondary">Stop Sequences</label>
          <input
            v-model="stopSequences"
            type="text"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
            placeholder="e.g. Human:, \n\n"
          />
          <p class="mt-1 text-[10px] text-text-muted">
            Comma-separated strings that stop generation when produced.
          </p>
        </div>
      </div>

      <!-- Tools toggle -->
      <button
        class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showTools = !showTools"
      >
        <span>
          Tools
          <span v-if="toolStore.enabledDefinitions.length > 0" class="ml-1 text-accent">
            ({{ toolStore.enabledDefinitions.length }} active)
          </span>
        </span>
        <span class="transition-transform" :class="{ 'rotate-180': showTools }">▾</span>
      </button>

      <div v-if="showTools" class="pl-1 space-y-2">
        <div v-if="toolStore.enabledTools.length > 0" class="space-y-1">
          <div
            v-for="tool in toolStore.enabledTools"
            :key="tool.id"
            class="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-[11px]"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
            <span class="font-mono text-text-primary">{{ tool.definition.function.name }}</span>
          </div>
        </div>
        <p v-else class="text-[10px] text-text-muted px-2">No tools enabled</p>
        <button
          class="w-full rounded-lg border border-dashed border-border-default px-3 py-1.5 text-[11px] text-text-muted hover:border-accent hover:text-text-primary transition-colors"
          @click="chatRouter.push('/tools')"
        >
          Manage in Tool Workshop...
        </button>
      </div>

      <!-- Memory toggle -->
      <button
        class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showMemory = !showMemory"
      >
        <span>
          Memory
          <span v-if="memoryStore.factCount > 0" class="ml-1 text-accent">
            ({{ memoryStore.factCount }} facts)
          </span>
        </span>
        <span class="transition-transform" :class="{ 'rotate-180': showMemory }">▾</span>
      </button>

      <div v-if="showMemory" class="space-y-4 pl-1">
        <!-- Sliding Window -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">Sliding Window</p>
            <p class="text-[10px] text-text-muted">Keep only the last N messages</p>
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
            <label class="text-[10px] text-text-muted">Max messages</label>
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
            <p class="text-xs font-medium text-text-secondary">Auto-Summarize</p>
            <p class="text-[10px] text-text-muted">Summarize older messages automatically</p>
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
            <label class="text-[10px] text-text-muted">Trigger after</label>
            <span class="text-[10px] text-text-muted">{{ memoryStore.settings.autoSummarize.triggerThreshold }} messages</span>
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
            <p class="text-xs font-medium text-text-secondary">User Memories</p>
            <p class="text-[10px] text-text-muted">/remember facts injected into context</p>
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
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- RAG Message Memory -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-text-secondary">Message Memory (RAG)</p>
            <p class="text-[10px] text-text-muted">Retrieve relevant past messages via embeddings</p>
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
            <label class="mb-1 block text-[10px] text-text-muted">Embedding Model</label>
            <select
              v-model="memoryStore.settings.ragMemory.embeddingModel"
              class="w-full rounded-lg border border-border-default bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            >
              <option value="" disabled>Select embedding model...</option>
              <option v-for="name in modelStore.embeddingModelNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>

          <!-- No embedding models available: suggest pulling one -->
          <div v-if="modelStore.embeddingModelNames.length === 0" class="rounded-lg border border-accent/20 bg-accent/5 p-2">
            <p class="mb-2 text-[10px] text-accent">No embedding models found. Pull one:</p>
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
                  {{ isPulling && pullModelName === model.name ? 'Pulling...' : 'Pull' }}
                </button>
              </div>
            </div>
            <p v-if="pullStatus" class="mt-2 text-[9px] text-text-muted">{{ pullStatus }}</p>
          </div>

          <!-- Top-K slider -->
          <div>
            <div class="mb-1 flex items-center justify-between">
              <label class="text-[10px] text-text-muted">Retrieve top</label>
              <span class="text-[10px] text-text-muted">{{ memoryStore.settings.ragMemory.topK }} messages</span>
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
