<script setup lang="ts">
/**
 * The GPU as a map: one bar the width of the card's video memory, a block per
 * loaded model split into weights and context, the free space, and below it
 * every pulled model with whether it would fit. Refreshes from Ollama every
 * few seconds; the arithmetic is in services/gpu-map.ts.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MemoryStick } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { ollamaClient } from '@/services/ollama-client'
import { fetchSystemInfo } from '@/services/system-info-client'
import { buildGpuMap, type GpuBlock, type GpuMap } from '@/services/gpu-map'
import { formatBytes, formatDuration, formatNumber } from '@/utils/format'
import type { OllamaModel, OllamaRunningModel } from '@/types/ollama'

const { t: $tt } = useI18n()

const loaded = ref<OllamaRunningModel[]>([])
const pulled = ref<OllamaModel[]>([])
const vram = ref<number | null>(null)
const gpuName = ref<string>('')
const now = ref(Date.now())

const map = computed<GpuMap>(() => buildGpuMap(loaded.value, pulled.value, vram.value, now.value))

let timer: ReturnType<typeof setInterval> | null = null
async function refresh() {
  try {
    const [ps, tags] = await Promise.all([ollamaClient.ps(), ollamaClient.listModels()])
    loaded.value = ps
    pulled.value = tags
    now.value = Date.now()
  } catch {
    /* the daemon is away; the last map stays on screen */
  }
}
onMounted(async () => {
  const info = await fetchSystemInfo()
  const gpu = info?.gpu?.find((g) => g.adapterRamBytes > 0) ?? info?.gpu?.[0]
  if (gpu) {
    gpuName.value = gpu.name
    vram.value = gpu.adapterRamBytes > 0 ? gpu.adapterRamBytes : null
  }
  await refresh()
  timer = setInterval(refresh, 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

/** Widths as a share of the bar: the card's memory when known, else the loaded total. */
const scale = computed(() => map.value.vramBytes ?? Math.max(1, map.value.usedBytes))
function pct(bytes: number): string {
  return `${Math.max(0.5, (bytes / scale.value) * 100)}%`
}
function weightsOf(b: GpuBlock): number {
  return b.weightsBytes != null ? Math.min(b.weightsBytes, b.vramBytes) : b.vramBytes
}
function contextOf(b: GpuBlock): number {
  return Math.max(0, b.vramBytes - weightsOf(b))
}
function expiry(b: GpuBlock): string {
  if (b.expiresInMs == null) return ''
  if (b.expiresInMs === Infinity) return $tt('gpu.block.forever')
  if (b.expiresInMs <= 0) return $tt('gpu.block.expired')
  return $tt('gpu.block.expires', { time: formatDuration(b.expiresInMs) })
}

const PALETTE = ['#5b6cff', '#19a3a3', '#8b5cf6', '#2f6b8f', '#c77a1e']
function colour(i: number): string {
  return PALETTE[i % PALETTE.length]!
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-6">
    <div class="mx-auto w-full max-w-7xl space-y-4">
      <div class="flex items-start gap-3">
        <MemoryStick class="mt-1 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 class="text-lg font-semibold text-text-primary">{{ $t('gpu.title') }}</h2>
          <p class="mt-1 max-w-4xl text-sm text-text-muted">{{ $t('gpu.subtitle') }}</p>
        </div>
      </div>

      <!-- The bar -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-4">
        <p class="mb-2 text-base text-text-primary">
          <span v-if="gpuName" class="font-semibold">{{ gpuName }}</span>
          <span v-if="gpuName" class="text-text-muted"> · </span>
          <span v-if="map.vramBytes != null">{{ $t('gpu.memory', { used: formatBytes(map.usedBytes), total: formatBytes(map.vramBytes), free: formatBytes(map.freeBytes ?? 0) }) }}</span>
          <span v-else>{{ $t('gpu.memoryNoTotal', { used: formatBytes(map.usedBytes) }) }}</span>
        </p>
        <p v-if="map.vramBytes == null" class="mb-2 text-sm text-text-muted">{{ $t('gpu.noVram') }}</p>

        <div class="flex h-12 w-full gap-[3px] overflow-hidden rounded-md bg-surface-overlay">
          <template v-for="(b, i) in map.blocks" :key="b.name">
            <div class="h-full" :style="{ width: pct(weightsOf(b)), background: colour(i) }" :title="`${b.name}: ${$t('gpu.block.weights')} ${formatBytes(weightsOf(b))}`" />
            <div v-if="contextOf(b) > 0" class="h-full opacity-50" :style="{ width: pct(contextOf(b)), background: colour(i) }" :title="`${b.name}: ${$t('gpu.block.context')} ${formatBytes(contextOf(b))}`" />
          </template>
          <div v-if="map.freeBytes != null && map.freeBytes > 0" class="h-full flex-1" :title="`${$t('gpu.free')} ${formatBytes(map.freeBytes)}`" />
        </div>

        <p v-if="!map.blocks.length" class="mt-3 text-base text-text-secondary">{{ $t('gpu.nothingLoaded') }}</p>

        <!-- Blocks -->
        <div v-for="(b, i) in map.blocks" :key="b.name" class="mt-3 grid items-start gap-3" style="grid-template-columns: 1rem 1fr auto">
          <span class="mt-1.5 h-3 w-3 rounded-sm" :style="{ background: colour(i) }" />
          <div class="text-base text-text-primary">
            <span class="font-semibold">{{ b.name }}</span>
            <span v-if="b.parameterSize" class="text-text-muted"> · {{ b.parameterSize }}{{ b.quantization ? ` ${b.quantization}` : '' }}</span>
            <span v-if="b.contextLength" class="text-text-muted"> · {{ $t('gpu.block.context_length', { n: formatNumber(b.contextLength) }) }}</span>
            <div class="text-sm text-text-secondary">
              {{ $t('gpu.block.weights') }} {{ formatBytes(weightsOf(b)) }}<template v-if="contextOf(b) > 0"> · {{ $t('gpu.block.context') }} {{ formatBytes(contextOf(b)) }}</template>
              <span v-if="b.cpuBytes > 0" class="text-warning"> · {{ $t('gpu.block.spilled', { bytes: formatBytes(b.cpuBytes) }) }}</span>
            </div>
          </div>
          <span class="text-sm text-text-muted">{{ expiry(b) }}</span>
        </div>
      </div>

      <!-- What else would fit -->
      <section>
        <h3 class="text-base font-semibold text-text-primary">{{ $t('gpu.fits.title') }}</h3>
        <p class="mb-2 max-w-4xl text-sm text-text-muted">{{ $t('gpu.fits.hint') }}</p>
        <div class="rounded-lg border border-border-default bg-surface-raised px-4">
          <p v-if="!map.candidates.length" class="py-3 text-text-muted">{{ $t('gpu.fits.none') }}</p>
          <div v-for="c in map.candidates" :key="c.name" class="grid items-center gap-4 border-t border-border-default/60 py-2 text-base first:border-t-0" style="grid-template-columns: 1fr 7rem 1fr">
            <span class="text-text-primary">{{ c.name }}<span v-if="c.parameterSize" class="text-text-muted"> · {{ c.parameterSize }}{{ c.quantization ? ` ${c.quantization}` : '' }}</span></span>
            <span class="text-end tabular-nums text-text-secondary">{{ formatBytes(c.fileBytes) }}</span>
            <span :class="c.verdict === 'fits-now' ? 'text-success' : c.verdict === 'fits-alone' ? 'text-warning' : 'text-error'">{{ $t(`gpu.fits.${c.verdict}`) }}</span>
          </div>
        </div>
      </section>

      <p class="max-w-4xl text-sm text-text-muted">{{ $t('gpu.foot') }}</p>
    </div>
  </div>
</template>
