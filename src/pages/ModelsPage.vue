<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { useIntrospectionStore } from '@/stores/introspection-store'
import { loadModelInfo } from '@/services/model-service'
import { formatBytes } from '@/utils/format'
import ModelArchitectureDiagram from '@/components/introspection/ModelArchitectureDiagram.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ModelCapabilityIcons from '@/components/common/ModelCapabilityIcons.vue'

const modelStore = useModelStore()
const introspectionStore = useIntrospectionStore()

const selectedModel = ref<string | null>(null)

const selectedArchitecture = computed(() => {
  if (!selectedModel.value) return null
  return introspectionStore.getArchitecture(selectedModel.value)
})

async function selectModel(name: string) {
  selectedModel.value = name
  if (!introspectionStore.getArchitecture(name)) {
    await loadModelInfo(name)
  }
}

onMounted(async () => {
  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="modelStore.loading" class="flex items-center gap-2 text-text-secondary">
      <LoadingSpinner />
      <span>Loading models...</span>
    </div>

    <div v-else-if="modelStore.error" class="rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
      {{ modelStore.error }}
    </div>

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Model list -->
      <div class="lg:col-span-1 space-y-2">
        <div
          v-for="model in modelStore.models"
          :key="model.name"
          class="cursor-pointer rounded-lg border p-3 transition-colors"
          :class="
            selectedModel === model.name
              ? 'border-accent bg-accent/5'
              : 'border-border-default bg-surface-raised hover:border-accent/50'
          "
          @click="selectModel(model.name)"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-text-primary">{{ model.name }}</span>
            <ModelCapabilityIcons :model-name="model.name" />
            <span v-if="model.details.format" class="rounded bg-surface px-1.5 py-0.5 text-[10px] text-text-muted uppercase">{{ model.details.format }}</span>
          </div>
          <div class="mt-1 flex gap-3 text-xs text-text-muted">
            <span>{{ model.details.parameter_size }}</span>
            <span>{{ model.details.quantization_level }}</span>
            <span>{{ formatBytes(model.size) }}</span>
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-text-muted">
            <span>{{ model.details.family }}</span>
            <span v-if="model.details.parent_model" class="text-text-muted">&larr; {{ model.details.parent_model }}</span>
          </div>
          <div v-if="modelStore.getModelDetails(model.name)?.license" class="mt-1">
            <span class="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {{ modelStore.getModelDetails(model.name)?.license.split('\n')[0]?.slice(0, 40) }}
            </span>
          </div>
        </div>

        <div v-if="modelStore.models.length === 0" class="p-4 text-sm text-text-muted text-center">
          No models found. Make sure Ollama is running.
        </div>
      </div>

      <!-- Model details -->
      <div class="lg:col-span-2">
        <div v-if="selectedArchitecture">
          <ModelArchitectureDiagram :architecture="selectedArchitecture" :model-name="selectedModel!" />
        </div>
        <div v-else-if="selectedModel" class="flex items-center gap-2 text-text-secondary p-4">
          <LoadingSpinner />
          <span>Loading model info...</span>
        </div>
        <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
          Select a model to view its architecture.
        </div>
      </div>
    </div>
  </div>
</template>
