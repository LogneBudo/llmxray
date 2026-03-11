<script setup lang="ts">
defineProps<{
  tabs: Array<{ key: string; label: string }>
  activeTab: string
}>()

const emit = defineEmits<{
  'update:activeTab': [key: string]
}>()
</script>

<template>
  <div class="flex gap-1 border-b border-border-default">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="px-4 py-2 text-sm font-medium transition-colors border-b-2"
      :class="
        activeTab === tab.key
          ? 'border-accent text-accent'
          : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
      "
      @click="emit('update:activeTab', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
