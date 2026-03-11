import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { MemorySettings, UserFact, ConversationSummary } from '@/types/memory'
import { DEFAULT_MEMORY_SETTINGS } from '@/types/memory'

const STORAGE_KEY_SETTINGS = 'llmxray-memory-settings'
const STORAGE_KEY_FACTS = 'llmxray-user-facts'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const useMemoryStore = defineStore('memory', () => {
  // ── Settings ──────────────────────────────────────────────────────
  const settings = ref<MemorySettings>(
    loadFromStorage(STORAGE_KEY_SETTINGS, { ...DEFAULT_MEMORY_SETTINGS }),
  )

  // Persist settings on change
  watch(settings, (val) => saveToStorage(STORAGE_KEY_SETTINGS, val), { deep: true })

  function updateSettings(partial: Partial<MemorySettings>) {
    settings.value = { ...settings.value, ...partial }
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_MEMORY_SETTINGS }
  }

  // ── User Facts (Tier 3) ───────────────────────────────────────────
  const facts = ref<UserFact[]>(loadFromStorage(STORAGE_KEY_FACTS, []))

  // Persist facts on change
  watch(facts, (val) => saveToStorage(STORAGE_KEY_FACTS, val), { deep: true })

  const factCount = computed(() => facts.value.length)

  function addFact(content: string): UserFact {
    const fact: UserFact = {
      id: nanoid(),
      content: content.trim(),
      createdAt: Date.now(),
    }
    facts.value = [...facts.value, fact]
    return fact
  }

  function removeFact(id: string) {
    facts.value = facts.value.filter((f) => f.id !== id)
  }

  function removeFactByContent(search: string): boolean {
    const lower = search.toLowerCase().trim()
    const idx = facts.value.findIndex((f) => f.content.toLowerCase().includes(lower))
    if (idx === -1) return false
    facts.value = [...facts.value.slice(0, idx), ...facts.value.slice(idx + 1)]
    return true
  }

  function clearFacts() {
    facts.value = []
  }

  function getFactsAsSystemPrompt(): string {
    if (facts.value.length === 0) return ''
    const lines = facts.value.map((f) => `- ${f.content}`)
    return `The user has asked you to remember these facts about them:\n${lines.join('\n')}\n\nKeep these in mind when responding.`
  }

  // ── Conversation Summaries (Tier 2) ───────────────────────────────
  const summaries = ref<Map<string, ConversationSummary>>(new Map())

  function setSummary(conversationId: string, summary: string, messageCount: number) {
    summaries.value.set(conversationId, {
      conversationId,
      summary,
      messageCount,
      createdAt: Date.now(),
    })
  }

  function getSummary(conversationId: string): ConversationSummary | undefined {
    return summaries.value.get(conversationId)
  }

  function clearSummary(conversationId: string) {
    summaries.value.delete(conversationId)
  }

  return {
    // Settings
    settings,
    updateSettings,
    resetSettings,
    // Facts
    facts,
    factCount,
    addFact,
    removeFact,
    removeFactByContent,
    clearFacts,
    getFactsAsSystemPrompt,
    // Summaries
    summaries,
    setSummary,
    getSummary,
    clearSummary,
  }
})
