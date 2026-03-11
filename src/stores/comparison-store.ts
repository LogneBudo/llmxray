import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { ComparisonRun, ComparisonExecution } from '@/types/comparison'
import type { SessionStatus } from '@/types/session'
import type { SessionMetrics } from '@/types/metrics'

export const useComparisonStore = defineStore('comparison', () => {
  const runs = ref<Map<string, ComparisonRun>>(new Map())
  const activeRunId = ref<string | null>(null)

  const activeRun = computed<ComparisonRun | null>(() => {
    if (!activeRunId.value) return null
    return runs.value.get(activeRunId.value) ?? null
  })

  function createRun(prompt: string, models: string[]): string {
    const id = nanoid()
    const executions: ComparisonExecution[] = models.map((model) => ({
      model,
      sessionId: '',
      status: 'idle' as SessionStatus,
      outputText: '',
      metrics: null,
    }))

    runs.value.set(id, {
      id,
      prompt,
      models,
      createdAt: Date.now(),
      status: 'running',
      executions,
    })

    activeRunId.value = id
    return id
  }

  function updateExecution(
    runId: string,
    model: string,
    partial: Partial<ComparisonExecution>,
  ) {
    const run = runs.value.get(runId)
    if (!run) return
    const exec = run.executions.find((e) => e.model === model)
    if (exec) Object.assign(exec, partial)
  }

  function finalizeRun(runId: string) {
    const run = runs.value.get(runId)
    if (run) {
      const allDone = run.executions.every(
        (e) => e.status === 'completed' || e.status === 'error',
      )
      run.status = allDone ? 'completed' : 'partial'
    }
  }

  function getExecution(
    runId: string,
    model: string,
  ): ComparisonExecution | undefined {
    return runs.value.get(runId)?.executions.find((e) => e.model === model)
  }

  return {
    runs,
    activeRunId,
    activeRun,
    createRun,
    updateExecution,
    finalizeRun,
    getExecution,
  }
})
