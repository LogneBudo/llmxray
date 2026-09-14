import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  findVolatileSegments,
  hoistVolatileToEnd,
  probeLayouts,
  compareProbes,
} from '@/services/cache-lab'
import type { CacheProbe, CacheLabStatus, CacheLabVerdict } from '@/types/cache-lab'

const DEFAULT_USER = 'Say hi.'

export const useCacheLabStore = defineStore('cacheLab', () => {
  const model = ref('')
  const systemPrompt = ref('')
  const userMessage = ref(DEFAULT_USER)

  const status = ref<CacheLabStatus>('idle')
  const error = ref<string | null>(null)
  const progress = ref({ done: 0, total: 0 })
  const probes = ref<CacheProbe[]>([])
  const verdict = ref<CacheLabVerdict | null>(null)

  let controller: AbortController | null = null

  /** Volatile spans in the current prompt — the candidates for breaking reuse. */
  const volatileSegments = computed(() => findVolatileSegments(systemPrompt.value))

  /** The rewrite the lab will measure against the original. */
  const rewrittenPrompt = computed(() =>
    hoistVolatileToEnd(systemPrompt.value, volatileSegments.value),
  )

  /**
   * Where the earliest volatile span starts, as a share of the prompt. Everything
   * after it is forfeited on a cache miss, so an early span costs far more than a
   * late one — this is what makes the position, not the size, the problem.
   */
  const earliestVolatileRatio = computed(() => {
    const first = volatileSegments.value[0]
    if (!first || systemPrompt.value.length === 0) return null
    return first.start / systemPrompt.value.length
  })

  const isRunning = computed(() => status.value === 'running')
  const canRun = computed(
    () => model.value.length > 0 && systemPrompt.value.trim().length > 0 && !isRunning.value,
  )

  /**
   * Measure both layouts across a CHANGED volatile value — the situation real
   * traffic is in every turn. Each layout is sent twice, and the second send is
   * what gets reported.
   */
  async function run(): Promise<void> {
    if (!canRun.value) return

    controller = new AbortController()
    status.value = 'running'
    error.value = null
    probes.value = []
    verdict.value = null

    const original = systemPrompt.value
    const rewritten = rewrittenPrompt.value
    const layouts = [
      { label: 'original', text: original },
      { label: 'rewritten', text: rewritten },
    ]
    progress.value = { done: 0, total: layouts.length }

    try {
      const results = await probeLayouts(
        model.value,
        layouts,
        userMessage.value.trim() || DEFAULT_USER,
        controller.signal,
        (done, total) => {
          progress.value = { done, total }
        },
      )
      probes.value = results

      if (controller.signal.aborted) {
        status.value = 'cancelled'
        return
      }

      const [base, rewrite] = results
      // Only a meaningful verdict when the rewrite actually differs
      if (base && rewrite && rewritten !== original) {
        verdict.value = compareProbes(base, rewrite)
      }
      status.value = 'completed'
    } catch (e) {
      if (controller.signal.aborted) {
        status.value = 'cancelled'
        return
      }
      error.value = e instanceof Error ? e.message : String(e)
      status.value = 'error'
    } finally {
      controller = null
    }
  }

  function cancel(): void {
    controller?.abort()
  }

  function reset(): void {
    probes.value = []
    verdict.value = null
    error.value = null
    status.value = 'idle'
    progress.value = { done: 0, total: 0 }
  }

  return {
    model,
    systemPrompt,
    userMessage,
    status,
    error,
    progress,
    probes,
    verdict,
    volatileSegments,
    rewrittenPrompt,
    earliestVolatileRatio,
    isRunning,
    canRun,
    run,
    cancel,
    reset,
  }
})
