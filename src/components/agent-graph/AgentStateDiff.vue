<script setup lang="ts">
import type { AgentNode } from '@/types/agent'
import JsonViewer from '@/components/common/JsonViewer.vue'

const props = defineProps<{
  node: AgentNode | null
}>()
</script>

<template>
  <div v-if="node" class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
    <h4 class="text-sm font-medium text-text-primary">{{ node.label }}</h4>
    <div class="grid grid-cols-2 gap-2 text-xs text-text-secondary">
      <div>Type: <span class="text-text-primary">{{ node.type }}</span></div>
      <div>Step: <span class="text-text-primary">{{ node.stepIndex }}</span></div>
    </div>
    <div v-if="Object.keys(node.state).length > 0">
      <div class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">State</div>
      <JsonViewer :data="node.state" />
    </div>
  </div>
</template>
