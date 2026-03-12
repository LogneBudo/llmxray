<script setup lang="ts">
import type {
  ToolActionBlock,
  HttpRequestConfig,
  ExtractFieldConfig,
  TemplateConfig,
  ReturnValueConfig,
} from '@/types/tool-workshop'

const props = defineProps<{
  block: ToolActionBlock
}>()

const emit = defineEmits<{
  update: [block: ToolActionBlock]
  remove: [id: string]
}>()

function patch(configPatch: Record<string, unknown>) {
  emit('update', {
    ...props.block,
    config: { ...props.block.config, ...configPatch },
  })
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const

const BLOCK_COLORS: Record<string, string> = {
  http_request: 'border-l-blue-400',
  extract_field: 'border-l-amber-400',
  template: 'border-l-emerald-400',
  return_value: 'border-l-purple-400',
}
</script>

<template>
  <div
    class="rounded-lg border border-border-default bg-surface-overlay p-3 border-l-[3px] transition-colors"
    :class="BLOCK_COLORS[block.type] ?? 'border-l-border-default'"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-text-primary">{{ block.label }}</span>
      <button
        class="text-[10px] text-text-muted hover:text-danger transition-colors"
        @click="emit('remove', block.id)"
      >
        remove
      </button>
    </div>

    <!-- HTTP Request -->
    <div v-if="block.type === 'http_request'" class="space-y-2">
      <div class="flex gap-2">
        <select
          :value="(block.config as HttpRequestConfig).method"
          class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
          @change="patch({ method: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m }}</option>
        </select>
        <input
          :value="(block.config as HttpRequestConfig).url"
          class="flex-1 rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none"
          placeholder="https://api.example.com/{{param}}"
          @change="patch({ url: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div v-if="(block.config as HttpRequestConfig).method !== 'GET'">
        <textarea
          :value="(block.config as HttpRequestConfig).body"
          rows="2"
          class="w-full rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          placeholder='{"key": "{{value}}"}'
          @change="patch({ body: ($event.target as HTMLTextAreaElement).value })"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-text-muted">Save as:</span>
        <input
          :value="(block.config as HttpRequestConfig).outputVariable"
          class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono w-32 focus:border-accent focus:outline-none"
          placeholder="response"
          @change="patch({ outputVariable: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <!-- Extract Field -->
    <div v-else-if="block.type === 'extract_field'" class="space-y-2">
      <div class="flex gap-2 items-center">
        <span class="text-[10px] text-text-muted shrink-0">From:</span>
        <input
          :value="(block.config as ExtractFieldConfig).input"
          class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono w-28 focus:border-accent focus:outline-none"
          placeholder="response"
          @change="patch({ input: ($event.target as HTMLInputElement).value })"
        />
        <span class="text-[10px] text-text-muted shrink-0">Path:</span>
        <input
          :value="(block.config as ExtractFieldConfig).fieldPath"
          class="flex-1 rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none"
          placeholder="data.temperature"
          @change="patch({ fieldPath: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-text-muted">Save as:</span>
        <input
          :value="(block.config as ExtractFieldConfig).outputVariable"
          class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono w-32 focus:border-accent focus:outline-none"
          placeholder="value"
          @change="patch({ outputVariable: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <!-- Template -->
    <div v-else-if="block.type === 'template'" class="space-y-2">
      <textarea
        :value="(block.config as TemplateConfig).template"
        rows="2"
        class="w-full rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
        placeholder="The weather in {{city}} is {{temp}} degrees"
        @change="patch({ template: ($event.target as HTMLTextAreaElement).value })"
      />
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-text-muted">Save as:</span>
        <input
          :value="(block.config as TemplateConfig).outputVariable"
          class="rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono w-32 focus:border-accent focus:outline-none"
          placeholder="text"
          @change="patch({ outputVariable: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <!-- Return Value -->
    <div v-else-if="block.type === 'return_value'" class="space-y-1">
      <input
        :value="(block.config as ReturnValueConfig).expression"
        class="w-full rounded border border-border-default bg-surface px-2 py-1 text-xs text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:outline-none"
        placeholder="value"
        @change="patch({ expression: ($event.target as HTMLInputElement).value })"
      />
      <p class="text-[10px] text-text-muted">Variable name or template string to return as the tool result</p>
    </div>
  </div>
</template>
