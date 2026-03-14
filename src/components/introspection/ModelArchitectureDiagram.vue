<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ModelArchitecture } from '@/types/introspection'
import { useModelStore } from '@/stores/model-store'
import { resolveCapabilities } from '@/utils/capability-defs'
import { formatParamCount } from '@/utils/format'
import { parseModelParameters } from '@/utils/parse-model-params'

const props = defineProps<{
  architecture: ModelArchitecture
  modelName?: string
}>()

const modelStore = useModelStore()

const modelInfo = computed(() => {
  if (!props.modelName) return null
  return modelStore.getModelDetails(props.modelName) ?? null
})

const modelDefaults = computed(() => {
  if (!modelInfo.value?.parameters) return null
  const parsed = parseModelParameters(modelInfo.value.parameters)
  return Object.keys(parsed).length > 0 ? parsed : null
})

const chatTemplate = computed(() => modelInfo.value?.template ?? null)

const showDefaults = ref(false)
const showTemplate = ref(false)

const capabilities = computed(() => {
  if (!props.modelName) return []
  return resolveCapabilities(modelStore.getCapabilities(props.modelName))
})

const layerTypeColors: Record<string, string> = {
  embedding: '#818cf8',
  attention: '#a855f7',
  feed_forward: '#fb923c',
  norm: '#94a3b8',
  output: '#4ade80',
}

// Show a compact representation: just unique block types
const blockSummary = computed(() => {
  const arch = props.architecture
  return [
    { label: 'Embedding', color: layerTypeColors.embedding, count: 1, desc: 'Converts input tokens into dense numerical vectors the model can process' },
    { label: 'Attention', color: layerTypeColors.attention, count: arch.blockCount, desc: 'Lets each token attend to every other token to capture relationships and context' },
    { label: 'FFN', color: layerTypeColors.feed_forward, count: arch.blockCount, desc: 'Feed-Forward Network — applies non-linear transformations to refine representations' },
    { label: 'LayerNorm', color: layerTypeColors.norm, count: arch.blockCount, desc: 'Normalizes activations between layers to stabilize and speed up training' },
    { label: 'Output', color: layerTypeColors.output, count: 1, desc: 'Projects the final hidden state back to vocabulary size to predict the next token' },
  ]
})

const activeTooltip = ref<string | null>(null)

function showTip(key: string) {
  activeTooltip.value = key
}
function hideTip() {
  activeTooltip.value = null
}
</script>

