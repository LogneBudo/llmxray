<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: unknown
  maxDepth?: number
}>()

const formatted = computed(() => {
  try {
    return JSON.stringify(props.data, null, 2)
  } catch {
    return String(props.data)
  }
})
</script>

<template>
  <pre class="overflow-auto rounded-lg bg-surface p-3 text-xs text-text-secondary font-mono max-h-80">{{ formatted }}</pre>
</template>
