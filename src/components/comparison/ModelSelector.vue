<script setup lang="ts">
import { useModelStore } from '@/stores/model-store'
import { onMounted } from 'vue'
import ModelCapabilityIcons from '@/components/common/ModelCapabilityIcons.vue'

const modelStore = useModelStore()

const selectedModels = defineModel<string[]>('selectedModels', { default: () => [] })

defineProps<{
  maxSelections?: number
}>()

function toggleModel(name: string) {
  const max = 4
  const idx = selectedModels.value.indexOf(name)
  if (idx >= 0) {
    selectedModels.value = selectedModels.value.filter((m) => m !== name)
  } else if (selectedModels.value.length < max) {
    selectedModels.value = [...selectedModels.value, name]
  }
}

onMounted(async () => {
  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
})
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="text-sm font-medium text-text-secondary mb-3">Select Models (max 4)</h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="model in modelStore.models"
        :key="model.name"
        class="rounded-lg border px-3 py-1.5 text-sm transition-colors"
        :class="
          selectedModels.includes(model.name)
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-border-default text-text-secondary hover:border-accent hover:text-text-primary'
        "
        @click="toggleModel(model.name)"
      >
        {{ model.name }}
        <ModelCapabilityIcons :model-name="model.name" />
      </button>
    </div>
  </div>
</template>
