<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WorkshopTool, ToolExecutionResult } from '@/types/tool-workshop'
import { executeTool } from '@/services/tool-executor'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'

const props = defineProps<{
  tool: WorkshopTool
}>()

const store = useToolWorkshopStore()

// Build input fields from parameter schema
const paramInputs = ref<Record<string, string>>({})
const testResult = ref<ToolExecutionResult | null>(null)
const isRunning = ref(false)

const paramDefs = computed(() => {
  const schema = props.tool.definition.function.parameters as Record<string, unknown>
  const properties = (schema?.properties ?? {}) as Record<string, { type?: string; description?: string }>
  return Object.entries(properties).map(([name, def]) => ({
    name,
    type: def.type || 'string',
    description: def.description || '',
  }))
})

watch(() => props.tool.id, () => {
  paramInputs.value = {}
  testResult.value = null
}, { immediate: true })

function parseInputValue(raw: string, type: string): unknown {
  if (!raw.trim()) return undefined
  if (type === 'number' || type === 'integer') return Number(raw)
  if (type === 'boolean') return raw.toLowerCase() === 'true'
  if (type === 'array' || type === 'object') {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return raw
}

async function runTest() {
  isRunning.value = true
  testResult.value = null

  const args: Record<string, unknown> = {}
  for (const p of paramDefs.value) {
    const raw = paramInputs.value[p.name]
    if (raw !== undefined && raw !== '') {
      args[p.name] = parseInputValue(raw, p.type)
    }
  }

  try {
    const result = await executeTool(props.tool, args)
    testResult.value = result
    store.updateTool(props.tool.id, {
      lastTestedAt: Date.now(),
      testResult: {
        success: result.success,
        output: result.result,
        error: result.error,
        durationMs: result.durationMs,
      },
    })
  } finally {
    isRunning.value = false
  }
}

const hasImplementation = computed(() => {
  if (props.tool.implementation.mode === 'code') return props.tool.implementation.code.trim().length > 0
  return props.tool.implementation.blocks.length > 0
})

function formatResult(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h4 class="text-xs font-medium text-text-secondary mb-2">Test Input</h4>

      <div v-if="paramDefs.length === 0" class="rounded-lg border border-dashed border-border-default p-3 text-center">
        <p class="text-xs text-text-muted">This tool takes no parameters</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="param in paramDefs"
          :key="param.name"
          class="flex items-start gap-2"
        >
          <div class="w-28 shrink-0 pt-1.5">
            <span class="text-xs font-mono text-text-primary">{{ param.name }}</span>
            <span class="text-[10px] text-text-muted ml-1">({{ param.type }})</span>
          </div>
          <input
            v-model="paramInputs[param.name]"
            class="flex-1 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none"
            :placeholder="param.description || param.name"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        :disabled="isRunning || !hasImplementation"
        class="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-surface hover:bg-accent-hover disabled:opacity-50 transition-colors"
        @click="runTest"
      >
        {{ isRunning ? 'Running...' : 'Run Test' }}
      </button>
      <p v-if="!hasImplementation" class="text-[10px] text-text-muted">
        Add implementation code or blocks in the Logic tab first
      </p>
    </div>

    <!-- Result -->
    <div v-if="testResult" class="space-y-2">
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="testResult.success ? 'bg-success' : 'bg-danger'"
        />
        <span class="text-xs font-medium" :class="testResult.success ? 'text-success' : 'text-danger'">
          {{ testResult.success ? 'Success' : 'Error' }}
        </span>
        <span class="text-[10px] text-text-muted">{{ testResult.durationMs.toFixed(0) }}ms</span>
      </div>

      <div v-if="testResult.error" class="rounded-lg border border-danger/30 bg-danger/5 p-3">
        <pre class="text-xs text-danger font-mono whitespace-pre-wrap">{{ testResult.error }}</pre>
      </div>

      <div v-if="testResult.result !== null && testResult.result !== undefined" class="rounded-lg border border-border-default bg-surface p-3">
        <pre class="text-xs text-text-primary font-mono whitespace-pre-wrap overflow-auto max-h-64">{{ formatResult(testResult.result) }}</pre>
      </div>
    </div>
  </div>
</template>
