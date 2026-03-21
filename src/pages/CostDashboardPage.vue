<script setup lang="ts">
import { useCostStore } from '@/stores/cost-store'
import CostSummaryCards from '@/components/cost/CostSummaryCards.vue'
import TokenUsageByModelChart from '@/components/cost/TokenUsageByModelChart.vue'
import DailyUsageChart from '@/components/cost/DailyUsageChart.vue'
import CostTrendChart from '@/components/cost/CostTrendChart.vue'
import ModelBreakdownTable from '@/components/cost/ModelBreakdownTable.vue'
import { Info } from 'lucide-vue-next'

const costStore = useCostStore()
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <h1 class="mb-6 text-lg font-semibold text-text-primary">{{ $t('cost.title') }}</h1>

    <template v-if="costStore.totalSessions > 0">
      <CostSummaryCards
        :total-tokens="costStore.totalTokens"
        :total-sessions="costStore.totalSessions"
        :estimated-cost="costStore.totalEstimatedCost"
        :avg-cost-per-session="costStore.avgCostPerSession"
      />

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <TokenUsageByModelChart :data="costStore.modelUsage" />
        <DailyUsageChart :data="costStore.dailyUsage" />
      </div>

      <div class="mt-6">
        <CostTrendChart />
      </div>

      <div class="mt-6">
        <ModelBreakdownTable :data="costStore.modelUsage" />
      </div>

      <div class="mt-6 flex items-start gap-2 rounded-lg border border-border-default bg-surface-raised p-4 text-xs text-text-muted">
        <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>{{ $t('cost.disclaimer') }}</p>
      </div>
    </template>

    <div v-else class="flex h-64 items-center justify-center">
      <p class="text-sm text-text-muted">{{ $t('cost.noData') }}</p>
    </div>
  </div>
</template>
