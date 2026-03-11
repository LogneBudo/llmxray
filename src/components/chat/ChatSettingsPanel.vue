<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatSettings } from '@/types/conversation'

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

const showAdvanced = ref(false)
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
    </div>
  </div>
</template>
