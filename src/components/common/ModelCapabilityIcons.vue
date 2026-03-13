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
    <svg
      v-for="icon in icons"
      :key="icon.key"
      class="h-3 w-3 shrink-0"
      :class="icon.color"
      :title="icon.label"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path :d="icon.svg" />
    </svg>
  </span>
</template>
