import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { ComparisonRun, ComparisonExecution, ComparisonSlot } from '@/types/comparison'
import { comparisonDB } from '@/services/comparison-db'

export const useComparisonStore = defineStore('comparison', () => {
  const runs = ref<Map<string, ComparisonRun>>(new Map())
  const activeRunId = ref<string | null>(null)

  const activeRun = computed<ComparisonRun | null>(() => {
    if (!activeRunId.value) return null
    return runs.value.get(activeRunId.value) ?? null
  })

  function createRun(prompt: string, slots: ComparisonSlot[]): string {
    const id = nanoid()
    const executions: ComparisonExecution[] = slots.map((slot) => ({
      slotId: slot.slotId,
      model: slot.model,
      label: slot.label,
      sessionId: '',
      status: 'idle',
      outputText: '',
      metrics: null,
      effectivePrompt: slot.promptOverride ?? prompt,
      language: slot.language,
    }))

    runs.value.set(id, {
      id,
      prompt,
      slots,
      createdAt: Date.now(),
      status: 'running',
      executions,
    })

    activeRunId.value = id
    return id
  }

  function updateExecution(
    runId: string,
    slotId: string,
    partial: Partial<ComparisonExecution>,
  ) {
    const run = runs.value.get(runId)
    if (!run) return
    const exec = run.executions.find((e) => e.slotId === slotId)
    if (exec) Object.assign(exec, partial)
  }

  function finalizeRun(runId: string) {
    const run = runs.value.get(runId)
    if (run) {
      const allDone = run.executions.every(
        (e) => e.status === 'completed' || e.status === 'error',
      )
      run.status = allDone ? 'completed' : 'partial'
      // Auto-save to IndexedDB
      comparisonDB.saveRun(run).catch(() => { /* silent — persistence is best-effort */ })
    }
  }

  async function loadSavedRuns(): Promise<ComparisonRun[]> {
    return comparisonDB.getAllRuns()
  }

  async function deleteSavedRun(id: string): Promise<void> {
    await comparisonDB.deleteRun(id)
    runs.value.delete(id)
    if (activeRunId.value === id) activeRunId.value = null
  }

  function loadRunIntoView(run: ComparisonRun) {
    runs.value.set(run.id, run)
    activeRunId.value = run.id
  }

  function getExecution(
    runId: string,
    slotId: string,
  ): ComparisonExecution | undefined {
    return runs.value.get(runId)?.executions.find((e) => e.slotId === slotId)
  }

  return {
    runs,
    activeRunId,
    activeRun,
    createRun,
    updateExecution,
    finalizeRun,
    getExecution,
    loadSavedRuns,
    deleteSavedRun,
    loadRunIntoView,
  }
})
