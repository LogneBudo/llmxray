<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import type { WorkshopTool, ToolCategory, BlockType } from '@/types/tool-workshop'
import { createDefaultBlock } from '@/types/tool-workshop'
import { nanoid } from 'nanoid'
import { parseCodeToBlocks, type CodeToBlocksResult } from '@/services/code-to-blocks'
import type { HttpRequestConfig } from '@/types/tool-workshop'
import ToolBlockList from './ToolBlockList.vue'
import ToolTestPanel from './ToolTestPanel.vue'

const props = defineProps<{
  tool: WorkshopTool | null
}>()

const store = useToolWorkshopStore()

const activeTab = ref<'definition' | 'logic' | 'test' | 'preview'>('definition')

// --- Definition Tab State (local working copies) ---

const defName = ref('')
const defDescription = ref('')
const defCategory = ref<ToolCategory>('custom')
const defParams = ref<{ name: string; type: string; description: string; required: boolean }[]>([])

const implMode = ref<'visual' | 'code'>('code')
const implCode = ref('')
const implBlocks = ref<WorkshopTool['implementation']['blocks']>([])

function syncFromTool(t: WorkshopTool) {
  defName.value = t.definition.function.name
  defDescription.value = t.definition.function.description
  defCategory.value = t.category

  // Parse parameters from JSON Schema
  const schema = t.definition.function.parameters as Record<string, unknown>
  const schemaProps = (schema?.properties ?? {}) as Record<string, { type?: string; description?: string }>
  const req = (schema?.required ?? []) as string[]
  defParams.value = Object.entries(schemaProps).map(([name, p]) => ({
    name,
    type: (p.type as string) || 'string',
    description: (p.description as string) || '',
    required: req.includes(name),
  }))

  implMode.value = t.implementation.mode
  implCode.value = t.implementation.code
  implBlocks.value = JSON.parse(JSON.stringify(t.implementation.blocks))
}

watch(() => props.tool, (t) => {
  if (t) syncFromTool(t)
}, { immediate: true })

// --- Save Definition ---

function saveDefinition() {
  if (!props.tool) return
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const p of defParams.value) {
    if (!p.name.trim()) continue
    properties[p.name.trim()] = { type: p.type, description: p.description }
    if (p.required) required.push(p.name.trim())
  }
  store.updateTool(props.tool.id, {
    category: defCategory.value,
    definition: {
      type: 'function',
      function: {
        name: defName.value.trim(),
        description: defDescription.value.trim(),
        parameters: { type: 'object', properties, required },
      },
    },
  })
}

function addParam() {
  defParams.value.push({ name: '', type: 'string', description: '', required: false })
}

function removeParam(idx: number) {
  defParams.value.splice(idx, 1)
}

// --- Save Implementation ---

function saveImplementation() {
  if (!props.tool) return
  store.updateTool(props.tool.id, {
    implementation: {
      mode: implMode.value,
      blocks: JSON.parse(JSON.stringify(implBlocks.value)),
      code: implCode.value,
    },
  })
}

function addBlock(type: BlockType) {
  const block = createDefaultBlock(type)
  block.id = nanoid()
  block.order = implBlocks.value.length
  implBlocks.value.push(block)
}

function removeBlock(id: string) {
  implBlocks.value = implBlocks.value.filter((b) => b.id !== id)
  implBlocks.value.forEach((b, i) => (b.order = i))
}

// --- Preview JSON ---

const previewJson = computed(() => {
  if (!props.tool) return ''
  return JSON.stringify(props.tool.definition, null, 2)
})

// --- Delete ---

function deleteTool() {
  if (!props.tool) return
  if (!confirm(`Delete tool "${props.tool.definition.function.name}"?`)) return
  store.removeTool(props.tool.id)
}

const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object']

const codeHint = computed(() => {
  if (!props.tool) return ''
  const paramNames = defParams.value.map((p) => p.name).filter(Boolean)
  if (paramNames.length === 0) return '// args is an empty object\n// Return the tool result:\nreturn "hello"'
  const destructure = paramNames.map((n) => `args.${n}`).join(', ')
  return `// Available: ${destructure}\n// Use fetch() for HTTP requests\n// Return the tool result:\nreturn args.${paramNames[0]}`
})

// --- Code → Visual Conversion ---

const conversionResult = ref<CodeToBlocksResult | null>(null)
const showConversionDialog = ref(false)

function switchMode(m: 'visual' | 'code') {
  if (m === 'visual' && implMode.value === 'code' && implCode.value.trim()) {
    const result = parseCodeToBlocks(implCode.value)
    conversionResult.value = result
    showConversionDialog.value = true
    return
  }
  implMode.value = m
  saveImplementation()
}

function applyConversion() {
  if (conversionResult.value && conversionResult.value.canConvert) {
    implBlocks.value = conversionResult.value.blocks
  }
  implMode.value = 'visual'
  saveImplementation()
  showConversionDialog.value = false
  conversionResult.value = null
}

function cancelConversion() {
  showConversionDialog.value = false
  conversionResult.value = null
}

