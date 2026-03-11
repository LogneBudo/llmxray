import { test as base, expect } from '@playwright/test'

const OLLAMA_URL = 'http://localhost:11434'

interface OllamaLiveFixtures {
  /** Name of a model confirmed available on the running Ollama instance */
  availableModel: string
}

/**
 * Extended Playwright test fixture that:
 *  1. Checks Ollama is reachable before each test (skips if not)
 *  2. Discovers a real model to use (prefers small models)
 */
export const test = base.extend<OllamaLiveFixtures>({
  availableModel: async ({}, use, testInfo) => {
    // Check Ollama is running
    let models: Array<{ name: string; size: number }>
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3_000) })
      if (!res.ok) {
        testInfo.skip(true, 'Ollama not reachable')
        return
      }
      const data = (await res.json()) as { models: Array<{ name: string; size: number }> }
      models = data.models ?? []
    } catch {
      testInfo.skip(true, 'Ollama not running at localhost:11434')
      return
    }

    if (models.length === 0) {
      testInfo.skip(true, 'No models loaded in Ollama')
      return
    }

    // Prefer smaller models for speed — sort by size ascending
    models.sort((a, b) => a.size - b.size)

    // Filter out embedding-only models
    const chatModels = models.filter(
      (m) =>
        !m.name.includes('embed') &&
        !m.name.includes('bert') &&
        !m.name.includes('nomic') &&
        !m.name.includes('snowflake') &&
        !m.name.includes('all-minilm'),
    )

    if (chatModels.length === 0) {
      testInfo.skip(true, 'No chat-capable models found (only embedding models loaded)')
      return
    }

    await use(chatModels[0].name)
  },
})

export { expect }
