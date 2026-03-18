<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { historyDB, type HistoryEntry } from '@/services/history-db'
import { downloadJson, downloadCsv } from '@/utils/download'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const { t } = useI18n()

const allEntries = ref<HistoryEntry[]>([])
const loading = ref(true)

// Filters
const filterType = ref<string>('all')
const filterModel = ref('')
const filterLanguage = ref('')
const filterDateRange = ref('all')
const filterTags = ref('')

// UI state
const showTrends = ref(true)
const showConfirmClear = ref(false)
const retention = ref(localStorage.getItem('llmxray-history-retention') ?? 'forever')

// Distinct values for dropdowns
const distinctModels = computed(() => {
  const models = new Set(allEntries.value.map(e => e.model))
  return [...models].sort()
})

const distinctLanguages = computed(() => {
  const langs = new Set(allEntries.value.map(e => e.language).filter(Boolean) as string[])
  return [...langs].sort()
})

const hasLanguages = computed(() => distinctLanguages.value.length > 0)

// Date range helpers
function getDateRangeCutoff(range: string): number {
  const now = Date.now()
  switch (range) {
    case '7d': return now - 7 * 24 * 60 * 60 * 1000
    case '30d': return now - 30 * 24 * 60 * 60 * 1000
    case '90d': return now - 90 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

// Filtered entries
const filtered = computed(() => {
  return allEntries.value.filter(e => {
    if (filterType.value !== 'all' && e.type !== filterType.value) return false
    if (filterModel.value && e.model !== filterModel.value) return false
    if (filterLanguage.value && e.language !== filterLanguage.value) return false
    if (filterDateRange.value !== 'all') {
      const cutoff = getDateRangeCutoff(filterDateRange.value)
      if (e.timestamp < cutoff) return false
    }
    if (filterTags.value && !e.tags?.some(tag => tag.toLowerCase().includes(filterTags.value.toLowerCase()))) return false
    return true
  })
})

// Type icons
const typeIcons: Record<string, string> = {
  benchmark: '\uD83C\uDFAF',
  comparison: '\uD83D\uDD04',
  chat: '\uD83D\uDCAC',
  training: '\uD83D\uDCCA',
  session: '\u26A1',
}

// Relative time
function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// Estimated size
const estimatedSize = computed(() => {
  const bytes = allEntries.value.length * 500
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

// Activity chart data (last 30 days)
const activityChartData = computed(() => {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const labels: string[] = []
  const counts: number[] = []

  for (let i = 29; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const dayEnd = dayStart + dayMs
    const date = new Date(dayStart)
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`)
    counts.push(allEntries.value.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd).length)
  }

  return {
    labels,
    datasets: [{
      label: t('settings.history.trends.activity'),
      data: counts,
      backgroundColor: 'rgba(168, 85, 247, 0.6)',
      borderColor: '#a855f7',
      borderWidth: 1,
    }],
  }
})

// Models doughnut chart data
const modelsChartData = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of allEntries.value) {
    counts.set(entry.model, (counts.get(entry.model) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const colors = [
    '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899',
  ]

  return {
    labels: sorted.map(([name]) => name),
    datasets: [{
      data: sorted.map(([, count]) => count),
      backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
      borderWidth: 0,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 0 },
      grid: { display: false },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 },
      grid: { color: 'rgba(71, 85, 105, 0.3)' },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 },
    },
  },
}

// Actions
function exportAllJson() {
  downloadJson(allEntries.value, 'llmxray-history.json')
}

function exportFilteredCsv() {
  const headers = ['type', 'timestamp', 'model', 'language', 'summary', 'accuracy', 'tokenTaxRatio', 'tags']
  const rows = filtered.value.map(e => [
    e.type,
    new Date(e.timestamp).toISOString(),
    e.model,
    e.language ?? '',
    e.summary,
    e.accuracy != null ? String(e.accuracy) : '',
    e.tokenTaxRatio != null ? String(e.tokenTaxRatio) : '',
    (e.tags ?? []).join(';'),
  ])
  downloadCsv(headers, rows, 'llmxray-history-filtered.csv')
}

function setRetention(value: string) {
  retention.value = value
  localStorage.setItem('llmxray-history-retention', value)
}

async function clearHistory() {
  await historyDB.entries.clear()
  allEntries.value = []
  showConfirmClear.value = false
}

onMounted(async () => {
  allEntries.value = await historyDB.entries.reverse().sortBy('timestamp')
  loading.value = false
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-lg font-semibold text-text-primary">{{ $t('settings.history.title') }}</h2>
      <p class="text-sm text-text-secondary mt-1">{{ $t('settings.history.subtitle') }}</p>
    </div>

    <!-- How data is stored explanation -->
    <div class="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-text-secondary space-y-1.5">
      <p class="font-medium text-text-primary">{{ $t('settings.history.storage.title') }}</p>
      <p>{{ $t('settings.history.storage.description') }}</p>
      <ul class="space-y-1 ps-4 list-disc text-text-muted">
        <li>{{ $t('settings.history.storage.indexedDb') }}</li>
        <li>{{ $t('settings.history.storage.historyDb') }}</li>
        <li>{{ $t('settings.history.storage.privacy') }}</li>
      </ul>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>

    <template v-else>
      <!-- A) Filters bar -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4">
        <div class="flex flex-wrap gap-3">
          <!-- Type -->
          <div class="space-y-1">
            <label class="text-xs text-text-muted">{{ $t('settings.history.filters.type') }}</label>
            <select
              v-model="filterType"
              class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">{{ $t('settings.history.filters.all') }}</option>
              <option value="benchmark">{{ $t('settings.history.types.benchmark') }}</option>
              <option value="comparison">{{ $t('settings.history.types.comparison') }}</option>
              <option value="chat">{{ $t('settings.history.types.chat') }}</option>
              <option value="training">{{ $t('settings.history.types.training') }}</option>
              <option value="session">{{ $t('settings.history.types.session') }}</option>
            </select>
          </div>

          <!-- Model -->
          <div class="space-y-1">
            <label class="text-xs text-text-muted">{{ $t('settings.history.filters.model') }}</label>
            <select
              v-model="filterModel"
              class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">{{ $t('settings.history.filters.all') }}</option>
              <option v-for="m in distinctModels" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>

          <!-- Language (only if entries have languages) -->
          <div v-if="hasLanguages" class="space-y-1">
            <label class="text-xs text-text-muted">{{ $t('settings.history.filters.language') }}</label>
            <select
              v-model="filterLanguage"
              class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">{{ $t('settings.history.filters.all') }}</option>
              <option v-for="lang in distinctLanguages" :key="lang" :value="lang">{{ lang }}</option>
            </select>
          </div>

          <!-- Date range -->
          <div class="space-y-1">
            <label class="text-xs text-text-muted">{{ $t('settings.history.filters.dateRange') }}</label>
            <select
              v-model="filterDateRange"
              class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">{{ $t('settings.history.filters.allTime') }}</option>
              <option value="7d">{{ $t('settings.history.filters.last7days') }}</option>
              <option value="30d">{{ $t('settings.history.filters.last30days') }}</option>
              <option value="90d">{{ $t('settings.history.filters.last90days') }}</option>
            </select>
          </div>

          <!-- Tags -->
          <div class="space-y-1">
            <label class="text-xs text-text-muted">{{ $t('settings.history.filters.tags') }}</label>
            <input
              v-model="filterTags"
              class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none w-36"
              :placeholder="$t('settings.history.filters.tags')"
            />
          </div>
        </div>
      </div>

      <!-- B) Results list -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <div class="text-xs text-text-muted">
          {{ $t('settings.history.results.entries', { count: filtered.length }) }}
        </div>

        <div v-if="filtered.length === 0" class="py-8 text-center text-sm text-text-secondary">
          {{ $t('settings.history.results.noEntries') }}
        </div>

        <div v-else class="max-h-96 overflow-y-auto space-y-1">
          <div
            v-for="entry in filtered"
            :key="entry.id"
            class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-overlay transition-colors"
          >
            <!-- Type icon -->
            <span class="text-base flex-shrink-0">{{ typeIcons[entry.type] ?? '' }}</span>

            <!-- Summary -->
            <span class="flex-1 text-sm text-text-primary truncate">{{ entry.summary }}</span>

            <!-- Model pill -->
            <span class="flex-shrink-0 rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary">
              {{ entry.model }}
            </span>

            <!-- Language pill -->
            <span
              v-if="entry.language"
              class="flex-shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
            >
              {{ entry.language }}
            </span>

            <!-- Token tax ratio badge -->
            <span
              v-if="entry.type === 'comparison' && entry.tokenTaxRatio != null"
              class="flex-shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] text-warning"
            >
              {{ entry.tokenTaxRatio.toFixed(2) }}x
            </span>

            <!-- Accuracy badge -->
            <span
              v-if="entry.type === 'benchmark' && entry.accuracy != null"
              class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px]"
              :class="entry.accuracy >= 0.8 ? 'bg-success/10 text-success' : entry.accuracy >= 0.5 ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'"
            >
              {{ (entry.accuracy * 100).toFixed(0) }}%
            </span>

            <!-- Relative time -->
            <span class="flex-shrink-0 text-[10px] text-text-muted w-14 text-right">
              {{ relativeTime(entry.timestamp) }}
            </span>
          </div>
        </div>
      </div>

      <!-- C) Trend charts (collapsible) -->
      <div class="rounded-lg border border-border-default bg-surface-raised">
        <button
          class="flex w-full items-center justify-between p-4 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors rounded-lg"
          @click="showTrends = !showTrends"
        >
          {{ $t('settings.history.trends.title') }}
          <span class="text-text-muted transition-transform" :class="{ 'rotate-180': showTrends }">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </span>
        </button>

        <div v-if="showTrends" class="px-4 pb-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Activity bar chart -->
            <div>
              <h4 class="text-xs text-text-muted mb-2">{{ $t('settings.history.trends.activity') }}</h4>
              <div class="h-40">
                <Bar :data="activityChartData" :options="chartOptions" />
              </div>
            </div>

            <!-- Models doughnut chart -->
            <div>
              <h4 class="text-xs text-text-muted mb-2">{{ $t('settings.history.trends.modelsUsed') }}</h4>
              <div class="h-40">
                <Doughnut :data="modelsChartData" :options="doughnutOptions" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- D) Database management -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
        <h3 class="text-sm font-medium text-text-primary">{{ $t('settings.history.management.title') }}</h3>

        <!-- Stats -->
        <div class="flex gap-6 text-sm">
          <div>
            <span class="text-text-muted">{{ $t('settings.history.management.totalEntries') }}:</span>
            <span class="ml-1 text-text-primary font-medium">{{ allEntries.length }}</span>
          </div>
          <div>
            <span class="text-text-muted">{{ $t('settings.history.management.estimatedSize') }}:</span>
            <span class="ml-1 text-text-primary font-medium">{{ estimatedSize }}</span>
          </div>
        </div>

        <!-- Export buttons -->
        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-primary hover:bg-border-default transition-colors"
            @click="exportAllJson"
          >
            {{ $t('settings.history.management.exportAll') }}
          </button>
          <button
            class="rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-primary hover:bg-border-default transition-colors"
            @click="exportFilteredCsv"
          >
            {{ $t('settings.history.management.exportFiltered') }}
          </button>
        </div>

        <!-- Retention -->
        <div class="flex items-center gap-3">
          <label class="text-sm text-text-muted">{{ $t('settings.history.management.retention') }}:</label>
          <select
            :value="retention"
            class="rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            @change="setRetention(($event.target as HTMLSelectElement).value)"
          >
            <option value="forever">{{ $t('settings.history.management.keepForever') }}</option>
            <option value="30d">{{ $t('settings.history.management.days30') }}</option>
            <option value="90d">{{ $t('settings.history.management.days90') }}</option>
            <option value="1y">{{ $t('settings.history.management.year1') }}</option>
          </select>
        </div>

        <!-- Clear history -->
        <div>
          <button
            v-if="!showConfirmClear"
            class="rounded-lg bg-error/10 px-4 py-2 text-sm text-error hover:bg-error/20 transition-colors"
            @click="showConfirmClear = true"
          >
            {{ $t('settings.history.management.clearHistory') }}
          </button>
          <div v-else class="rounded-lg border border-error/30 bg-error/5 p-3 space-y-3">
            <p class="text-sm text-text-secondary">{{ $t('settings.history.management.confirmClear') }}</p>
            <div class="flex gap-2">
              <button
                class="rounded-lg bg-error px-4 py-2 text-sm text-white hover:bg-error/80 transition-colors"
                @click="clearHistory"
              >
                {{ $t('settings.history.management.clearHistory') }}
              </button>
              <button
                class="rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-primary hover:bg-border-default transition-colors"
                @click="showConfirmClear = false"
              >
                {{ $t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
