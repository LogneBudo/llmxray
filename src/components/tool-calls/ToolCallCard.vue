<script setup lang="ts">
import { ref } from 'vue'
import type { ToolCallEntry } from '@/types/toolcall'
import { formatDuration } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'
import JsonViewer from '@/components/common/JsonViewer.vue'

defineProps<{
  entry: ToolCallEntry
}>()

const expanded = ref(false)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised">
    <button
      class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-overlay transition-colors"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3">
        <span class="text-base">⚡</span>
        <div>
          <span class="text-sm font-medium text-text-primary">{{ entry.functionName }}</span>
          <span class="ml-2 text-xs text-text-muted">
            {{ entry.durationMs != null ? formatDuration(entry.durationMs) : 'pending' }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <StatusBadge :status="entry.status" />
        <span class="text-text-muted transition-transform text-xs" :class="{ 'rotate-180': expanded }">▾</span>
      </div>
    </button>
    <div v-if="expanded" class="border-t border-border-default p-4 space-y-3">
      <div>
        <div class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Arguments</div>
        <JsonViewer :data="entry.arguments" />
      </div>
      <div v-if="entry.result !== undefined">
        <div class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Result</div>
        <JsonViewer :data="entry.result" />
      </div>
      <div v-if="entry.error">
        <div class="text-xs font-medium text-error uppercase tracking-wide mb-1">Error</div>
        <pre class="rounded-lg bg-error/10 p-3 text-xs text-error">{{ entry.error }}</pre>
      </div>
    </div>
  </div>
</template>
