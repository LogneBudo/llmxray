<script setup lang="ts">
import { computed } from 'vue'
import type { TrainingStats } from '@/stores/training-store'
import { formatBytes } from '@/utils/format'
import StorageGauge from '@/components/storage/StorageGauge.vue'

const props = defineProps<{
  stats: TrainingStats
}>()

const phases = computed(() => {
  const order = ['draft', 'insights', 'automap', 'fix'] as const
  return order.map((p) => ({
    key: p,
    count: props.stats.phaseBreakdown.get(p) ?? 0,
  }))
})

const topModels = computed(() =>
  [...props.stats.modelBreakdown.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3),
)

const acceptRate = computed(() =>
  props.stats.total > 0
    ? Math.round((props.stats.accepted / props.stats.total) * 100)
    : 0,
)

const phaseColors: Record<string, string> = {
  draft: 'bg-blue-500/20 text-blue-400',
  insights: 'bg-amber-500/20 text-amber-400',
  automap: 'bg-emerald-500/20 text-emerald-400',
  fix: 'bg-rose-500/20 text-rose-400',
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <!-- Total pairs + dataset size -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-3 space-y-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider">{{ $t('training.dashboard.trainingPairs') }}</p>
      <p class="text-xl font-bold text-text-primary">{{ stats.total }}</p>
      <StorageGauge
        v-if="stats.estimatedBytes > 0"
        :used="stats.estimatedBytes"
        :total="stats.estimatedBytes * 5"
        compact
        :label="`~${formatBytes(stats.estimatedBytes)} dataset`"
      />
    </div>

    <!-- Accepted / Rejected -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-3 space-y-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider">{{ $t('training.dashboard.acceptanceRate') }}</p>
      <p class="text-xl font-bold text-text-primary">{{ acceptRate }}%</p>
      <div class="flex items-center gap-2 text-[10px]">
        <span class="text-success">{{ stats.accepted }} {{ $t('training.dashboard.accepted') }}</span>
        <span class="text-text-muted">/</span>
        <span class="text-error">{{ stats.rejected }} {{ $t('training.dashboard.rejected') }}</span>
      </div>
      <div v-if="stats.total > 0" class="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
        <div
          class="h-full rounded-full bg-success transition-all duration-500"
          :style="{ width: `${acceptRate}%` }"
        />
      </div>
    </div>

    <!-- By Phase -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-3 space-y-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider">{{ $t('training.dashboard.byPhase') }}</p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="p in phases"
          :key="p.key"
          class="rounded-full px-2 py-0.5 text-[10px] font-medium"
          :class="phaseColors[p.key]"
        >
          {{ p.key }} {{ p.count }}
        </span>
      </div>
    </div>

    <!-- Top Models -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-3 space-y-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider">{{ $t('training.dashboard.topModels') }}</p>
      <div v-if="topModels.length > 0" class="space-y-1">
        <div
          v-for="[model, count] in topModels"
          :key="model"
          class="flex items-center justify-between text-[10px]"
        >
          <span class="text-text-secondary truncate">{{ model }}</span>
          <span class="text-text-muted shrink-0">{{ count }}</span>
        </div>
      </div>
      <p v-else class="text-[10px] text-text-muted italic">{{ $t('common.empty.noData') }}</p>
    </div>
  </div>
</template>
