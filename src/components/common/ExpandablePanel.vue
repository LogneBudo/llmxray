<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  defaultExpanded?: boolean
}>()

const expanded = ref(true)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised">
    <button
      class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors rounded-t-lg"
      @click="expanded = !expanded"
    >
      <span>{{ title }}</span>
      <span class="text-text-muted transition-transform" :class="{ 'rotate-180': expanded }">▾</span>
    </button>
    <div v-if="expanded" class="border-t border-border-default px-4 py-3">
      <slot />
    </div>
  </div>
</template>
