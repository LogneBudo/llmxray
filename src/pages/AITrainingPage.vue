<script setup lang="ts">
import { onMounted } from 'vue'
import { useTrainingStore } from '@/stores/training-store'
import TrainingDashboard from '@/components/training/TrainingDashboard.vue'
import TrainingFilters from '@/components/training/TrainingFilters.vue'
import TrainingTable from '@/components/training/TrainingTable.vue'
import TrainingBulkActions from '@/components/training/TrainingBulkActions.vue'

const store = useTrainingStore()

onMounted(() => {
  store.loadPairs()
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-lg font-semibold text-text-primary">{{ $t('training.title') }}</h2>
      <p class="text-sm text-text-muted">{{ $t('training.subtitle') }}</p>
    </div>

    <!-- Dashboard -->
    <TrainingDashboard :stats="store.stats" />

    <!-- Filters -->
    <TrainingFilters
      :filters="store.filters"
      :models="store.allModels"
      :tool-names="store.allToolNames"
      :tags="store.allTags"
      @update:filters="store.filters = $event"
    />

    <!-- Bulk actions -->
    <TrainingBulkActions
      v-if="store.selectedIds.size > 0"
      :selected-count="store.selectedIds.size"
      @export="store.exportSelected([...store.selectedIds])"
      @mark-accepted="store.bulkSetAccepted([...store.selectedIds], true)"
      @mark-rejected="store.bulkSetAccepted([...store.selectedIds], false)"
      @add-tag="store.bulkAddTag([...store.selectedIds], $event)"
      @delete="store.deletePairs([...store.selectedIds])"
      @deselect-all="store.deselectAll()"
    />

    <!-- Select all toggle -->
    <div v-if="store.filteredPairs.length > 0" class="flex items-center gap-3">
      <button
        class="text-[10px] text-text-muted hover:text-accent transition-colors"
        @click="store.selectedIds.size === store.filteredPairs.length ? store.deselectAll() : store.selectAll()"
      >
        {{ store.selectedIds.size === store.filteredPairs.length ? $t('training.table.deselectAll') : $t('training.table.selectAll') + ' ' + store.filteredPairs.length }}
      </button>
      <span class="text-[10px] text-text-muted">
        {{ $t('training.table.pairsShown', { shown: store.filteredPairs.length, total: store.pairs.length }) }}
      </span>
    </div>

    <!-- Table -->
    <TrainingTable
      :pairs="store.filteredPairs"
      :selected-ids="store.selectedIds"
      :expanded-id="store.expandedId"
      :all-tags="store.allTags"
      @toggle-selection="store.toggleSelection($event)"
      @set-expanded="store.setExpanded($event)"
      @update:response="(id: string, resp: string) => store.updateResponse(id, resp)"
      @update:tags="(id: string, tags: string[]) => store.updateTags(id, tags)"
      @toggle-accepted="store.toggleAccepted($event)"
      @delete="store.deletePairs([$event])"
    />

    <!-- Empty state -->
    <div
      v-if="store.pairs.length === 0 && !store.loading"
      class="rounded-lg border border-border-default bg-surface-raised p-8 text-center"
    >
      <p class="text-sm text-text-muted mb-2">{{ $t('training.empty.title') }}</p>
      <p class="text-xs text-text-muted">
        {{ $t('training.empty.description') }}
      </p>
    </div>
  </div>
</template>
