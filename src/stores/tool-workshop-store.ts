import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { OllamaToolDefinition } from '@/types/ollama'
import type { WorkshopTool } from '@/types/tool-workshop'
import { createEmptyImplementation } from '@/types/tool-workshop'

const STORAGE_KEY = 'llmxray-workshop-tools'
const OLD_STORAGE_KEY = 'llmxray-tool-definitions'

export const useToolWorkshopStore = defineStore('tool-workshop', () => {
  const tools = ref<Record<string, WorkshopTool>>({})
  const selectedToolId = ref<string | null>(null)

  // --- Persistence ---

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr: WorkshopTool[] = JSON.parse(raw)
        const record: Record<string, WorkshopTool> = {}
        for (const t of arr) record[t.id] = t
        tools.value = record
        return
      }
      // Migrate from old tool-definition-store if no workshop data exists
      migrateFromOldStore()
    } catch {
      // Ignore corrupt data
    }
  }

  function migrateFromOldStore() {
    try {
      const raw = localStorage.getItem(OLD_STORAGE_KEY)
      if (!raw) return
      const arr = JSON.parse(raw) as Array<{
        id: string
        definition: OllamaToolDefinition
        enabled: boolean
        createdAt: number
        updatedAt: number
      }>
      const record: Record<string, WorkshopTool> = {}
      for (const old of arr) {
        const tool: WorkshopTool = {
          id: old.id,
          definition: old.definition,
          implementation: createEmptyImplementation(),
          enabled: old.enabled,
          category: 'custom',
          createdAt: old.createdAt,
          updatedAt: old.updatedAt,
          lastTestedAt: null,
          testResult: null,
        }
        record[tool.id] = tool
      }
      tools.value = record
      persist()
    } catch {
      // Ignore
    }
  }

  function persist() {
    const arr = Object.values(tools.value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  }

  load()

  // --- Computed ---

  const allTools = computed(() => Object.values(tools.value))

  const enabledTools = computed(() => allTools.value.filter((t) => t.enabled))

  const enabledDefinitions = computed<OllamaToolDefinition[]>(() =>
    enabledTools.value.map((t) => t.definition),
  )

  const toolsByCategory = computed(() => {
    const map: Record<string, WorkshopTool[]> = {}
    for (const t of allTools.value) {
      const cat = t.category || 'custom'
      if (!map[cat]) map[cat] = []
      map[cat].push(t)
    }
    return map
  })

  const selectedTool = computed<WorkshopTool | null>(() => {
    if (!selectedToolId.value) return null
    return tools.value[selectedToolId.value] ?? null
  })

  // --- Actions ---

  function addTool(partial: Partial<WorkshopTool> & { definition: OllamaToolDefinition }): string {
    const id = nanoid()
    const now = Date.now()
    const tool: WorkshopTool = {
      id,
      definition: partial.definition,
      implementation: partial.implementation ?? createEmptyImplementation(),
      enabled: partial.enabled ?? false,
      category: partial.category ?? 'custom',
      createdAt: now,
      updatedAt: now,
      lastTestedAt: null,
      testResult: null,
    }
    tools.value[id] = tool
    persist()
    return id
  }

  function updateTool(id: string, patch: Partial<WorkshopTool>) {
    const existing = tools.value[id]
    if (!existing) return
    tools.value[id] = { ...existing, ...patch, updatedAt: Date.now() }
    persist()
  }

  function removeTool(id: string) {
    delete tools.value[id]
    if (selectedToolId.value === id) selectedToolId.value = null
    persist()
  }

  function clearAll() {
    tools.value = {}
    selectedToolId.value = null
    persist()
  }

  function duplicateTool(id: string): string | null {
    const source = tools.value[id]
    if (!source) return null
    const newDef = JSON.parse(JSON.stringify(source.definition)) as OllamaToolDefinition
    newDef.function.name = `${newDef.function.name}_copy`
    return addTool({
      definition: newDef,
      implementation: JSON.parse(JSON.stringify(source.implementation)),
      category: source.category,
    })
  }

  function toggleEnabled(id: string) {
    const existing = tools.value[id]
    if (!existing) return
    tools.value[id] = { ...existing, enabled: !existing.enabled }
    persist()
  }

  function disableAll() {
    for (const id of Object.keys(tools.value)) {
      tools.value[id] = { ...tools.value[id]!, enabled: false }
    }
    persist()
  }

  function selectTool(id: string | null) {
    selectedToolId.value = id
  }

  function getById(id: string): WorkshopTool | undefined {
    return tools.value[id]
  }

  function findByFunctionName(name: string): WorkshopTool | undefined {
    return allTools.value.find((t) => t.definition.function.name === name)
  }

  return {
    tools,
    selectedToolId,
    allTools,
    enabledTools,
    enabledDefinitions,
    toolsByCategory,
    selectedTool,
    addTool,
    updateTool,
    removeTool,
    clearAll,
    duplicateTool,
    toggleEnabled,
    disableAll,
    selectTool,
    getById,
    findByFunctionName,
  }
})
