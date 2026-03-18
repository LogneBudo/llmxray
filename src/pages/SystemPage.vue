<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loader2, Download } from 'lucide-vue-next'
import { downloadJson, downloadMarkdown } from '@/utils/download'
import { ollamaClient } from '@/services/ollama-client'
import { useMetricsStore } from '@/stores/metrics-store'
import { useModelStore } from '@/stores/model-store'
import type { OllamaRunningModel } from '@/types/ollama'
import { formatBytes } from '@/utils/format'
import { fetchSystemInfo, type SystemHardwareInfo } from '@/services/system-info-client'
import { useStorageStore } from '@/stores/storage-store'
import StorageGauge from '@/components/storage/StorageGauge.vue'
import StorageBreakdownCard from '@/components/storage/StorageBreakdownCard.vue'

const metricsStore = useMetricsStore()
const modelStore = useModelStore()
const storageStore = useStorageStore()

const confirmClearId = ref<string | null>(null)

async function handleClearDatabase(id: string) {
  if (confirmClearId.value === id) {
    // Confirmed — clear the database
    const clearFns: Record<string, () => Promise<void>> = {
      'rag': () => import('@/services/vector-db').then((m) => m.vectorDB.clear()),
      'conversations': () => import('@/services/conversation-db').then((m) => m.conversationDB.clear()),
      'benchmarks': () => import('@/services/benchmark-db').then((m) => m.benchmarkDB.clear()),
      'message-memory': () => import('@/services/message-memory-db').then((m) => m.messageMemoryDB.clear()),
      'canvas-ai': () => import('@/services/canvas-ai-db').then((m) => m.canvasAiDB.clear()),
    }
    try {
      await clearFns[id]?.()
      await storageStore.refresh()
    } catch (e) {
      console.error(`Failed to clear database ${id}:`, e)
    }
    confirmClearId.value = null
  } else {
    confirmClearId.value = id
    setTimeout(() => {
      if (confirmClearId.value === id) confirmClearId.value = null
    }, 3000)
  }
}

// Ollama info
const ollamaVersion = ref<string | null>(null)
const ollamaConnected = ref(false)
const runningModels = ref<OllamaRunningModel[]>([])

// Real hardware info from server plugin
const hwInfo = ref<SystemHardwareInfo | null>(null)
const hwLoading = ref(true)

// Model storage totals
const totalModelSize = computed(() =>
  modelStore.models.reduce((sum, m) => sum + m.size, 0),
)
const totalVram = computed(() =>
  runningModels.value.reduce((sum, m) => sum + m.size_vram, 0),
)
const totalRam = computed(() =>
  runningModels.value.reduce((sum, m) => sum + (m.size - m.size_vram), 0),
)

// Performance aggregates
const aggregate = computed(() => metricsStore.aggregate)

