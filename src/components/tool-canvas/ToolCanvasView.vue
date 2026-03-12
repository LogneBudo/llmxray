<script setup lang="ts">
import { ref, computed, markRaw, nextTick, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { NodeDragEvent } from '@vue-flow/core'
import { useToolCanvas } from '@/composables/useToolCanvas'

// Vue Flow required CSS
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

import ToolFunctionNode from './ToolFunctionNode.vue'
import CodeEditor from './CodeEditor.vue'

const emit = defineEmits<{
  'add-template': []
}>()

const nodeTypes = { 'tool-function': markRaw(ToolFunctionNode) } as any

const {
  flowNodes,
  flowEdges,
  combinedCode,
  codeWarnings,
  codeSyncStatus,
  schemas,
  onNodeDragStop,
  onCodeEdit,
  addNewTool,
} = useToolCanvas()

const { fitView } = useVueFlow()

// --- Code panel ---
const codePanelOpen = ref(false)
const activeTab = ref<'code' | 'schema'>('code')

// Re-fit view when code panel toggles (canvas real estate changes)
watch(codePanelOpen, () => {
  if (flowNodes.value.length > 0) {
    // Wait for the panel transition to settle, then re-fit
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 })
    }, 50)
  }
})

const schemaJson = computed(() => JSON.stringify(schemas.value, null, 2))

function handleDragStop(event: NodeDragEvent) {
  onNodeDragStop({ node: event.node })
}

function handleAddTool() {
  const id = addNewTool()
  nextTick(() => {
    fitView({ nodes: [id], padding: 0.5, duration: 300 })
  })
}

async function copySchema() {
  try {
    await navigator.clipboard.writeText(schemaJson.value)
  } catch {
    // fallback silently
  }
}
</script>

