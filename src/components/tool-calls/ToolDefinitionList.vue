<script setup lang="ts">
import { ref } from 'vue'
import { useToolDefinitionStore } from '@/stores/tool-definition-store'
import type { OllamaToolDefinition } from '@/types/ollama'
import ToolDefinitionBuilder from './ToolDefinitionBuilder.vue'

const toolStore = useToolDefinitionStore()

const showBuilder = ref(false)
const editingId = ref<string | null>(null)

function handleSave(definition: OllamaToolDefinition) {
  if (editingId.value) {
    toolStore.updateDefinition(editingId.value, definition)
  } else {
    toolStore.addDefinition(definition)
  }
  showBuilder.value = false
  editingId.value = null
}

function startEdit(id: string) {
  editingId.value = id
  showBuilder.value = true
}

function cancelBuilder() {
  showBuilder.value = false
  editingId.value = null
}

const editingDefinition = () => {
  if (!editingId.value) return undefined
  return toolStore.getById(editingId.value)?.definition
}
</script>

<template>
  <div>
    <!-- Builder overlay -->
    <div v-if="showBuilder" class="border-b border-border-default">
      <div class="flex items-center justify-between px-4 pt-3">
        <span class="text-xs font-medium text-text-secondary">
          {{ editingId ? 'Edit Tool' : 'New Tool' }}
        </span>
      </div>
      <ToolDefinitionBuilder
        :initial="editingDefinition()"
        @save="handleSave"
        @cancel="cancelBuilder"
      />
    </div>

    <!-- Tool list -->
    <div v-if="!showBuilder" class="space-y-1 p-3">
      <div
        v-for="tool in toolStore.allDefinitions"
        :key="tool.id"
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-overlay transition-colors"
      >
        <!-- Toggle -->
        <button
          class="h-4 w-7 shrink-0 rounded-full transition-colors"
          :class="tool.enabled ? 'bg-accent' : 'bg-surface-overlay'"
          @click="toolStore.toggleEnabled(tool.id)"
        >
          <span
            class="block h-3 w-3 rounded-full bg-white transition-transform"
            :class="tool.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
          />
        </button>

        <div class="min-w-0 flex-1">
          <span class="font-mono text-text-primary">{{ tool.definition.function.name }}</span>
          <p class="truncate text-[10px] text-text-muted">{{ tool.definition.function.description }}</p>
        </div>

        <button
          class="shrink-0 text-text-muted hover:text-text-primary transition-colors"
          title="Edit"
          @click="startEdit(tool.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <button
          class="shrink-0 text-text-muted hover:text-error transition-colors"
          title="Delete"
          @click="toolStore.removeDefinition(tool.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <p v-if="toolStore.allDefinitions.length === 0" class="px-3 py-2 text-xs text-text-muted">
        No tools defined yet.
      </p>

      <button
        class="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-accent hover:bg-accent/10 transition-colors"
        @click="showBuilder = true"
      >
        + Add Tool
      </button>
    </div>
  </div>
</template>
