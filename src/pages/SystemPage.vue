<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ollamaClient } from '@/services/ollama-client'
import { useMetricsStore } from '@/stores/metrics-store'
import { useModelStore } from '@/stores/model-store'
import type { OllamaRunningModel } from '@/types/ollama'
import { formatBytes } from '@/utils/format'
import { fetchSystemInfo, type SystemHardwareInfo } from '@/services/system-info-client'

const metricsStore = useMetricsStore()
const modelStore = useModelStore()

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
        <h2 class="text-lg font-semibold text-text-primary">My System</h2>
        <p class="text-xs text-text-muted mt-0.5">Hardware, runtime, and inference overview</p>
      </div>
      <button
        class="rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary hover:bg-border-default transition-colors"
        @click="refreshAll"
      >
        Refresh
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="hwLoading && !hwInfo" class="flex flex-col items-center justify-center py-16 gap-4">
      <svg class="h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path class="opacity-80" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>
      <p class="text-sm text-text-secondary">Detecting hardware...</p>
      <p class="text-[10px] text-text-muted">Querying CPU, memory, GPU, and storage</p>
    </div>

    <!-- Fallback when hardware info unavailable -->
    <div v-if="!hwLoading && !hwInfo" class="rounded-lg border border-border-default bg-surface-raised p-4 text-xs text-text-muted">
      Hardware detection unavailable. Please restart the dev server (<code class="text-text-secondary">npm run dev</code>) to enable the system info plugin.
    </div>

    <template v-if="hwInfo">
      <!-- Top row: System + Device side by side -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Operating System -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F5A5;</span> Operating System
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">OS</span>
            <span class="text-text-primary">{{ hwInfo.os.name }}</span>
            <span class="text-text-muted">Version</span>
            <span class="text-text-primary">{{ hwInfo.os.version }}</span>
            <span class="text-text-muted">Build</span>
            <span class="text-text-primary">{{ hwInfo.os.build || '—' }}</span>
            <span class="text-text-muted">Architecture</span>
            <span class="text-text-primary">{{ hwInfo.os.arch }}</span>
          </div>
        </div>

        <!-- Device -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F4BB;</span> Device
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">Name</span>
            <span class="text-text-primary">{{ hwInfo.device.name }}</span>
            <span class="text-text-muted">Manufacturer</span>
            <span class="text-text-primary">{{ hwInfo.device.manufacturer || '—' }}</span>
            <span class="text-text-muted">Model</span>
            <span class="text-text-primary">{{ hwInfo.device.model || '—' }}</span>
            <template v-if="hwInfo.device.family">
              <span class="text-text-muted">Family</span>
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
            <span class="text-base">&#x2699;</span> Processor
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">CPU</span>
            <span class="text-text-primary">{{ hwInfo.cpu.name }}</span>
            <span class="text-text-muted">Physical Cores</span>
            <span class="text-text-primary">{{ hwInfo.cpu.cores }}</span>
            <span class="text-text-muted">Logical Processors</span>
            <span class="text-text-primary">{{ hwInfo.cpu.logicalProcessors }}</span>
            <span class="text-text-muted">Max Clock</span>
            <span class="text-text-primary">{{ cpuClockGhz }}</span>
          </div>
        </div>

        <!-- Memory -->
        <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
          <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
            <span class="text-base">&#x1F9E0;</span> Memory
          </h3>
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">Total RAM</span>
            <span class="text-text-primary">{{ formatBytes(hwInfo.memory.totalBytes) }}</span>
            <span class="text-text-muted">Available</span>
            <span class="text-text-primary">{{ formatBytes(hwInfo.memory.freeBytes) }}</span>
            <span class="text-text-muted">In Use</span>
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
          <span class="text-base">&#x1F3AE;</span> Graphics
        </h3>
        <div v-for="(gpu, i) in hwInfo.gpu" :key="i" class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">GPU {{ hwInfo.gpu.length > 1 ? i + 1 : '' }}</span>
          <span class="text-text-primary">{{ gpu.name }}</span>
          <span class="text-text-muted">Adapter RAM</span>
          <span class="text-text-primary">{{ gpu.adapterRamBytes > 0 ? formatBytes(gpu.adapterRamBytes) : 'Shared / Not reported' }}</span>
          <template v-if="gpu.driverVersion">
            <span class="text-text-muted">Driver</span>
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
          <span class="text-base">&#x1F4BE;</span> Storage
        </h3>
        <div v-for="(disk, i) in hwInfo.storage" :key="i" class="space-y-2">
          <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
            <span class="text-text-muted">Drive</span>
            <span class="text-text-primary">{{ disk.drive }}</span>
            <span class="text-text-muted">Total</span>
            <span class="text-text-primary">{{ formatBytes(disk.totalBytes) }}</span>
            <span class="text-text-muted">Free</span>
            <span class="text-text-primary">{{ formatBytes(disk.freeBytes) }}</span>
            <span class="text-text-muted">Used</span>
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

    <!-- Ollama Runtime -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x26A1;</span> Ollama Runtime
        </h3>
        <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">Status</span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full" :class="ollamaConnected ? 'bg-success' : 'bg-error'" />
            <span :class="ollamaConnected ? 'text-success' : 'text-error'">{{ ollamaConnected ? 'Connected' : 'Disconnected' }}</span>
          </span>
          <span class="text-text-muted">Version</span>
          <span class="text-text-primary">{{ ollamaVersion ?? '—' }}</span>
          <span class="text-text-muted">Installed Models</span>
          <span class="text-text-primary">{{ modelStore.models.length }}</span>
          <span class="text-text-muted">Total Model Storage</span>
          <span class="text-text-primary">{{ formatBytes(totalModelSize) }}</span>
          <span class="text-text-muted">Models Loaded</span>
          <span class="text-text-primary">{{ runningModels.length }}</span>
        </div>
      </div>

      <!-- Inference Performance (compact) -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
        <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
          <span class="text-base">&#x1F4CA;</span> Inference
          <span class="text-[10px] text-text-muted font-normal">(this session)</span>
        </h3>

        <div v-if="aggregate.totalSessions === 0" class="text-xs text-text-muted py-2">
          No inference sessions yet.
        </div>

        <div v-else class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
          <span class="text-text-muted">Sessions</span>
          <span class="text-text-primary font-medium">{{ aggregate.totalSessions }}</span>
          <span class="text-text-muted">Avg Speed</span>
          <span class="text-accent font-medium">{{ aggregate.avgTps.toFixed(1) }} tok/s</span>
          <span class="text-text-muted">Tokens Generated</span>
          <span class="text-text-primary font-medium">{{ aggregate.totalTokensGenerated.toLocaleString() }}</span>
          <span class="text-text-muted">Avg TTFT</span>
          <span class="text-text-primary font-medium">{{ aggregate.avgTtftMs.toFixed(0) }} ms</span>
        </div>

        <div v-if="aggregate.modelsUsed.length > 0" class="flex flex-wrap gap-1.5 pt-1">
          <span class="text-[10px] text-text-muted mr-1">Models used:</span>
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
        <span class="text-base">&#x26A1;</span> Active Models
      </h3>

      <div v-if="runningModels.length === 0" class="text-xs text-text-muted py-2">
        No models currently loaded in memory. Send a message to load one.
      </div>

      <div v-else class="space-y-2">
        <!-- Summary bar -->
        <div class="flex gap-4 text-xs text-text-secondary">
          <span v-if="totalVram > 0">VRAM: <span class="text-accent font-medium">{{ formatBytes(totalVram) }}</span></span>
          <span v-if="totalRam > 0">RAM: <span class="text-text-primary font-medium">{{ formatBytes(totalRam) }}</span></span>
          <span>Total: <span class="text-text-primary font-medium">{{ formatBytes(totalVram + totalRam) }}</span></span>
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
          <div class="text-right text-xs space-y-0.5 shrink-0">
            <p v-if="model.size_vram > 0">
              <span class="text-text-muted">VRAM</span>
              <span class="ml-1.5 text-accent font-medium">{{ formatBytes(model.size_vram) }}</span>
            </p>
            <p v-if="model.size - model.size_vram > 0">
              <span class="text-text-muted">RAM</span>
              <span class="ml-1.5 text-text-primary font-medium">{{ formatBytes(model.size - model.size_vram) }}</span>
            </p>
            <p>
              <span class="text-text-muted">Ctx</span>
              <span class="ml-1.5 text-text-secondary">{{ model.context_length.toLocaleString() }}</span>
            </p>
          </div>
          <div class="text-xs text-text-muted shrink-0 w-16 text-right" :title="model.expires_at">
            {{ formatExpiry(model.expires_at) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Installed Models Summary -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <h3 class="text-sm font-medium text-text-primary flex items-center gap-2">
        <span class="text-base">&#x1F4E6;</span> Installed Models
      </h3>

      <div v-if="modelStore.models.length === 0" class="text-xs text-text-muted py-2">
        No models installed.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-default text-text-muted">
              <th class="text-left py-1.5 pr-4 font-medium">Model</th>
              <th class="text-left py-1.5 pr-4 font-medium">Family</th>
              <th class="text-left py-1.5 pr-4 font-medium">Parameters</th>
              <th class="text-left py-1.5 pr-4 font-medium">Quantization</th>
              <th class="text-right py-1.5 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="model in modelStore.models"
              :key="model.name"
              class="border-b border-border-default/50"
            >
              <td class="py-1.5 pr-4 text-text-primary font-medium">{{ model.name }}</td>
              <td class="py-1.5 pr-4 text-text-secondary">{{ model.details.family }}</td>
              <td class="py-1.5 pr-4 text-text-secondary">{{ model.details.parameter_size }}</td>
              <td class="py-1.5 pr-4 text-text-secondary">{{ model.details.quantization_level }}</td>
              <td class="py-1.5 text-right text-text-secondary">{{ formatBytes(model.size) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
