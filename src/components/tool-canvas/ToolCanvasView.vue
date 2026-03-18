<script setup lang="ts">
import { ref, computed, markRaw, nextTick, watch, onMounted } from 'vue'
import { Trash2, Download } from 'lucide-vue-next'
import { downloadJson } from '@/utils/download'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeDragEvent, NodeChange } from '@vue-flow/core'
import { useToolCanvas } from '@/composables/useToolCanvas'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { useCanvasAiStore } from '@/stores/canvas-ai-store'
import { useModelStore } from '@/stores/model-store'
import { exportTrainingData } from '@/services/canvas-ai'

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

const workshopStore = useToolWorkshopStore()
const aiStore = useCanvasAiStore()
const modelStore = useModelStore()

const {
  flowNodes,
  flowEdges,
  combinedCode,
  codeWarnings,
  codeSyncStatus,
  schemas,
  onNodeDragStop,
  onNodesDelete,
  onCodeEdit,
  addNewTool,
} = useToolCanvas()

const { fitView } = useVueFlow()

onMounted(() => {
  if (modelStore.models.length === 0) {
    modelStore.fetchModels()
  }
})

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

// --- Tool Library panel ---
const libraryPanelOpen = ref(false)

watch(libraryPanelOpen, () => {
  if (flowNodes.value.length > 0) {
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 })
    }, 50)
  }
})

function handleRemoveTool(id: string) {
  workshopStore.removeTool(id)
}

// --- Clear All ---
const showClearConfirm = ref(false)

function confirmClearAll() {
  workshopStore.clearAll()
  showClearConfirm.value = false
}

const schemaJson = computed(() => JSON.stringify(schemas.value, null, 2))

function handleDragStop(event: NodeDragEvent) {
  onNodeDragStop({ node: event.node })
}

