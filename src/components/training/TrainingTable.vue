<script setup lang="ts">
import type { AiTrainingPair } from '@/types/canvas-ai'
import { formatRelativeTime } from '@/utils/format'
import TrainingDetailPanel from './TrainingDetailPanel.vue'

defineProps<{
  pairs: AiTrainingPair[]
  selectedIds: Set<string>
  expandedId: string | null
  allTags: string[]
}>()

const emit = defineEmits<{
  'toggle-selection': [id: string]
  'set-expanded': [id: string | null]
  'update:response': [id: string, response: string]
  'update:tags': [id: string, tags: string[]]
  'toggle-accepted': [id: string]
  delete: [id: string]
}>()

const phaseColors: Record<string, string> = {
  draft: 'bg-blue-500/20 text-blue-400',
  insights: 'bg-amber-500/20 text-amber-400',
  automap: 'bg-emerald-500/20 text-emerald-400',
  fix: 'bg-rose-500/20 text-rose-400',
}
</script>

<template>
  <div v-if="pairs.length === 0" class="rounded-lg bg-surface-overlay p-8 text-center">
    <p class="text-sm text-text-muted">No training pairs match your filters.</p>
  </div>

  <div v-else class="space-y-1">
    <div v-for="pair in pairs" :key="pair.id">
      <!-- Row -->
      <div
        class="flex items-center gap-3 rounded-lg border border-border-default bg-surface-raised px-3 py-2.5 text-xs transition-colors cursor-pointer hover:border-accent/30"
        :class="expandedId === pair.id ? 'border-accent/50' : ''"
        @click="emit('set-expanded', pair.id)"
      >
        <!-- Checkbox -->
        <button
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
          :class="selectedIds.has(pair.id)
            ? 'border-accent bg-accent text-white'
            : 'border-border-default hover:border-accent'"
          @click.stop="emit('toggle-selection', pair.id)"
        >
          <span v-if="selectedIds.has(pair.id)" class="text-[8px]">&#x2713;</span>
        </button>

        <!-- Phase badge -->
        <span
          class="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
          :class="phaseColors[pair.phase]"
        >{{ pair.phase }}</span>

        <!-- Tool name -->
        <span class="shrink-0 text-text-secondary w-24 truncate">{{ pair.toolName }}</span>

        <!-- Model -->
        <span class="shrink-0 text-text-muted w-28 truncate">{{ pair.model }}</span>

        <!-- Accepted badge -->
        <span
          class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px]"
          :class="pair.accepted ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
        >
          {{ pair.accepted ? 'accepted' : 'rejected' }}
        </span>

        <!-- Tags -->
        <div class="flex items-center gap-1 shrink-0">
          <span
            v-for="tag in (pair.tags ?? []).slice(0, 2)"
            :key="tag"
            class="rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] text-accent"
          >{{ tag }}</span>
          <span
            v-if="(pair.tags ?? []).length > 2"
            class="text-[8px] text-text-muted"
          >+{{ (pair.tags ?? []).length - 2 }}</span>
        </div>

        <!-- Prompt preview -->
        <span class="flex-1 min-w-0 truncate text-text-muted">
          {{ pair.userPrompt.slice(0, 80) }}{{ pair.userPrompt.length > 80 ? '...' : '' }}
        </span>

        <!-- Timestamp -->
        <span class="shrink-0 text-[10px] text-text-muted">{{ formatRelativeTime(pair.timestamp) }}</span>
      </div>

      <!-- Detail panel (inline expansion) -->
      <TrainingDetailPanel
        v-if="expandedId === pair.id"
        :pair="pair"
        :all-tags="allTags"
        class="mt-1 ml-7"
        @close="emit('set-expanded', null)"
        @update:response="(id: string, resp: string) => emit('update:response', id, resp)"
        @update:tags="(id: string, tags: string[]) => emit('update:tags', id, tags)"
        @toggle-accepted="emit('toggle-accepted', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
