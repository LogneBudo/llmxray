<script setup lang="ts">
import { onMounted } from 'vue'
import type { HeatmapMode } from '@/types/token'
import { useModelStore } from '@/stores/model-store'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const modelStore = useModelStore()

const selectedModel = defineModel<string>('selectedModel', { default: '' })
const prompt = defineModel<string>('prompt', { default: '' })

defineProps<{
  isStreaming: boolean
  heatmapMode: HeatmapMode
}>()

const emit = defineEmits<{
  run: []
  cancel: []
  'update:heatmapMode': [mode: HeatmapMode]
}>()

onMounted(async () => {
  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
  if (!selectedModel.value && modelStore.models.length > 0) {
    selectedModel.value = modelStore.models[0]!.name
  }
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <select
        v-model="selectedModel"
        class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        :disabled="isStreaming"
      >
        <option v-if="modelStore.models.length === 0" value="" disabled>
          {{ modelStore.loading ? 'Loading...' : 'No models available' }}
        </option>
        <option v-for="m in modelStore.models" :key="m.name" :value="m.name">
          {{ m.name }}
        </option>
      </select>

      <select
        :value="heatmapMode"
        class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        @change="emit('update:heatmapMode', ($event.target as HTMLSelectElement).value as HeatmapMode)"
      >
        <option value="confidence">Confidence</option>
        <option value="latency">Latency</option>
        <option value="position">Position</option>
      </select>

      <button
        v-if="!isStreaming"
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="!selectedModel || !prompt.trim()"
        @click="emit('run')"
      >
        Run
      </button>
      <button
        v-else
        class="flex items-center gap-2 rounded-lg bg-error/20 px-4 py-2 text-sm font-medium text-error hover:bg-error/30 transition-colors"
        @click="emit('cancel')"
      >
        <LoadingSpinner size="sm" />
        Cancel
      </button>
    </div>

    <textarea
      v-model="prompt"
      class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
      :disabled="isStreaming"
      rows="3"
      placeholder="Enter your prompt..."
      @keydown.ctrl.enter="!isStreaming && prompt.trim() && selectedModel && emit('run')"
    />
  </div>
</template>
