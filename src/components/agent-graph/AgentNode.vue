<script setup lang="ts">
import { computed } from 'vue'
import type { AgentNode } from '@/types/agent'
import { nodeTypeColors } from '@/utils/color-scales'

const props = defineProps<{
  node: AgentNode & { x: number; y: number }
  selected: boolean
}>()

defineEmits<{
  select: [nodeId: string]
}>()

const borderColor = computed(() => nodeTypeColors[props.node.type] ?? '#94a3b8')

const typeIcons: Record<string, string> = {
  start: '▶',
  llm_call: '◈',
  tool_call: '⚡',
  decision: '◇',
  output: '■',
  error: '✕',
}
</script>

<template>
  <g
    :transform="`translate(${node.x}, ${node.y})`"
    class="cursor-pointer"
    @click="$emit('select', node.id)"
  >
    <rect
      width="180"
      height="60"
      rx="8"
      class="fill-surface-raised stroke-2"
      :stroke="borderColor"
      :class="{ 'stroke-[3]': selected }"
    />
    <text x="12" y="24" class="fill-text-primary text-xs font-medium" font-size="12">
      {{ typeIcons[node.type] ?? '•' }} {{ node.type }}
    </text>
    <text x="12" y="44" class="fill-text-secondary text-xs" font-size="11">
      {{ node.label.slice(0, 22) }}{{ node.label.length > 22 ? '...' : '' }}
    </text>
  </g>
</template>
