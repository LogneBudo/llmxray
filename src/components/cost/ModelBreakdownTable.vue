<script setup lang="ts">
import type { ModelUsageSummary } from '@/types/cost'

defineProps<{
  data: ModelUsageSummary[]
}>()

function formatCost(value: number): string {
  if (value < 0.0001) return '< $0.0001'
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text-secondary">{{ $t('cost.table.model') }}</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-default text-text-muted">
            <th class="px-2 py-2 text-start font-medium">{{ $t('cost.table.model') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.sessions') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.promptTokens') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.completionTokens') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.totalTokens') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.estimatedCost') }}</th>
            <th class="px-2 py-2 text-end font-medium">{{ $t('cost.table.pricingSource') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in data"
            :key="row.model"
            class="border-b border-border-default/50 text-text-secondary hover:bg-surface-overlay transition-colors"
          >
            <td class="px-2 py-2 font-medium text-text-primary">{{ row.model }}</td>
            <td class="px-2 py-2 text-end">{{ row.sessionCount }}</td>
            <td class="px-2 py-2 text-end">{{ row.promptTokens.toLocaleString() }}</td>
            <td class="px-2 py-2 text-end">{{ row.completionTokens.toLocaleString() }}</td>
            <td class="px-2 py-2 text-end">{{ row.totalTokens.toLocaleString() }}</td>
            <td class="px-2 py-2 text-end text-accent">{{ formatCost(row.estimatedCost) }}</td>
            <td class="px-2 py-2 text-end text-text-muted">{{ row.pricing.source }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