// Formatted helpers
const cpuClockGhz = computed(() => {
  if (!hwInfo.value) return ''
  const mhz = hwInfo.value.cpu.maxClockMhz
  return mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${mhz} MHz`
})

const memoryUsedPercent = computed(() => {
  if (!hwInfo.value) return 0
  const { totalBytes, freeBytes } = hwInfo.value.memory
  return totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 100) : 0
})

const showExportMenu = ref(false)

function exportSystemJson() {
  // Strip device name for privacy
  const hw = hwInfo.value
  const safeHardware = hw ? {
    os: hw.os,
    cpu: hw.cpu,
    memory: hw.memory,
    gpu: hw.gpu,
    storage: hw.storage,
  } : null
  const data = {
    hardware: safeHardware,
    ollama: {
      connected: ollamaConnected.value,
      version: ollamaVersion.value,
      installedModels: modelStore.models.map((m) => ({
        name: m.name,
        size: m.size,
        family: m.details.family,
        parameterSize: m.details.parameter_size,
        quantization: m.details.quantization_level,
      })),
      runningModels: runningModels.value,
    },
    inference: aggregate.value,
    storage: {
      origin: storageStore.origin,
      databases: storageStore.databases,
    },
  }
  downloadJson(data, `system-report-${new Date().toISOString().slice(0, 10)}.json`)
  showExportMenu.value = false
}

function exportSystemMarkdown() {
  const hw = hwInfo.value
  const lines: string[] = [
    `# System Report — LLMxRay`,
    '',
    `**Date:** ${new Date().toLocaleString()}`,
    '',
  ]

  if (hw) {
    lines.push(`## Operating System`)
    lines.push(`- **OS:** ${hw.os.name}`)
    lines.push(`- **Version:** ${hw.os.version}`)
    lines.push(`- **Architecture:** ${hw.os.arch}`)
    lines.push('')

    lines.push(`## Processor`)
    lines.push(`- **CPU:** ${hw.cpu.name}`)
    lines.push(`- **Cores:** ${hw.cpu.cores} physical, ${hw.cpu.logicalProcessors} logical`)
    lines.push(`- **Max Clock:** ${hw.cpu.maxClockMhz >= 1000 ? (hw.cpu.maxClockMhz / 1000).toFixed(2) + ' GHz' : hw.cpu.maxClockMhz + ' MHz'}`)
    lines.push('')

    lines.push(`## Memory`)
    lines.push(`- **Total:** ${formatBytes(hw.memory.totalBytes)}`)
    lines.push(`- **Available:** ${formatBytes(hw.memory.freeBytes)}`)
    lines.push(`- **Used:** ${formatBytes(hw.memory.totalBytes - hw.memory.freeBytes)} (${memoryUsedPercent.value}%)`)
    lines.push('')

    lines.push(`## Graphics`)
    for (const gpu of hw.gpu) {
      lines.push(`- **GPU:** ${gpu.name}`)
      lines.push(`  - Adapter RAM: ${gpu.adapterRamBytes > 0 ? formatBytes(gpu.adapterRamBytes) : 'Shared / Not reported'}`)
      if (gpu.driverVersion) lines.push(`  - Driver: ${gpu.driverVersion}`)
    }
    lines.push('')

    lines.push(`## Storage`)
    for (const disk of hw.storage) {
      lines.push(`- **${disk.drive}:** ${formatBytes(disk.totalBytes)} total, ${formatBytes(disk.freeBytes)} free`)
    }
    lines.push('')
  }

  lines.push(`## Ollama Runtime`)
  lines.push(`- **Status:** ${ollamaConnected.value ? 'Connected' : 'Disconnected'}`)
  if (ollamaVersion.value) lines.push(`- **Version:** ${ollamaVersion.value}`)
  lines.push(`- **Installed Models:** ${modelStore.models.length}`)
  if (modelStore.models.length > 0) {
    for (const m of modelStore.models) {
      lines.push(`  - ${m.name} (${m.details.parameter_size ?? '?'}, ${m.details.quantization_level ?? '?'})`)
    }
  }
  lines.push(`- **Total Model Storage:** ${formatBytes(totalModelSize.value)}`)
  lines.push(`- **Active Models:** ${runningModels.value.length}`)
  if (runningModels.value.length > 0) {
    for (const rm of runningModels.value) {
      lines.push(`  - ${rm.name} (ctx: ${rm.context_length ?? '?'})`)
    }
  }
  lines.push('')

  if (aggregate.value.totalSessions > 0) {
    lines.push(`## Inference (This Session)`)
    lines.push(`- **Sessions:** ${aggregate.value.totalSessions}`)
    lines.push(`- **Avg Speed:** ${aggregate.value.avgTps.toFixed(1)} tok/s`)
    lines.push(`- **Tokens Generated:** ${aggregate.value.totalTokensGenerated.toLocaleString()}`)
    lines.push(`- **Avg TTFT:** ${aggregate.value.avgTtftMs.toFixed(0)} ms`)
    lines.push('')
  }

  lines.push(`---`)
  lines.push(`*Generated by LLMxRay — Local LLM Observatory*`)

  downloadMarkdown(lines.join('\n'), `system-report-${new Date().toISOString().slice(0, 10)}.md`)
  showExportMenu.value = false
}

let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchOllamaInfo() {
  try {
    ollamaVersion.value = await ollamaClient.version()
    ollamaConnected.value = true
  } catch {
    ollamaConnected.value = false
    ollamaVersion.value = null
  }

  try {
    runningModels.value = await ollamaClient.ps()
  } catch {
    runningModels.value = []
  }
}