function blockSummary(block: { type: string; config: unknown }): string {
  switch (block.type) {
    case 'http_request': {
      const c = block.config as HttpRequestConfig
      return `${c.method} ${c.url.length > 40 ? c.url.slice(0, 40) + '...' : c.url}`
    }
    case 'extract_field': {
      const c = block.config as { input: string; fieldPath: string }
      return `${c.input}.${c.fieldPath}`
    }
    case 'template': {
      const c = block.config as { template: string }
      return c.template.length > 40 ? c.template.slice(0, 40) + '...' : c.template
    }
    case 'return_value': {
      const c = block.config as { expression: string }
      return c.expression.length > 40 ? c.expression.slice(0, 40) + '...' : c.expression
    }
    default:
      return ''
  }
}
</script>

<template>
  <div v-if="!props.tool" class="flex-1 flex items-center justify-center text-text-muted text-sm">
    Select a tool or create a new one
  </div>
  <div v-else class="flex-1 flex flex-col overflow-hidden">
    <!-- Tabs -->
    <div class="flex border-b border-border-default bg-surface-raised">
      <button
        v-for="tab in (['definition', 'logic', 'test', 'preview'] as const)"
        :key="tab"
        class="px-4 py-2.5 text-xs font-medium transition-colors border-b-2"
        :class="activeTab === tab
          ? 'border-accent text-accent'
          : 'border-transparent text-text-muted hover:text-text-primary'"
        @click="activeTab = tab"
      >
        {{ tab === 'definition' ? 'Definition' : tab === 'logic' ? 'Logic' : tab === 'test' ? 'Test' : 'Preview' }}
      </button>
      <div class="flex-1" />
      <div class="flex items-center gap-2 px-3">
        <button
          class="text-[10px] px-2 py-1 rounded transition-colors"
          :class="props.tool.enabled ? 'bg-success/10 text-success' : 'bg-surface-overlay text-text-muted'"
          @click="store.toggleEnabled(props.tool.id)"
        >
          {{ props.tool.enabled ? 'Enabled' : 'Disabled' }}
        </button>
        <button
          class="text-[10px] text-text-muted hover:text-danger transition-colors px-2 py-1"
          @click="deleteTool"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- DEFINITION TAB -->
      <div v-if="activeTab === 'definition'" class="space-y-4 max-w-2xl">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Function Name</label>
          <input
            v-model="defName"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder="get_weather"
            @change="saveDefinition"
          />
          <p class="text-[10px] text-text-muted mt-1">Snake_case name the model will use to call this tool</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <textarea
            v-model="defDescription"
            rows="2"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            placeholder="Get the current weather for a given city"
            @change="saveDefinition"
          />
          <p class="text-[10px] text-text-muted mt-1">Helps the model understand when to use this tool</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Category</label>
          <select
            v-model="defCategory"
            class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            @change="saveDefinition"
          >
            <option value="api">API</option>
            <option value="data">Data</option>
            <option value="utility">Utility</option>
            <option value="custom">Custom</option>
            <option value="google">Google</option>
          </select>
        </div>

        <!-- Parameters -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-text-secondary">Parameters</label>
            <button
              class="text-[10px] text-accent hover:text-accent-hover transition-colors"
              @click="addParam"
            >
              + Add Parameter
            </button>
          </div>

          <div v-if="defParams.length === 0" class="rounded-lg border border-dashed border-border-default p-4 text-center">
            <p class="text-xs text-text-muted">No parameters — the model calls this tool without arguments</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(param, idx) in defParams"
              :key="idx"
              class="flex items-start gap-2 rounded-lg border border-border-default bg-surface-overlay p-2.5"
            >
              <div class="flex-1 space-y-1.5">
                <div class="flex gap-2">
                  <input
                    v-model="param.name"
                    class="flex-1 rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                    placeholder="param_name"
                    @change="saveDefinition"
                  />
                  <select
                    v-model="param.type"
                    class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                    @change="saveDefinition"
                  >
                    <option v-for="pt in PARAM_TYPES" :key="pt" :value="pt">{{ pt }}</option>
                  </select>
                </div>
                <input
                  v-model="param.description"
                  class="w-full rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  placeholder="Description..."
                  @change="saveDefinition"
                />
                <label class="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <input
                    type="checkbox"
                    v-model="param.required"
                    class="rounded border-border-default accent-accent"
                    @change="saveDefinition"
                  />
                  Required
                </label>
              </div>
              <button
                class="text-text-muted hover:text-danger text-xs mt-1 transition-colors"
                @click="removeParam(idx); saveDefinition()"
              >
                x
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- LOGIC TAB -->
      <div v-else-if="activeTab === 'logic'" class="space-y-3 max-w-3xl">
        <!-- Mode toggle -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-secondary">Mode:</span>
          <button
            v-for="m in (['visual', 'code'] as const)"
            :key="m"
            class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
            :class="implMode === m
              ? 'bg-accent/10 text-accent border border-accent/30'
              : 'bg-surface-overlay text-text-muted border border-transparent hover:text-text-primary'"
            @click="switchMode(m)"
          >
            {{ m === 'visual' ? 'Visual' : 'Code' }}
          </button>
        </div>

        <!-- Conversion Dialog -->
        <div v-if="showConversionDialog && conversionResult" class="rounded-lg border border-border-default bg-surface-overlay p-4 space-y-3">
          <!-- Can convert -->
          <template v-if="conversionResult.canConvert && conversionResult.blocks.length > 0">
            <h4 class="text-xs font-medium text-text-primary">Convert code to visual blocks?</h4>
            <div class="space-y-1">
              <div
                v-for="(block, i) in conversionResult.blocks"
                :key="i"
                class="flex items-center gap-2 text-[11px] text-text-secondary"
              >
                <span class="inline-block w-2 h-2 rounded-full" :class="{
                  'bg-blue-400': block.type === 'http_request',
                  'bg-amber-400': block.type === 'extract_field',
                  'bg-emerald-400': block.type === 'template',
                  'bg-purple-400': block.type === 'return_value',
                }" />
                <span class="font-medium">{{ block.label }}:</span>
                <span class="text-text-muted font-mono truncate">{{ blockSummary(block) }}</span>
              </div>
            </div>
            <div v-if="conversionResult.warnings.length > 0" class="space-y-1">
              <p v-for="(w, i) in conversionResult.warnings" :key="i" class="text-[10px] text-warning">{{ w }}</p>
            </div>
            <p class="text-[10px] text-text-muted">Your code is preserved — switch back to Code mode anytime.</p>
            <div class="flex gap-2">
              <button class="rounded-md bg-accent px-3 py-1 text-xs text-surface hover:bg-accent-hover transition-colors" @click="applyConversion">Apply Blocks</button>
              <button class="rounded-md bg-surface px-3 py-1 text-xs text-text-muted border border-border-default hover:text-text-primary transition-colors" @click="cancelConversion">Cancel</button>
            </div>
          </template>

          <!-- Cannot convert -->
          <template v-else>
            <h4 class="text-xs font-medium text-text-primary">Code is too complex for visual blocks</h4>
            <div class="space-y-1">
              <p v-for="(w, i) in conversionResult.warnings" :key="i" class="text-[10px] text-warning">{{ w }}</p>
            </div>
            <p class="text-[10px] text-text-muted">Switch to Visual mode with empty blocks? Your code is preserved.</p>
            <div class="flex gap-2">
              <button class="rounded-md bg-surface-overlay px-3 py-1 text-xs text-text-primary border border-border-default hover:bg-border-default transition-colors" @click="applyConversion">Switch Anyway</button>
              <button class="rounded-md bg-surface px-3 py-1 text-xs text-text-muted border border-border-default hover:text-text-primary transition-colors" @click="cancelConversion">Cancel</button>
            </div>
          </template>
        </div>

        <!-- Visual mode -->
        <div v-if="implMode === 'visual'">
          <ToolBlockList
            :blocks="implBlocks"
            @update:blocks="implBlocks = $event; saveImplementation()"
            @remove="removeBlock($event); saveImplementation()"
          />
          <div class="flex gap-2 mt-3">
            <button
              v-for="bt in (['http_request', 'extract_field', 'template', 'return_value'] as const)"
              :key="bt"
              class="rounded-md border border-dashed border-border-default px-2.5 py-1.5 text-[10px] text-text-muted hover:border-accent hover:text-text-primary transition-colors"
              @click="addBlock(bt); saveImplementation()"
            >
              + {{ bt === 'http_request' ? 'HTTP Request' : bt === 'extract_field' ? 'Extract Field' : bt === 'template' ? 'Template' : 'Return Value' }}
            </button>
          </div>
        </div>

        <!-- Code mode -->
        <div v-else class="space-y-2">
          <p class="text-[10px] text-text-muted">
            Write an async function body. Use <code class="text-accent">args</code> to access parameters and <code class="text-accent">fetch()</code> for HTTP requests.
          </p>
          <pre v-if="codeHint" class="text-[10px] text-text-muted bg-surface-overlay rounded-md p-2 font-mono">{{ codeHint }}</pre>
          <textarea
            v-model="implCode"
            rows="14"
            class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none resize-y"
            placeholder="// Your tool implementation here..."
            spellcheck="false"
            @change="saveImplementation"
          />
        </div>
      </div>

      <!-- TEST TAB -->
      <div v-else-if="activeTab === 'test'" class="max-w-2xl">
        <ToolTestPanel :tool="props.tool" />
      </div>

      <!-- PREVIEW TAB -->
      <div v-else-if="activeTab === 'preview'" class="max-w-2xl">
        <p class="text-xs text-text-muted mb-2">JSON definition sent to Ollama when this tool is enabled</p>
        <pre class="rounded-lg border border-border-default bg-surface p-3 text-xs text-text-primary font-mono overflow-auto max-h-[60vh]">{{ previewJson }}</pre>
      </div>
    </div>
  </div>
</template>
