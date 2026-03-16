<script setup lang="ts">
import type { AiPhase } from '@/types/canvas-ai'
import type { TrainingFilters } from '@/stores/training-store'

const props = defineProps<{
  filters: TrainingFilters
  models: string[]
  toolNames: string[]
  tags: string[]
}>()

const emit = defineEmits<{
  'update:filters': [filters: TrainingFilters]
}>()

function patch(partial: Partial<TrainingFilters>) {
  emit('update:filters', { ...props.filters, ...partial })
}

const phases: Array<{ value: AiPhase | ''; label: string }> = [
  { value: '', label: 'All phases' },
  { value: 'draft', label: 'Draft' },
  { value: 'insights', label: 'Insights' },
  { value: 'automap', label: 'Auto-map' },
  { value: 'fix', label: 'Fix' },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Phase -->
    <select
      :value="filters.phase ?? ''"
      class="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
      @change="patch({ phase: (($event.target as HTMLSelectElement).value || null) as AiPhase | null })"
    >
      <option v-for="p in phases" :key="p.label" :value="p.value">{{ p.label }}</option>
    </select>

    <!-- Model -->
    <select
      :value="filters.model ?? ''"
      class="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
      @change="patch({ model: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">All models</option>
      <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
    </select>

    <!-- Tool -->
    <select
      :value="filters.toolName ?? ''"
      class="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
      @change="patch({ toolName: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">All tools</option>
      <option v-for="t in toolNames" :key="t" :value="t">{{ t }}</option>
    </select>

    <!-- Accepted toggle -->
    <div class="flex rounded-lg border border-border-default overflow-hidden">
      <button
        class="px-2.5 py-1.5 text-[10px] transition-colors"
        :class="filters.accepted === null ? 'bg-accent/10 text-accent' : 'bg-surface text-text-muted hover:text-text-primary'"
        @click="patch({ accepted: null })"
      >All</button>
      <button
        class="px-2.5 py-1.5 text-[10px] transition-colors border-l border-border-default"
        :class="filters.accepted === true ? 'bg-success/10 text-success' : 'bg-surface text-text-muted hover:text-text-primary'"
        @click="patch({ accepted: true })"
      >Accepted</button>
      <button
        class="px-2.5 py-1.5 text-[10px] transition-colors border-l border-border-default"
        :class="filters.accepted === false ? 'bg-error/10 text-error' : 'bg-surface text-text-muted hover:text-text-primary'"
        @click="patch({ accepted: false })"
      >Rejected</button>
    </div>

    <!-- Tag -->
    <select
      v-if="tags.length > 0"
      :value="filters.tag ?? ''"
      class="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
      @change="patch({ tag: ($event.target as HTMLSelectElement).value || null })"
    >
      <option value="">All tags</option>
      <option v-for="t in tags" :key="t" :value="t">{{ t }}</option>
    </select>

    <!-- Search -->
    <input
      :value="filters.search"
      type="text"
      placeholder="Search prompts..."
      class="flex-1 min-w-[150px] rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
      @input="patch({ search: ($event.target as HTMLInputElement).value })"
    />

    <!-- Sort -->
    <select
      :value="filters.sortBy"
      class="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
      @change="patch({ sortBy: ($event.target as HTMLSelectElement).value as TrainingFilters['sortBy'] })"
    >
      <option value="timestamp">Sort by time</option>
      <option value="phase">Sort by phase</option>
      <option value="model">Sort by model</option>
    </select>

    <button
      class="rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      :title="filters.sortDir === 'desc' ? 'Newest first' : 'Oldest first'"
      @click="patch({ sortDir: filters.sortDir === 'desc' ? 'asc' : 'desc' })"
    >
      {{ filters.sortDir === 'desc' ? '\u2193' : '\u2191' }}
    </button>
  </div>
</template>
