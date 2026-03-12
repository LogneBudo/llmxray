<script setup lang="ts">
import { computed } from 'vue'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import type { WorkshopTool, ToolCategory } from '@/types/tool-workshop'

const store = useToolWorkshopStore()

const emit = defineEmits<{
  newTool: []
  addTemplate: []
}>()

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  api: 'API',
  data: 'Data',
  utility: 'Utility',
  custom: 'Custom',
  google: 'Google',
}

const CATEGORY_ORDER: ToolCategory[] = ['api', 'data', 'utility', 'custom']

const groupedTools = computed(() => {
  const groups: { category: ToolCategory; label: string; tools: WorkshopTool[] }[] = []
  for (const cat of CATEGORY_ORDER) {
    const tools = store.toolsByCategory[cat]
    if (tools && tools.length > 0) {
      groups.push({ category: cat, label: CATEGORY_LABELS[cat], tools })
    }
  }
  return groups
})

const hasTools = computed(() => store.allTools.length > 0)
</script>

<template>
  <div class="flex flex-col h-full border-r border-border-default bg-surface-raised">
    <!-- Header -->
    <div class="p-3 border-b border-border-default">
      <h3 class="text-sm font-medium text-text-primary">Tools</h3>
      <p class="text-[10px] text-text-muted mt-0.5">{{ store.allTools.length }} defined, {{ store.enabledTools.length }} active</p>
    </div>

    <!-- Tool list -->
    <div class="flex-1 overflow-y-auto p-2 space-y-3">
      <template v-if="hasTools">
        <div v-for="group in groupedTools" :key="group.category">
          <p class="text-[10px] font-medium text-text-muted uppercase tracking-wider px-2 mb-1">{{ group.label }}</p>
          <button
            v-for="tool in group.tools"
            :key="tool.id"
            class="w-full text-left rounded-md px-2.5 py-2 transition-colors"
            :class="store.selectedToolId === tool.id
              ? 'bg-accent/10 border border-accent/30'
              : 'hover:bg-surface-overlay border border-transparent'"
            @click="store.selectTool(tool.id)"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-primary truncate">{{ tool.definition.function.name }}</span>
              <span
                class="h-1.5 w-1.5 rounded-full shrink-0"
                :class="tool.enabled ? 'bg-success' : 'bg-border-default'"
              />
            </div>
            <p class="text-[10px] text-text-muted truncate mt-0.5">{{ tool.definition.function.description }}</p>
          </button>
        </div>
      </template>

      <div v-else class="text-center py-6">
        <p class="text-xs text-text-muted">No tools yet</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-2 border-t border-border-default space-y-1.5">
      <button
        class="w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-surface hover:bg-accent-hover transition-colors"
        @click="emit('newTool')"
      >
        + New Tool
      </button>
      <button
        class="w-full rounded-lg border border-dashed border-border-default px-3 py-1.5 text-[11px] text-text-muted hover:border-accent hover:text-text-primary transition-colors"
        @click="emit('addTemplate')"
      >
        From Template...
      </button>
    </div>
  </div>
</template>
