<script setup lang="ts">
import { computed } from 'vue'
import { useMetricsStore } from '@/stores/metrics-store'

const metricsStore = useMetricsStore()

const COLD_THRESHOLD = 500

const events = computed(() => {
  return metricsStore.metricsHistory
    .slice(-30)
    .map((m) => ({
      time: new Date(m.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(m.startedAt).toLocaleDateString(),
      model: m.model,
      loadMs: m.loadDurationMs,
      isCold: m.loadDurationMs > COLD_THRESHOLD,
    }))
})

const hasData = computed(() => events.value.length > 0)
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('analytics.modelLoad.title') }}</h3>
    <template v-if="hasData">
      <div class="max-h-64 overflow-y-auto">
        <div
          v-for="(event, i) in events"
          :key="i"
          class="flex items-center gap-3 border-b border-border-default/30 py-1.5 last:border-0"
        >
          <div
            class="h-2 w-2 shrink-0 rounded-full"
            :class="event.isCold ? 'bg-warning' : 'bg-success'"
          />
          <span class="text-[10px] text-text-muted w-14 shrink-0">{{ event.time }}</span>
          <span class="text-xs text-text-primary truncate flex-1">{{ event.model }}</span>
          <span
            class="text-[10px] font-mono shrink-0"
            :class="event.isCold ? 'text-warning' : 'text-text-muted'"
          >
            {{ event.loadMs.toFixed(0) }}ms
          </span>
          <span
            v-if="event.isCold"
            class="rounded-full bg-warning/15 px-1.5 py-0.5 text-[8px] font-medium text-warning shrink-0"
          >
            {{ $t('analytics.modelLoad.cold') }}
          </span>
        </div>
      </div>
    </template>
    <p v-else class="py-6 text-center text-xs text-text-muted">{{ $t('analytics.modelLoad.noData') }}</p>
  </div>
</template>
