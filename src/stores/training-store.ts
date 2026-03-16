import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AiTrainingPair, AiPhase } from '@/types/canvas-ai'
import { canvasAiDB } from '@/services/canvas-ai-db'

export interface TrainingFilters {
  phase: AiPhase | null
  model: string | null
  accepted: boolean | null
  toolName: string | null
  tag: string | null
  search: string
  sortBy: 'timestamp' | 'phase' | 'model'
  sortDir: 'asc' | 'desc'
}

export interface TrainingStats {
  total: number
  accepted: number
  rejected: number
  phaseBreakdown: Map<AiPhase, number>
  modelBreakdown: Map<string, number>
  estimatedBytes: number
}

export const useTrainingStore = defineStore('training', () => {
  const pairs = ref<AiTrainingPair[]>([])
  const loading = ref(false)
  const selectedIds = ref<Set<string>>(new Set())
  const expandedId = ref<string | null>(null)

  const filters = ref<TrainingFilters>({
    phase: null,
    model: null,
    accepted: null,
    toolName: null,
    tag: null,
    search: '',
    sortBy: 'timestamp',
    sortDir: 'desc',
  })

  // ── Computed ─────────────────────────────────────────────────

  const filteredPairs = computed(() => {
    let result = [...pairs.value]
    const f = filters.value

    if (f.phase) result = result.filter((p) => p.phase === f.phase)
    if (f.model) result = result.filter((p) => p.model === f.model)
    if (f.accepted !== null) result = result.filter((p) => p.accepted === f.accepted)
    if (f.toolName) result = result.filter((p) => p.toolName === f.toolName)
    if (f.tag) result = result.filter((p) => p.tags?.includes(f.tag!) ?? false)

    if (f.search) {
      const q = f.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.userPrompt.toLowerCase().includes(q) ||
          p.response.toLowerCase().includes(q) ||
          p.toolName.toLowerCase().includes(q),
      )
    }

    result.sort((a, b) => {
      let cmp = 0
      if (f.sortBy === 'timestamp') cmp = a.timestamp - b.timestamp
      else if (f.sortBy === 'phase') cmp = a.phase.localeCompare(b.phase)
      else if (f.sortBy === 'model') cmp = a.model.localeCompare(b.model)
      return f.sortDir === 'desc' ? -cmp : cmp
    })

    return result
  })

  const stats = computed<TrainingStats>(() => {
    const all = pairs.value
    const phaseBreakdown = new Map<AiPhase, number>()
    const modelBreakdown = new Map<string, number>()
    let accepted = 0
    let estimatedBytes = 0

    for (const p of all) {
      if (p.accepted) accepted++
      phaseBreakdown.set(p.phase, (phaseBreakdown.get(p.phase) ?? 0) + 1)
      modelBreakdown.set(p.model, (modelBreakdown.get(p.model) ?? 0) + 1)
      estimatedBytes += p.systemPrompt.length + p.userPrompt.length + p.response.length
    }

    return {
      total: all.length,
      accepted,
      rejected: all.length - accepted,
      phaseBreakdown,
      modelBreakdown,
      estimatedBytes: estimatedBytes * 2, // UTF-16
    }
  })

  const allTags = computed(() => {
    const tags = new Set<string>()
    for (const p of pairs.value) {
      for (const t of p.tags ?? []) tags.add(t)
    }
    return [...tags].sort()
  })

  const allModels = computed(() =>
    [...new Set(pairs.value.map((p) => p.model))].sort(),
  )

  const allToolNames = computed(() =>
    [...new Set(pairs.value.map((p) => p.toolName))].sort(),
  )

  // ── Actions ──────────────────────────────────────────────────

  async function loadPairs() {
    loading.value = true
    try {
      pairs.value = await canvasAiDB.getAllPairs()
    } catch (e) {
      console.error('Failed to load training pairs:', e)
    } finally {
      loading.value = false
    }
  }

  async function updateResponse(id: string, newResponse: string) {
    await canvasAiDB.updatePairResponse(id, newResponse)
    const pair = pairs.value.find((p) => p.id === id)
    if (pair) pair.response = newResponse
  }

  async function updateTags(id: string, tags: string[]) {
    await canvasAiDB.updatePairTags(id, tags)
    const pair = pairs.value.find((p) => p.id === id)
    if (pair) pair.tags = tags
  }

  async function toggleAccepted(id: string) {
    const pair = pairs.value.find((p) => p.id === id)
    if (!pair) return
    const newVal = !pair.accepted
    await canvasAiDB.updateAccepted(id, newVal)
    pair.accepted = newVal
  }

  async function deletePairs(ids: string[]) {
    await canvasAiDB.deletePairs(ids)
    const idSet = new Set(ids)
    pairs.value = pairs.value.filter((p) => !idSet.has(p.id))
    for (const id of ids) selectedIds.value.delete(id)
    if (expandedId.value && idSet.has(expandedId.value)) {
      expandedId.value = null
    }
  }

  async function bulkSetAccepted(ids: string[], accepted: boolean) {
    for (const id of ids) {
      await canvasAiDB.updateAccepted(id, accepted)
      const pair = pairs.value.find((p) => p.id === id)
      if (pair) pair.accepted = accepted
    }
  }

  async function bulkAddTag(ids: string[], tag: string) {
    for (const id of ids) {
      const pair = pairs.value.find((p) => p.id === id)
      if (!pair) continue
      const tags = [...(pair.tags ?? [])]
      if (!tags.includes(tag)) {
        tags.push(tag)
        await canvasAiDB.updatePairTags(id, tags)
        pair.tags = tags
      }
    }
  }

  function exportSelected(ids: string[]) {
    canvasAiDB.exportSelectedAsJsonl(ids)
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  function selectAll() {
    selectedIds.value = new Set(filteredPairs.value.map((p) => p.id))
  }

  function deselectAll() {
    selectedIds.value = new Set()
  }

  function setExpanded(id: string | null) {
    expandedId.value = expandedId.value === id ? null : id
  }

  return {
    pairs,
    loading,
    selectedIds,
    expandedId,
    filters,
    filteredPairs,
    stats,
    allTags,
    allModels,
    allToolNames,
    loadPairs,
    updateResponse,
    updateTags,
    toggleAccepted,
    deletePairs,
    bulkSetAccepted,
    bulkAddTag,
    exportSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    setExpanded,
  }
})
