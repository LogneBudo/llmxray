<script setup lang="ts">
import { computed } from 'vue'
import type { QualityReport } from '@/types/quality'

const props = defineProps<{
  report: QualityReport | null
}>()

const issueChecks = computed(() => {
  if (!props.report) return []
  return props.report.checks.filter((c) => c.status !== 'pass')
})

const hasIssues = computed(() => issueChecks.value.length > 0)
</script>

<template>
  <div v-if="hasIssues" class="mt-1 flex items-center gap-1 flex-wrap">
    <span
      v-for="check in issueChecks"
      :key="check.detector"
      class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium"
      :class="check.status === 'fail' ? 'bg-error/15 text-error' : 'bg-warning/15 text-warning'"
      :title="check.detail ?? $t(check.reason)"
    >
      {{ $t(`quality.${check.detector}.label`) }}
    </span>
  </div>
</template>
