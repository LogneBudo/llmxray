<script setup lang="ts">
import { computed } from 'vue'
import { useMetricsStore } from '@/stores/metrics-store'

const metricsStore = useMetricsStore()

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const grid = computed(() => {
  const counts = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[])
  let max = 0

  for (const m of metricsStore.metricsHistory) {
    const d = new Date(m.startedAt)
    const day = (d.getDay() + 6) % 7 // Monday = 0
    const hour = d.getHours()
    counts[day]![hour]!++
    if (counts[day]![hour]! > max) max = counts[day]![hour]!
  }

  return { counts, max }
})

function cellColor(count: number): string {
  if (count === 0) return 'bg-surface-overlay/30'
  const intensity = grid.value.max > 0 ? count / grid.value.max : 0
  if (intensity > 0.75) return 'bg-accent'
  if (intensity > 0.5) return 'bg-accent/70'
  if (intensity > 0.25) return 'bg-accent/40'
  return 'bg-accent/20'
}

const hasData = computed(() => metricsStore.metricsHistory.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.usage.activeHours') }}</h3>
    <template v-if="hasData">
      <div class="overflow-x-auto">
        <div class="min-w-[600px]">
          <!-- Hour labels -->
          <div class="flex items-center">
            <div class="w-10 shrink-0" />
            <div v-for="h in HOURS" :key="h" class="flex-1 text-center text-[8px] text-text-muted">
              {{ h }}
            </div>
          </div>
          <!-- Grid rows -->
          <div v-for="(day, di) in DAYS" :key="day" class="flex items-center gap-0.5 mt-0.5">
            <div class="w-10 shrink-0 text-[10px] text-text-muted">{{ day }}</div>
            <div
              v-for="h in HOURS"
              :key="h"
              class="flex-1 aspect-square rounded-sm transition-colors"
              :class="cellColor(grid.counts[di]![h]!)"
              :title="`${day} ${h}:00 — ${grid.counts[di]![h]} requests`"
            />
          </div>
        </div>
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.usage.noData') }}</p>
  </div>
</template>