function handleNodesChange(changes: NodeChange[]) {
  for (const change of changes) {
    if (change.type === 'remove') {
      onNodesDelete([{ id: change.id } as Node])
    }
  }
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

const showExportMenu = ref(false)

function exportAllToolsJson() {
  const allDefs = workshopStore.allTools.map((t) => t.definition)
  downloadJson(allDefs, 'llmxray-tools.json')
  showExportMenu.value = false
}

function exportSingleToolJson(toolId: string) {
  const tool = workshopStore.allTools.find((t) => t.id === toolId)
  if (!tool) return
  downloadJson(tool.definition, `tool-${tool.definition.function.name}.json`)
}
</script>

<template>
  <div class="flex h-full w-full relative">
    <!-- Code panel (collapsible) -->
    <div
      v-if="codePanelOpen"
      class="w-[440px] flex flex-col border-e border-border-default bg-surface-base shrink-0"
    >
      <!-- Header -->
      <div class="p-3 border-b border-border-default flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-text-primary">{{ $t('tools.canvas.codePanel') }}</span>
          <span class="sync-dot" :class="codeSyncStatus"></span>
        </div>
        <button
          class="text-xs text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
          @click="codePanelOpen = false"
        >
          {{ $t('tools.canvas.close') }}
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
          {{ $t('tools.canvas.source') }}
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
          {{ $t('tools.canvas.schema') }}
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
          <span class="text-xs text-text-muted">{{ $t('tools.canvas.schemaManifest') }}</span>
          <button
            @click="copySchema"
            class="px-2 py-1 text-xs rounded bg-surface-overlay text-text-secondary hover:bg-surface-raised transition-colors cursor-pointer border-none"
          >
            {{ $t('tools.canvas.copy') }}
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
        <label class="text-xs text-warning uppercase tracking-wider">{{ $t('tools.canvas.warnings') }}</label>
        <ul class="mt-1 text-xs text-warning/80 list-disc ps-4 space-y-0.5">
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
        @nodes-change="handleNodesChange"
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
            {{ $t('tools.canvas.emptyState') }}
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="handleAddTool"
              class="px-4 py-2 rounded-lg bg-accent text-surface-base font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer border-none"
            >
              {{ $t('tools.canvas.newTool') }}
            </button>
            <button
              @click="emit('add-template')"
              class="px-4 py-2 rounded-lg border border-dashed border-border-default text-text-muted text-sm font-medium hover:border-accent hover:text-text-primary transition-colors cursor-pointer bg-transparent"
            >
              {{ $t('tools.canvas.fromTemplate') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="absolute top-3 right-3 z-10 flex items-center gap-2">
        <!-- Canvas AI Model selector -->
        <select
          v-if="modelStore.chatModelNames.length > 0"
          :value="aiStore.canvasAiModel ?? ''"
          @change="(e: Event) => aiStore.setCanvasAiModel((e.target as HTMLSelectElement).value || null)"
          class="canvas-ai-model-select px-2 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs border border-border-default shadow-lg cursor-pointer"
        >
          <option value="">AI: {{ modelStore.chatModelNames[0] ?? 'none' }}</option>
          <option v-for="m in modelStore.chatModelNames" :key="m" :value="m">
            AI: {{ m }} {{ modelStore.capabilityIcons(m) }}
          </option>
        </select>

        <!-- Export dropdown -->
        <div class="relative">
          <button
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-border-default shadow-lg"
            @click="showExportMenu = !showExportMenu"
          >
            <Download class="h-3.5 w-3.5" />
            {{ $t('tools.canvas.export') }}
          </button>
          <div v-if="showExportMenu" class="fixed inset-0 z-10" @click="showExportMenu = false" />
          <div
            v-if="showExportMenu"
            class="absolute end-0 top-full z-20 mt-1 w-56 rounded-lg border border-border-default bg-surface-raised shadow-lg py-1"
          >
            <button
              class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay"
              @click="exportTrainingData(); showExportMenu = false"
            >
              {{ $t('tools.canvas.exportTitle') }}
            </button>
            <button
              class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay"
              @click="exportAllToolsJson"
            >
              {{ $t('tools.canvas.exportAllJson') }}
            </button>
          </div>
        </div>
        <button
          v-if="!codePanelOpen"
          @click="codePanelOpen = true"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-border-default shadow-lg"
        >
          {{ $t('tools.canvas.codePanel') }}
        </button>
        <button
          @click="libraryPanelOpen = !libraryPanelOpen"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-border-default shadow-lg"
          :class="libraryPanelOpen ? 'text-accent' : 'text-text-secondary'"
        >
          {{ $t('tools.canvas.toolLibrary') }}
        </button>
        <button
          v-if="flowNodes.length > 0"
          @click="showClearConfirm = true"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay hover:text-error transition-colors cursor-pointer border border-border-default shadow-lg"
          :title="$t('tools.canvas.clearAllTitle')"
        >
          {{ $t('tools.canvas.clearAll') }}
        </button>
        <button
          @click="emit('add-template')"
          class="px-3 py-1.5 rounded-lg bg-surface-overlay/90 text-text-secondary text-xs font-medium hover:bg-surface-overlay transition-colors cursor-pointer border border-dashed border-border-default shadow-lg"
        >
          {{ $t('tools.canvas.fromTemplate') }}
        </button>
        <button
          v-if="flowNodes.length > 0"
          @click="handleAddTool"
          class="px-3 py-1.5 rounded-lg bg-accent/90 text-surface-base font-semibold text-xs hover:bg-accent transition-colors cursor-pointer border-none shadow-lg"
        >
          {{ $t('tools.canvas.newTool') }}
        </button>
      </div>

      <!-- Clear All confirmation -->
      <div
        v-if="showClearConfirm"
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <div class="rounded-xl bg-surface-raised border border-border-default p-6 shadow-2xl max-w-xs text-center">
          <p class="text-sm text-text-primary mb-1 font-semibold">{{ $t('tools.canvas.clearAllConfirm') }}</p>
          <p class="text-xs text-text-muted mb-4">
            {{ $t('tools.canvas.clearAllWarning', { count: flowNodes.length }) }}
          </p>
          <div class="flex items-center justify-center gap-3">
            <button
              @click="showClearConfirm = false"
              class="px-4 py-1.5 rounded-lg text-xs text-text-secondary bg-surface-overlay hover:bg-surface-raised transition-colors cursor-pointer border border-border-default"
            >
              {{ $t('tools.canvas.cancel') }}
            </button>
            <button
              @click="confirmClearAll"
              class="px-4 py-1.5 rounded-lg text-xs text-white bg-error hover:opacity-90 transition-opacity cursor-pointer border-none"
            >
              {{ $t('tools.canvas.deleteAll') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tool Library panel (collapsible, right side) -->
    <div
      v-if="libraryPanelOpen"
      class="w-[280px] flex flex-col border-s border-border-default bg-surface-base shrink-0"
    >
      <!-- Header -->
      <div class="p-3 border-b border-border-default flex items-center justify-between">
        <span class="text-sm font-semibold text-text-primary">{{ $t('tools.canvas.toolLibrary') }}</span>
        <button
          class="text-xs text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
          @click="libraryPanelOpen = false"
        >
          {{ $t('tools.canvas.close') }}
        </button>
      </div>

      <!-- Tool list -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="tool in workshopStore.allTools"
          :key="tool.id"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-overlay transition-colors"
        >
          <!-- Enable/disable toggle -->
          <button
            class="h-4 w-7 shrink-0 rounded-full transition-colors"
            :class="tool.enabled ? 'bg-accent' : 'bg-surface-overlay'"
            :title="tool.enabled ? $t('tools.canvas.disableForChat') : $t('tools.canvas.enableForChat')"
            @click="workshopStore.toggleEnabled(tool.id)"
          >
            <span
              class="block h-3 w-3 rounded-full bg-white transition-transform"
              :class="tool.enabled ? 'translate-x-3.5' : 'translate-x-0.5'"
            />
          </button>

          <!-- Name + description -->
          <div class="min-w-0 flex-1">
            <span
              class="font-mono block"
              :class="tool.enabled ? 'text-text-primary' : 'text-text-muted'"
            >
              {{ tool.definition.function.name }}
            </span>
            <p class="truncate text-[10px] text-text-muted">
              {{ tool.definition.function.description }}
            </p>
          </div>

          <!-- Export single tool -->
          <button
            class="shrink-0 text-text-muted hover:text-accent transition-colors bg-transparent border-none cursor-pointer"
            :title="$t('tools.canvas.exportToolJson')"
            @click="exportSingleToolJson(tool.id)"
          >
            <Download class="h-3.5 w-3.5" />
          </button>

          <!-- Delete button -->
          <button
            class="shrink-0 text-text-muted hover:text-error transition-colors bg-transparent border-none cursor-pointer"
            :title="$t('tools.canvas.deleteToolTitle')"
            @click="handleRemoveTool(tool.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>

        <p v-if="workshopStore.allTools.length === 0" class="px-3 py-4 text-xs text-text-muted text-center">
          {{ $t('tools.canvas.noToolsYet') }}
        </p>
      </div>

      <!-- Footer stats -->
      <div class="p-3 border-t border-border-default text-xs text-text-muted">
        {{ workshopStore.enabledTools.length }}/{{ workshopStore.allTools.length }} {{ $t('tools.canvas.enabledForChat') }}
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

/* Canvas AI model selector */
.canvas-ai-model-select {
  outline: none;
  font-family: ui-monospace, Consolas, monospace;
  max-width: 180px;
}
.canvas-ai-model-select option {
  background: var(--color-surface-raised, #1e293b);
  color: var(--color-text-primary);
}
</style>
