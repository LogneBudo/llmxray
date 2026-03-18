<script setup lang="ts">
import { computed } from 'vue'
import { useModelStore } from '@/stores/model-store'
import { resolveCapabilities } from '@/utils/capability-defs'

const props = defineProps<{
  modelName: string
}>()

const modelStore = useModelStore()

const icons = computed(() => resolveCapabilities(modelStore.getCapabilities(props.modelName)))
</script>

<template>
  <span v-if="icons.length > 0" class="inline-flex items-center gap-0.5">
    <component
      :is="icon.icon"
      v-for="icon in icons"
      :key="icon.key"
      class="h-3 w-3 shrink-0"
      :class="icon.color"
      :title="icon.label"
    />
  </span>
</template>
