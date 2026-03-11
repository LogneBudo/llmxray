import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { OllamaToolDefinition } from '@/types/ollama'

export interface StoredToolDefinition {
  id: string
  definition: OllamaToolDefinition
  enabled: boolean
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'llmxray-tool-definitions'

export const useToolDefinitionStore = defineStore('tool-definitions', () => {
  const definitions = ref<Map<string, StoredToolDefinition>>(new Map())

  // Load from localStorage on init
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr: StoredToolDefinition[] = JSON.parse(raw)
        definitions.value = new Map(arr.map((d) => [d.id, d]))
      }
    } catch {
      // Ignore corrupt data
    }
  }

  function persist() {
    const arr = [...definitions.value.values()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  }

  load()

  const allDefinitions = computed(() => [...definitions.value.values()])

  const enabledDefinitions = computed<OllamaToolDefinition[]>(() =>
    [...definitions.value.values()]
      .filter((d) => d.enabled)
      .map((d) => d.definition),
  )

  function addDefinition(definition: OllamaToolDefinition): string {
    const id = nanoid()
    const now = Date.now()
    definitions.value.set(id, {
      id,
      definition,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    persist()
    return id
  }

  function updateDefinition(id: string, definition: OllamaToolDefinition) {
    const existing = definitions.value.get(id)
    if (!existing) return
    existing.definition = definition
    existing.updatedAt = Date.now()
    persist()
  }

  function removeDefinition(id: string) {
    definitions.value.delete(id)
    persist()
  }

  function toggleEnabled(id: string) {
    const existing = definitions.value.get(id)
    if (!existing) return
    existing.enabled = !existing.enabled
    persist()
  }

  function getById(id: string): StoredToolDefinition | undefined {
    return definitions.value.get(id)
  }

  return {
    definitions,
    allDefinitions,
    enabledDefinitions,
    addDefinition,
    updateDefinition,
    removeDefinition,
    toggleEnabled,
    getById,
  }
})
