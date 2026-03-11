<script setup lang="ts">
import type { ComparisonExecution } from '@/types/comparison'
import ComparisonColumn from './ComparisonColumn.vue'

defineProps<{
  executions: ComparisonExecution[]
}>()
</script>

<template>
  <div
    class="grid gap-4"
    :class="{
      'grid-cols-1': executions.length === 1,
      'grid-cols-2': executions.length === 2,
      'grid-cols-2 xl:grid-cols-3': executions.length === 3,
      'grid-cols-2 xl:grid-cols-4': executions.length >= 4,
    }"
  >
    <ComparisonColumn
      v-for="exec in executions"
      :key="exec.model"
      :execution="exec"
    />
  </div>
</template>
