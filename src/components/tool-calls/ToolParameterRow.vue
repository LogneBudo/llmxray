<script setup lang="ts">
export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
}

const param = defineModel<ToolParameter>({ required: true })

defineEmits<{
  remove: []
}>()

const typeOptions = ['string', 'number', 'boolean', 'array', 'object'] as const
</script>

<template>
  <div class="flex items-start gap-2">
    <input
      v-model="param.name"
      type="text"
      placeholder="name"
      class="w-24 shrink-0 rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
    />
    <select
      v-model="param.type"
      class="w-20 shrink-0 rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
    >
      <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
    </select>
    <input
      v-model="param.description"
      type="text"
      placeholder="description"
      class="min-w-0 flex-1 rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
    />
    <label class="flex shrink-0 items-center gap-1 py-1.5 text-[10px] text-text-muted">
      <input v-model="param.required" type="checkbox" class="accent-accent" />
      Req
    </label>
    <button
      class="shrink-0 py-1.5 text-text-muted hover:text-error transition-colors text-xs"
      :title="$t('tools.builder.removeParameter')"
      @click="$emit('remove')"
    >
      ✕
    </button>
  </div>
</template>
