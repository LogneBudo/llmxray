<script setup lang="ts">
import { computed } from 'vue'
import { formatBytes } from '@/utils/format'
import type { StorageBackendInfo } from '@/services/storage-estimator'

const props = defineProps<{
  database: StorageBackendInfo
}>()

const emit = defineEmits<{
  clear: [id: string]
}>()

const STORE_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f43f5e', // rose
]

const segments = computed(() =>
  props.database.stores
    .filter((s) => s.bytes > 0)
    .map((s, i) => ({
      name: s.name,
      bytes: s.bytes,
      color: STORE_COLORS[i % STORE_COLORS.length]!,
    })),
)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface p-3 space-y-2.5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm">{{ database.icon }}</span>
        <span class="text-xs font-medium text-text-primary">{{ database.label }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium text-text-secondary">
          {{ formatBytes(database.totalBytes) }}
        </span>
        <button
          v-if="database.totalBytes > 0"
          class="rounded px-1.5 py-0.5 text-[9px] text-text-muted hover:text-error hover:bg-error/10 transition-colors"
          :title="$t('system.browserStorage.clearAll')"
          @click="emit('clear', database.id)"
        >
          {{ $t('common.actions.clear') }}
        </button>
      </div>
    </div>

    <!-- Segmented bar showing relative store sizes within this database -->
    <div v-if="database.totalBytes > 0" class="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
      <div class="flex h-full">
        <div
          v-for="seg in segments"
          :key="seg.name"
          class="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          :style="{ width: `${(seg.bytes / database.totalBytes) * 100}%`, backgroundColor: seg.color }"
          :title="`${seg.name}: ${formatBytes(seg.bytes)}`"
        />
      </div>
    </div>
    <div v-else class="h-1.5 rounded-full bg-surface-overlay" />

    <!-- Per-store breakdown -->
    <div class="flex items-center justify-between text-[10px] text-text-muted">
      <span>{{ database.recordCount.toLocaleString() }} records</span>
      <span>{{ database.type === 'indexeddb' ? 'IndexedDB' : 'External' }}</span>
    </div>

    <div v-if="database.stores.some((s) => s.count > 0)" class="space-y-1">
      <div
        v-for="(store, i) in database.stores.filter((s) => s.count > 0)"
        :key="store.name"
        class="flex items-center gap-2 text-[10px]"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :style="{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }"
        />
        <span class="flex-1 text-text-muted">{{ store.name }}</span>
        <span class="text-text-muted">{{ store.count }}</span>
        <span class="text-text-secondary w-14 text-right">{{ formatBytes(store.bytes) }}</span>
      </div>
    </div>
    <p v-else class="text-[10px] text-text-muted italic">{{ $t('system.browserStorage.empty') }}</p>
  </div>
</template>