async function refreshAll() {
  await Promise.all([
    fetchOllamaInfo(),
    fetchSystemInfo().then((info) => {
      if (info) hwInfo.value = info
    }),
    storageStore.refreshIfStale(30_000),
  ])
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expiring...'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

onMounted(async () => {
  hwLoading.value = true
  await refreshAll()
  hwLoading.value = false

  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
  metricsStore.recalculateAggregate()
  // Poll running models + memory every 5s
  pollInterval = setInterval(refreshAll, 5_000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="max-w-4xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-text-primary">{{ $t('system.title') }}</h2>
        <p class="text-xs text-text-muted mt-0.5">{{ $t('system.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Export dropdown -->
        <div class="relative">
          <button
            class="flex items-center gap-1 rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary hover:bg-border-default transition-colors"
            @click="showExportMenu = !showExportMenu"
          >
            <Download class="h-3.5 w-3.5" />
            {{ $t('system.export.title') }}
          </button>
          <div v-if="showExportMenu" class="fixed inset-0 z-10" @click="showExportMenu = false" />
          <div
            v-if="showExportMenu"
            class="absolute end-0 top-full z-20 mt-1 w-64 rounded-lg border border-border-default bg-surface-raised shadow-lg py-1"
          >
            <button class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay" @click="exportSystemMarkdown">
              {{ $t('system.export.downloadMarkdown') }}
            </button>
            <button class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay" @click="exportSystemJson">
              {{ $t('system.export.downloadJson') }}
            </button>
          </div>
        </div>
        <button
          class="rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary hover:bg-border-default transition-colors"
          @click="refreshAll"
        >
          {{ $t('system.refresh') }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="hwLoading && !hwInfo" class="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 class="h-10 w-10 animate-spin text-accent" />
      <p class="text-sm text-text-secondary">{{ $t('system.detecting') }}</p>
      <p class="text-[10px] text-text-muted">{{ $t('system.detectingDetail') }}</p>
    </div>

    <!-- Fallback when hardware info unavailable -->
    <div v-if="!hwLoading && !hwInfo" class="rounded-lg border border-border-default bg-surface-raised p-4 text-xs text-text-muted">
      {{ $t('system.unavailable') }}
    </div>

    <template v-if="hwInfo">
      <!-- Top row: System + Device side by side -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Operating System -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F5A5;</span> {{ $t('system.os.title') }}
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">{{ $t('system.os.os') }}</span>
            <span class="text-text-primary">{{ hwInfo.os.name }}</span>
            <span class="text-text-muted">{{ $t('system.os.version') }}</span>
            <span class="text-text-primary">{{ hwInfo.os.version }}</span>
            <span class="text-text-muted">{{ $t('system.os.build') }}</span>
            <span class="text-text-primary">{{ hwInfo.os.build || '—' }}</span>
            <span class="text-text-muted">{{ $t('system.os.architecture') }}</span>
            <span class="text-text-primary">{{ hwInfo.os.arch }}</span>
          </div>
        </div>

        <!-- Device -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F4BB;</span> {{ $t('system.device.title') }}
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">{{ $t('system.device.name') }}</span>
            <span class="text-text-primary">{{ hwInfo.device.name }}</span>
            <span class="text-text-muted">{{ $t('system.device.manufacturer') }}</span>
            <span class="text-text-primary">{{ hwInfo.device.manufacturer || '—' }}</span>
            <span class="text-text-muted">{{ $t('system.device.model') }}</span>
            <span class="text-text-primary">{{ hwInfo.device.model || '—' }}</span>
            <template v-if="hwInfo.device.family">
              <span class="text-text-muted">{{ $t('system.device.family') }}</span>
              <span class="text-text-primary">{{ hwInfo.device.family }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- CPU + Memory row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- CPU -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x2699;</span> {{ $t('system.cpu.title') }}
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">{{ $t('system.cpu.cpu') }}</span>
            <span class="text-text-primary">{{ hwInfo.cpu.name }}</span>
            <span class="text-text-muted">{{ $t('system.cpu.physicalCores') }}</span>
            <span class="text-text-primary">{{ hwInfo.cpu.cores }}</span>
            <span class="text-text-muted">{{ $t('system.cpu.logicalProcessors') }}</span>
            <span class="text-text-primary">{{ hwInfo.cpu.logicalProcessors }}</span>
            <span class="text-text-muted">{{ $t('system.cpu.maxClock') }}</span>
            <span class="text-text-primary">{{ cpuClockGhz }}</span>
          </div>
        </div>

        <!-- Memory -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F9E0;</span> {{ $t('system.memory.title') }}
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">{{ $t('system.memory.totalRam') }}</span>
            <span class="text-text-primary">{{ formatBytes(hwInfo.memory.totalBytes) }}</span>
            <span class="text-text-muted">{{ $t('system.memory.available') }}</span>
            <span class="text-text-primary">{{ formatBytes(hwInfo.memory.freeBytes) }}</span>
            <span class="text-text-muted">{{ $t('system.memory.inUse') }}</span>
            <span class="text-text-primary">{{ formatBytes(hwInfo.memory.totalBytes - hwInfo.memory.freeBytes) }} ({{ memoryUsedPercent }}%)</span>
          </div>
          <!-- Memory bar -->
          <div class="h-2 rounded-full bg-surface-overlay overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="memoryUsedPercent > 85 ? 'bg-error' : memoryUsedPercent > 60 ? 'bg-warning' : 'bg-success'"
              :style="{ width: `${memoryUsedPercent}%` }"
            />
          </div>
        </div>
      </div>

      <!-- GPU -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x1F3AE;</span> {{ $t('system.gpu.title') }}
        </h3>
        <div v-for="(gpu, i) in hwInfo.gpu" :key="i" class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">{{ $t('system.gpu.gpu') }} {{ hwInfo.gpu.length > 1 ? i + 1 : '' }}</span>
          <span class="text-text-primary">{{ gpu.name }}</span>
          <span class="text-text-muted">{{ $t('system.gpu.adapterRam') }}</span>
          <span class="text-text-primary">{{ gpu.adapterRamBytes > 0 ? formatBytes(gpu.adapterRamBytes) : $t('system.gpu.sharedNotReported') }}</span>
          <template v-if="gpu.driverVersion">
            <span class="text-text-muted">{{ $t('system.gpu.driver') }}</span>
            <span class="text-text-primary">{{ gpu.driverVersion }}</span>
          </template>
          <template v-if="i < hwInfo.gpu.length - 1">
            <div class="col-span-2 border-b border-border-default/50 my-1" />
          </template>
        </div>
      </div>

      <!-- Storage -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x1F4BE;</span> {{ $t('system.storage.title') }}
        </h3>
        <div v-for="(disk, i) in hwInfo.storage" :key="i" class="space-y-2">
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">{{ $t('system.storage.drive') }}</span>
            <span class="text-text-primary">{{ disk.drive }}</span>
            <span class="text-text-muted">{{ $t('system.storage.total') }}</span>
            <span class="text-text-primary">{{ formatBytes(disk.totalBytes) }}</span>
            <span class="text-text-muted">{{ $t('system.storage.free') }}</span>
            <span class="text-text-primary">{{ formatBytes(disk.freeBytes) }}</span>
            <span class="text-text-muted">{{ $t('system.storage.used') }}</span>
            <span class="text-text-primary">
              {{ formatBytes(disk.totalBytes - disk.freeBytes) }}
              ({{ disk.totalBytes > 0 ? Math.round(((disk.totalBytes - disk.freeBytes) / disk.totalBytes) * 100) : 0 }}%)
            </span>
          </div>
          <!-- Storage bar -->
          <div class="h-2 rounded-full bg-surface-overlay overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="disk.totalBytes > 0 && ((disk.totalBytes - disk.freeBytes) / disk.totalBytes) > 0.85 ? 'bg-error' : ((disk.totalBytes - disk.freeBytes) / disk.totalBytes) > 0.6 ? 'bg-warning' : 'bg-success'"
              :style="{ width: `${disk.totalBytes > 0 ? ((disk.totalBytes - disk.freeBytes) / disk.totalBytes * 100) : 0}%` }"
            />
          </div>
          <div v-if="i < hwInfo.storage.length - 1" class="border-b border-border-default/50" />
        </div>
      </div>
    </template>

    <!-- Browser Storage -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x1F4C0;</span> {{ $t('system.browserStorage.title') }}
        </h3>
        <div class="flex items-center gap-2">
          <span
            v-if="storageStore.origin"
            class="rounded-full px-2 py-0.5 text-[9px]"
            :class="storageStore.origin.persisted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
          >
            {{ storageStore.origin.persisted ? $t('system.browserStorage.persistent') : $t('system.browserStorage.bestEffort') }}
          </span>
          <button
            v-if="!storageStore.loading"
            class="text-[10px] text-text-muted hover:text-text-primary transition-colors"
            @click="storageStore.refresh()"
          >
            {{ $t('system.refresh') }}
          </button>
          <span v-else class="text-[10px] text-text-muted">{{ $t('system.browserStorage.scanning') }}</span>
        </div>
      </div>

      <StorageGauge
        v-if="storageStore.origin"
        :used="storageStore.origin.usage"
        :total="storageStore.origin.quota"
        :label="$t('system.browserStorage.indexedDbQuota')"
      />

      <div v-if="storageStore.databases.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StorageBreakdownCard
          v-for="db in storageStore.databases"
          :key="db.id"
          :database="db"
          @clear="handleClearDatabase"
        />
      </div>

      <p v-if="storageStore.databases.length > 0" class="text-[9px] text-text-muted">
        {{ $t('system.browserStorage.totalRecords', { count: storageStore.totalRecordCount.toLocaleString(), databases: storageStore.databases.length }) }}
      </p>
    </div>

    <!-- Ollama Runtime -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x26A1;</span> {{ $t('system.ollama.title') }}
        </h3>
        <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">{{ $t('system.ollama.status') }}</span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full" :class="ollamaConnected ? 'bg-success' : 'bg-error'" />
            <span :class="ollamaConnected ? 'text-success' : 'text-error'">{{ ollamaConnected ? $t('common.status.connected') : $t('common.status.disconnected') }}</span>
          </span>
          <span class="text-text-muted">{{ $t('system.ollama.version') }}</span>
          <span class="text-text-primary">{{ ollamaVersion ?? '—' }}</span>
          <span class="text-text-muted">{{ $t('system.ollama.installedModels') }}</span>
          <span class="text-text-primary">{{ modelStore.models.length }}</span>
          <span class="text-text-muted">{{ $t('system.ollama.totalModelStorage') }}</span>
          <span class="text-text-primary">{{ formatBytes(totalModelSize) }}</span>
          <span class="text-text-muted">{{ $t('system.ollama.modelsLoaded') }}</span>
          <span class="text-text-primary">{{ runningModels.length }}</span>
        </div>
      </div>

      <!-- Inference Performance (compact) -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x1F4CA;</span> {{ $t('system.inference.title') }}
          <span class="text-[10px] text-text-muted font-normal">({{ $t('system.inference.thisSession') }})</span>
        </h3>

        <div v-if="aggregate.totalSessions === 0" class="text-xs text-text-muted py-2">
          {{ $t('system.inference.noSessions') }}
        </div>

        <div v-else class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">{{ $t('system.inference.sessions') }}</span>
          <span class="text-text-primary font-medium">{{ aggregate.totalSessions }}</span>
          <span class="text-text-muted">{{ $t('system.inference.avgSpeed') }}</span>
          <span class="text-accent font-medium">{{ aggregate.avgTps.toFixed(1) }} tok/s</span>
          <span class="text-text-muted">{{ $t('system.inference.tokensGenerated') }}</span>
          <span class="text-text-primary font-medium">{{ aggregate.totalTokensGenerated.toLocaleString() }}</span>
          <span class="text-text-muted">{{ $t('system.inference.avgTtft') }}</span>
          <span class="text-text-primary font-medium">{{ aggregate.avgTtftMs.toFixed(0) }} ms</span>
        </div>

        <div v-if="aggregate.modelsUsed.length > 0" class="flex flex-wrap gap-1.5 pt-1">
          <span class="text-[10px] text-text-muted me-1">{{ $t('system.inference.modelsUsed') }}:</span>
          <span
            v-for="name in aggregate.modelsUsed"
            :key="name"
            class="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary"
          >{{ name }}</span>
        </div>
      </div>
    </div>

    <!-- Active Models -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
        <span class="text-base">&#x26A1;</span> {{ $t('system.activeModels.title') }}
      </h3>

      <div v-if="runningModels.length === 0" class="text-xs text-text-muted py-2">
        {{ $t('system.activeModels.noModels') }}
      </div>

      <div v-else class="space-y-2">
        <!-- Summary bar -->
        <div class="flex gap-4 text-xs text-text-secondary">
          <span v-if="totalVram > 0">{{ $t('system.activeModels.vram') }}: <span class="text-accent font-medium">{{ formatBytes(totalVram) }}</span></span>
          <span v-if="totalRam > 0">{{ $t('system.activeModels.ram') }}: <span class="text-text-primary font-medium">{{ formatBytes(totalRam) }}</span></span>
          <span>{{ $t('system.activeModels.total') }}: <span class="text-text-primary font-medium">{{ formatBytes(totalVram + totalRam) }}</span></span>
        </div>

        <!-- Model cards -->
        <div
          v-for="model in runningModels"
          :key="model.digest"
          class="flex items-center gap-4 rounded-lg bg-surface px-4 py-3 border border-border-default"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ model.name }}</p>
            <p class="text-xs text-text-muted">
              {{ model.details.parameter_size }} · {{ model.details.quantization_level }} · {{ model.details.family }}
            </p>
          </div>
          <div class="text-end text-xs space-y-0.5 shrink-0">
            <p v-if="model.size_vram > 0">
              <span class="text-text-muted">{{ $t('system.activeModels.vram') }}</span>
              <span class="ms-1.5 text-accent font-medium">{{ formatBytes(model.size_vram) }}</span>
            </p>
            <p v-if="model.size - model.size_vram > 0">
              <span class="text-text-muted">{{ $t('system.activeModels.ram') }}</span>
              <span class="ms-1.5 text-text-primary font-medium">{{ formatBytes(model.size - model.size_vram) }}</span>
            </p>
            <p>
              <span class="text-text-muted">{{ $t('system.activeModels.ctx') }}</span>
              <span class="ms-1.5 text-text-secondary">{{ model.context_length.toLocaleString() }}</span>
            </p>
          </div>
          <div class="text-xs text-text-muted shrink-0 w-16 text-end" :title="model.expires_at">
            {{ formatExpiry(model.expires_at) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Installed Models Summary -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
        <span class="text-base">&#x1F4E6;</span> {{ $t('system.installedModels.title') }}
      </h3>

      <div v-if="modelStore.models.length === 0" class="text-xs text-text-muted py-2">
        {{ $t('system.installedModels.noModels') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-default text-text-muted">
              <th class="text-start py-1.5 pe-4 font-medium">{{ $t('system.installedModels.model') }}</th>
              <th class="text-start py-1.5 pe-4 font-medium">{{ $t('system.installedModels.family') }}</th>
              <th class="text-start py-1.5 pe-4 font-medium">{{ $t('system.installedModels.parameters') }}</th>
              <th class="text-start py-1.5 pe-4 font-medium">{{ $t('system.installedModels.quantization') }}</th>
              <th class="text-end py-1.5 font-medium">{{ $t('system.installedModels.size') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="model in modelStore.models"
              :key="model.name"
              class="border-b border-border-default/50"
            >
              <td class="py-1.5 pe-4 text-text-primary font-medium">{{ model.name }}</td>
              <td class="py-1.5 pe-4 text-text-secondary">{{ model.details.family }}</td>
              <td class="py-1.5 pe-4 text-text-secondary">{{ model.details.parameter_size }}</td>
              <td class="py-1.5 pe-4 text-text-secondary">{{ model.details.quantization_level }}</td>
              <td class="py-1.5 text-end text-text-secondary">{{ formatBytes(model.size) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
