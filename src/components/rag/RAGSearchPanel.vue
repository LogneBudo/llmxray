<script setup lang="ts">
import { ref } from 'vue'
import type { RagSearchResult } from '@/types/rag'

defineProps<{
  results: RagSearchResult[]
  isSearching: boolean
}>()

const emit = defineEmits<{
  search: [query: string]
}>()

const query = ref('')
const expandedIds = ref<Set<number>>(new Set())

function handleSearch() {
  const q = query.value.trim()
  if (q) {
    expandedIds.value = new Set()
    emit('search', q)
  }
}

function toggleExpand(index: number) {
  const next = new Set(expandedIds.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  expandedIds.value = next
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search input -->
    <div class="flex gap-2">
      <input
        v-model="query"
        type="text"
        placeholder="Search your documents..."
        class="flex-1 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
        @keydown.enter="handleSearch"
      />
      <button
        :disabled="!query.trim() || isSearching"
        class="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        @click="handleSearch"
      >
        {{ isSearching ? 'Searching...' : 'Search' }}
      </button>
    </div>

    <!-- Results -->
    <div v-if="results.length > 0" class="space-y-3">
      <p class="text-xs text-text-muted">{{ results.length }} results</p>

      <div
        v-for="(result, i) in results"
        :key="i"
        class="rounded-lg border border-border-default bg-surface-raised p-4"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-text-secondary">
            {{ result.documentName }}
          </span>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="
              result.score > 0.8
                ? 'bg-success/10 text-success'
                : result.score > 0.5
                  ? 'bg-warning/10 text-warning'
                  : 'bg-surface-overlay text-text-muted'
            "
          >
            {{ (result.score * 100).toFixed(1) }}%
          </span>
        </div>
        <p
          class="text-sm text-text-primary leading-relaxed whitespace-pre-wrap cursor-pointer"
          :class="expandedIds.has(i) ? '' : 'line-clamp-4'"
          @click="toggleExpand(i)"
        >{{ result.chunk.content }}</p>
        <button
          class="mt-1.5 text-[10px] text-accent hover:underline"
          @click="toggleExpand(i)"
        >
          {{ expandedIds.has(i) ? 'Show less' : 'Show full chunk' }}
        </button>
      </div>
    </div>
  </div>
</template>