<template>
  <div class="space-y-4">
    <!-- Capabilities -->
    <div v-if="capabilities.length > 0" class="rounded-lg bg-surface p-4">
      <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Capabilities</h4>
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="cap in capabilities"
          :key="cap.key"
          class="relative flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5"
          @mouseenter="showTip('cap-' + cap.key)"
          @mouseleave="hideTip"
        >
          <svg v-if="cap.svg" class="h-3.5 w-3.5 shrink-0" :class="cap.color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="cap.svg" />
          </svg>
          <span class="text-xs font-medium" :class="cap.color">{{ cap.label }}</span>
          <div
            v-if="activeTooltip === 'cap-' + cap.key"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
          >
            {{ cap.desc }}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
          </div>
        </div>
      </div>
    </div>

    <!-- Architecture stats -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('family')" @mouseleave="hideTip">
        <div class="flex items-center gap-1 text-xs text-text-muted">
          Family
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        </div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.family }}</div>
        <div
          v-if="activeTooltip === 'family'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          The base model architecture family (e.g. llama, qwen). Models in the same family share the same neural network design.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('params')" @mouseleave="hideTip">
        <div class="flex items-center gap-1 text-xs text-text-muted">
          Parameters
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        </div>
        <div class="text-sm font-medium text-text-primary">{{ formatParamCount(architecture.totalParameters) }}</div>
        <div
          v-if="activeTooltip === 'params'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Total number of trainable weights in the model. More parameters generally means greater capability but requires more memory and compute.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('ctx')" @mouseleave="hideTip">
        <div class="flex items-center gap-1 text-xs text-text-muted">
          Context Length
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        </div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.contextLength.toLocaleString() }}</div>
        <div
          v-if="activeTooltip === 'ctx'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Maximum number of tokens (prompt + response) the model can process in a single conversation. Longer context allows more detailed instructions and longer conversations.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('quant')" @mouseleave="hideTip">
        <div class="flex items-center gap-1 text-xs text-text-muted">
          Quantization
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        </div>
        <div class="text-sm font-medium text-text-primary">{{ architecture.quantization }}</div>
        <div
          v-if="activeTooltip === 'quant'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          How model weights are compressed. Q4_K_M means 4-bit quantization with K-quant medium quality — smaller file size and faster inference with a small quality trade-off vs full precision (F16/F32).
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
    </div>

    <!-- Layer diagram -->
    <div class="rounded-lg bg-surface p-4">
      <div class="flex items-center gap-1 mb-3">
        <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide">Layer Structure ({{ architecture.blockCount }} blocks)</h4>
        <div class="relative" @mouseenter="showTip('layers')" @mouseleave="hideTip">
          <svg class="h-3 w-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <div
            v-if="activeTooltip === 'layers'"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
          >
            Transformer models are built from repeated blocks. Each block contains attention, feed-forward, and normalization layers. More blocks = deeper model.
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="block in blockSummary"
          :key="block.label"
          class="relative flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
          @mouseenter="showTip('block-' + block.label)"
          @mouseleave="hideTip"
        >
          <div class="h-3 w-3 rounded-sm" :style="{ backgroundColor: block.color }" />
          <span class="text-xs text-text-primary">{{ block.label }}</span>
          <span class="text-xs text-text-muted">&times;{{ block.count }}</span>
          <div
            v-if="activeTooltip === 'block-' + block.label"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
          >
            {{ block.desc }}
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
          </div>
        </div>
      </div>
    </div>

    <!-- Architecture details -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('aheads')" @mouseleave="hideTip">
        <span class="text-text-muted">Attention Heads</span>
        <svg class="inline ml-1 h-3 w-3 text-text-muted align-text-top" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span class="ml-1 text-text-primary">{{ architecture.attentionHeadCount }}</span>
        <div
          v-if="activeTooltip === 'aheads'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Number of parallel attention computations per layer. Each head learns to focus on different patterns (syntax, semantics, position, etc.).
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('kvheads')" @mouseleave="hideTip">
        <span class="text-text-muted">KV Heads</span>
        <svg class="inline ml-1 h-3 w-3 text-text-muted align-text-top" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span class="ml-1 text-text-primary">{{ architecture.kvHeadCount }}</span>
        <div
          v-if="activeTooltip === 'kvheads'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Key-Value heads used in Grouped Query Attention (GQA). Fewer KV heads than attention heads means memory savings — multiple query heads share the same key/value projections.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('embdim')" @mouseleave="hideTip">
        <span class="text-text-muted">Embedding Dim</span>
        <svg class="inline ml-1 h-3 w-3 text-text-muted align-text-top" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span class="ml-1 text-text-primary">{{ architecture.embeddingLength }}</span>
        <div
          v-if="activeTooltip === 'embdim'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Size of the vector representing each token inside the model. Larger dimensions can capture richer semantic information but increase memory and compute.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
      <div class="relative rounded-lg bg-surface p-3" @mouseenter="showTip('ffndim')" @mouseleave="hideTip">
        <span class="text-text-muted">FFN Dim</span>
        <svg class="inline ml-1 h-3 w-3 text-text-muted align-text-top" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        <span class="ml-1 text-text-primary">{{ architecture.feedForwardLength }}</span>
        <div
          v-if="activeTooltip === 'ffndim'"
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-xs text-text-secondary shadow-lg z-10"
        >
          Width of the feed-forward network's hidden layer. Typically 2-4x the embedding dimension. This is where much of the model's "knowledge" is stored as learned patterns.
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-surface-overlay" />
        </div>
      </div>
    </div>

    <!-- Model Defaults -->
    <div v-if="modelDefaults" class="rounded-lg bg-surface">
      <button
        class="flex w-full items-center justify-between p-4 text-left"
        @click="showDefaults = !showDefaults"
      >
        <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide">Model Defaults</h4>
        <svg
          class="h-4 w-4 text-text-muted transition-transform"
          :class="showDefaults ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div v-if="showDefaults" class="border-t border-border-default px-4 pb-4 pt-2">
        <table class="w-full text-xs">
          <tr v-for="(value, key) in modelDefaults" :key="key" class="border-b border-border-default/50 last:border-0">
            <td class="py-1.5 pr-4 text-text-muted font-mono">{{ key }}</td>
            <td class="py-1.5 text-text-primary font-mono">{{ value }}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Chat Template -->
    <div v-if="chatTemplate" class="rounded-lg bg-surface">
      <button
        class="flex w-full items-center justify-between p-4 text-left"
        @click="showTemplate = !showTemplate"
      >
        <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide">Chat Template</h4>
        <svg
          class="h-4 w-4 text-text-muted transition-transform"
          :class="showTemplate ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div v-if="showTemplate" class="border-t border-border-default px-4 pb-4 pt-2">
        <pre class="overflow-auto rounded-lg bg-surface-raised p-3 text-xs text-text-secondary font-mono leading-relaxed">{{ chatTemplate }}</pre>
      </div>
    </div>
  </div>
</template>
