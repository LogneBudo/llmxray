<script setup lang="ts">
import { computed } from 'vue'
import { useToolCallStore } from '@/stores/toolcall-store'
import { formatDuration } from '@/utils/format'
import ToolCallCard from './ToolCallCard.vue'

const props = defineProps<{
  sessionId: string
}>()

const toolCallStore = useToolCallStore()

const toolCalls = computed(() => toolCallStore.getToolCalls(props.sessionId))

const totalDuration = computed(() => {
  return toolCalls.value.reduce((sum, tc) => sum + (tc.durationMs ?? 0), 0)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Summary -->
    <div class="flex items-center gap-4 rounded-lg border border-border-default bg-surface-raised p-4">
      <div class="text-sm text-text-secondary">
        <span class="font-semibold text-text-primary">{{ toolCalls.length }}</span> tool calls
      </div>
      <div v-if="totalDuration > 0" class="text-sm text-text-secondary">
        Total: <span class="text-text-primary">{{ formatDuration(totalDuration) }}</span>
      </div>
    </div>

    <!-- Timeline -->
    <div v-if="toolCalls.length > 0" class="space-y-3">
      <ToolCallCard
        v-for="tc in toolCalls"
        :key="tc.id"
        :entry="tc"
      />
    </div>

    <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
      <p>No tool calls in this session.</p>
      <p class="mt-1">Use chat mode with tool definitions to see tool call activity.</p>
    </div>
  </div>
</template>
