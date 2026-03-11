<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolParameterRow from './ToolParameterRow.vue'
import type { ToolParameter } from './ToolParameterRow.vue'
import type { OllamaToolDefinition } from '@/types/ollama'

const props = defineProps<{
  initial?: OllamaToolDefinition
}>()

const emit = defineEmits<{
  save: [definition: OllamaToolDefinition]
  cancel: []
}>()

const name = ref(props.initial?.function.name ?? '')
const description = ref(props.initial?.function.description ?? '')
const showRawJson = ref(false)
const rawJson = ref('')

// Parse initial parameters into rows
function parseInitialParams(): ToolParameter[] {
  const schema = props.initial?.function.parameters
  if (!schema || typeof schema !== 'object') return []
  const properties = (schema as Record<string, unknown>).properties as Record<string, Record<string, string>> | undefined
  const required = ((schema as Record<string, unknown>).required as string[]) ?? []
  if (!properties) return []
  return Object.entries(properties).map(([k, v]) => ({
    name: k,
    type: (v.type ?? 'string') as ToolParameter['type'],
    description: v.description ?? '',
    required: required.includes(k),
  }))
}

const parameters = ref<ToolParameter[]>(parseInitialParams())

const isValid = computed(() => {
  if (!name.value.trim()) return false
  if (!description.value.trim()) return false
  if (showRawJson.value) {
    try {
      JSON.parse(rawJson.value)
      return true
    } catch {
      return false
    }
  }
  // Validate parameter names are non-empty and unique
  const names = parameters.value.map((p) => p.name.trim())
  return names.every(Boolean) && new Set(names).size === names.length
})

function addParameter() {
  parameters.value.push({ name: '', type: 'string', description: '', required: false })
}

function removeParameter(index: number) {
  parameters.value.splice(index, 1)
}

function buildDefinition(): OllamaToolDefinition {
  let params: Record<string, unknown>

  if (showRawJson.value) {
    params = JSON.parse(rawJson.value)
  } else {
    const properties: Record<string, Record<string, string>> = {}
    const required: string[] = []
    for (const p of parameters.value) {
      const pName = p.name.trim()
      if (!pName) continue
      properties[pName] = { type: p.type, description: p.description }
      if (p.required) required.push(pName)
    }
    params = {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    }
  }

  return {
    type: 'function',
    function: {
      name: name.value.trim(),
      description: description.value.trim(),
      parameters: params,
    },
  }
}

function handleSave() {
  if (!isValid.value) return
  emit('save', buildDefinition())
}
</script>

<template>
  <div class="space-y-4 p-4">
    <div>
      <label class="mb-1 block text-xs font-medium text-text-secondary">Function Name</label>
      <input
        v-model="name"
        type="text"
        placeholder="get_weather"
        class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
      />
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-text-secondary">Description</label>
      <textarea
        v-model="description"
        rows="2"
        placeholder="Get the current weather for a given location"
        class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
      />
    </div>

    <!-- Toggle: visual builder vs raw JSON -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-text-secondary">Parameters</span>
      <button
        class="ml-auto rounded px-2 py-0.5 text-[10px] transition-colors"
        :class="showRawJson ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary'"
        @click="showRawJson = !showRawJson"
      >
        {{ showRawJson ? 'Visual Builder' : 'Raw JSON' }}
      </button>
    </div>

    <!-- Raw JSON mode -->
    <div v-if="showRawJson">
      <textarea
        v-model="rawJson"
        rows="6"
        placeholder='{"type": "object", "properties": {...}}'
        class="w-full resize-y rounded-lg border border-border-default bg-surface px-3 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
      />
    </div>

    <!-- Visual parameter builder -->
    <div v-else class="space-y-2">
      <ToolParameterRow
        v-for="(param, i) in parameters"
        :key="i"
        v-model="parameters[i]!"
        @remove="removeParameter(i)"
      />
      <button
        class="rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-accent/10 transition-colors"
        @click="addParameter"
      >
        + Add Parameter
      </button>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 border-t border-border-default pt-3">
      <button
        class="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        :disabled="!isValid"
        class="rounded-lg bg-accent px-4 py-1.5 text-xs text-white transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
        @click="handleSave"
      >
        Save Tool
      </button>
    </div>
  </div>
</template>
