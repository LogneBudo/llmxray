<script setup lang="ts">
import LatencyPercentilesChart from '@/components/cost/LatencyPercentilesChart.vue'
import TtftPercentilesChart from '@/components/cost/TtftPercentilesChart.vue'
import InterTokenLatencyHistogram from '@/components/cost/InterTokenLatencyHistogram.vue'
import LoadDurationTrendChart from '@/components/cost/LoadDurationTrendChart.vue'
import ErrorRateByModelChart from '@/components/cost/ErrorRateByModelChart.vue'
import ErrorTimelineChart from '@/components/analytics/ErrorTimelineChart.vue'
import RequestVolumeChart from '@/components/analytics/RequestVolumeChart.vue'
import ModelDistributionChart from '@/components/analytics/ModelDistributionChart.vue'
import ActiveHoursHeatmap from '@/components/analytics/ActiveHoursHeatmap.vue'
import SettingsImpactScatter from '@/components/analytics/SettingsImpactScatter.vue'
import ModelLoadHistory from '@/components/analytics/ModelLoadHistory.vue'
import QualityOverTurnsChart from '@/components/analytics/QualityOverTurnsChart.vue'
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <h1 class="mb-6 text-lg font-semibold text-text-primary">{{ $t('analytics.title') }}</h1>

    <!-- Quality -->
    <section class="mb-8">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.quality') }}</h2>
      <QualityOverTurnsChart />
    </section>

    <!-- Latency -->
    <section class="mb-8">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.latency') }}</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <LatencyPercentilesChart />
        <TtftPercentilesChart />
      </div>
      <div class="mt-6">
        <InterTokenLatencyHistogram />
      </div>
    </section>

    <!-- Reliability -->
    <section class="mb-8">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.reliability') }}</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <ErrorRateByModelChart />
        <ErrorTimelineChart />
      </div>
      <div class="mt-6">
        <LoadDurationTrendChart />
      </div>
    </section>

    <!-- Usage Patterns -->
    <section class="mb-8">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.usage') }}</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <RequestVolumeChart />
        <ModelDistributionChart />
      </div>
      <div class="mt-6">
        <ActiveHoursHeatmap />
      </div>
    </section>

    <!-- Settings Impact -->
    <section class="mb-8">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.settings') }}</h2>
      <SettingsImpactScatter />
    </section>

    <!-- Model Memory -->
    <section>
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{{ $t('analytics.sections.modelMemory') }}</h2>
      <ModelLoadHistory />
    </section>
  </div>
</template>