<template>
  <div class="flex h-full w-full relative">
    <!-- Code panel (collapsible) -->
    <div
      v-if="codePanelOpen"
      class="w-[440px] flex flex-col border-r border-border-default bg-surface-base shrink-0"
    >
      <!-- Header -->
      <div class="p-3 border-b border-border-default flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-text-primary">Code Panel</span>
          <span class="sync-dot" :class="codeSyncStatus"></span>
        </div>
        <button
          class="text-xs text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
          @click="codePanelOpen = false"
        >
          Close
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-border-default">
        <button
          @click="activeTab = 'code'"
          class="flex-1 px-3 py-2 text-xs uppercase tracking-wider border-none cursor-pointer transition-colors"
          :class="
            activeTab === 'code'
              ? 'bg-surface-raised text-accent font-bold'
              : 'bg-transparent text-text-muted'
          "
        >
          Source
        </button>
        <button
          @click="activeTab = 'schema'"
          class="flex-1 px-3 py-2 text-xs uppercase tracking-wider border-none cursor-pointer transition-colors"
          :class="
            activeTab === 'schema'
              ? 'bg-surface-raised text-success font-bold'
              : 'bg-transparent text-text-muted'
          "
        >
          Schema
        </button>
      </div>

      <!-- Code editor -->
      <div v-show="activeTab === 'code'" class="flex-1 flex flex-col p-3 gap-2 min-h-0 overflow-auto">
        <CodeEditor
          :model-value="combinedCode"
          language="typescript"
          placeholder="Combined tool source..."
          min-height="200px"
          @update:model-value="onCodeEdit"
        />
      </div>

      <!-- Schema viewer -->
      <div v-show="activeTab === 'schema'" class="flex-1 flex flex-col p-3 gap-2 min-h-0">
        <div class="flex items-center justify-between">
          <span class="text-xs text-text-muted">OpenAI-compatible tools manifest</span>
          <button
            @click="copySchema"
            class="px-2 py-1 text-xs rounded bg-surface-overlay text-text-secondary hover:bg-surface-raised transition-colors cursor-pointer border-none"
          >
            Copy
          </button>
        </div>
        <div class="flex-1 overflow-auto">
          <CodeEditor
            :model-value="schemaJson"
            language="json"
            :readonly="true"
            min-height="200px"
          />
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="codeWarnings.length > 0" class="p-3 border-t border-border-default">
        <label class="text-xs text-warning uppercase tracking-wider">Warnings</label>
        <ul class="mt-1 text-xs text-warning/80 list-disc pl-4 space-y-0.5">
          <li v-for="(w, i) in codeWarnings" :key="i">{{ w }}</li>
        </ul>
      </div>

      <!-- Stats -->
      <div class="p-3 border-t border-border-default text-xs text-text-muted">
        {{ flowNodes.length }} tool{{ flowNodes.length !== 1 ? 's' : '' }} &middot;
        {{ schemas.length }} schema{{ schemas.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Canvas -->
    <div class="flex-1 relative min-h-0 overflow-hidden">
      <VueFlow
        :nodes="flowNodes"
        :edges="flowEdges"
        :node-types="nodeTypes"
        :default-viewport="{ x: 40, y: 40, zoom: 1 }"
        :min-zoom="0.3"
        :max-zoom="2"
        :fit-view-on-init="flowNodes.length > 0"
        :fit-view-on-init-options="{ padding: 0.3, minZoom: 0.6, maxZoom: 1.2 }"
        class="canvas-flow"
        @node-drag-stop="handleDragStop"
      >
        <Background :gap="24" :size="1" pattern-color="var(--color-border-default)" />
        <Controls />
        <MiniMap />
      </VueFlow>

      <!-- Empty state -->
      <div
        v-if="flowNodes.length === 0"
        class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div class="text-center pointer-events-auto">
          <div class="text-text-muted text-sm mb-4">
            No tools yet. Create your first tool or start from a template.
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="handleAddTool"
              class="px-4 py-2 rounded-lg bg-accent text-surface-base font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer border-none"
            >
              + New Tool
            </button>
            <button
              @click="emit('add-template')"
              class="px-4 py-2 rounded-lg border border-dashed border-border-default text-text-muted text-sm font-medium hover:border-accent hover:text-text-primary transition-colors cursor-pointer bg-transparent"
            >
              From Template...
            </button>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          v-if="!codePanelOpen"
          @click="codePanelOpen = true"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-border-default shadow-lg"
        >
          Code Panel
        </button>
        <button
          @click="emit('add-template')"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-dashed border-border-default shadow-lg"
        >
          From Template...
        </button>
        <button
          v-if="flowNodes.length > 0"
          @click="handleAddTool"
          class="px-3 py-1.5 rounded-lg bg-accent/90 text-surface-base font-semibold text-xs hover:bg-accent transition-colors cursor-pointer border-none shadow-lg"
        >
          + New Tool
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* Sync indicator */
.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.sync-dot.synced {
  background: var(--color-success);
}
.sync-dot.dirty {
  background: var(--color-warning, #f9e2af);
}

/* Vue Flow theme overrides */
.canvas-flow {
  background: var(--color-surface-base, #0f172a) !important;
}

.canvas-flow .vue-flow__node {
  border: none !important;
  background: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
}

.canvas-flow .vue-flow__handle {
  width: 10px;
  height: 10px;
  background: var(--color-accent) !important;
  border: 2px solid var(--color-surface-base, #0f172a) !important;
}

.canvas-flow .vue-flow__edge-path {
  stroke-width: 2;
}

.canvas-flow .vue-flow__minimap {
  background: var(--color-surface-raised, #1e293b) !important;
}

.canvas-flow .vue-flow__controls {
  background: var(--color-surface-raised, #1e293b) !important;
  border-color: var(--color-border-default) !important;
}

.canvas-flow .vue-flow__controls-button {
  background: var(--color-surface-raised, #1e293b) !important;
  border-color: var(--color-border-default) !important;
  color: var(--color-text-primary) !important;
  fill: var(--color-text-primary) !important;
}

.canvas-flow .vue-flow__controls-button:hover {
  background: var(--color-surface-overlay) !important;
}
</style>
