import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { EmbeddingResult, SimilarityResult } from '@/types/embedding'
import { ollamaClient } from '@/services/ollama-client'

export const useEmbeddingStore = defineStore('embeddings', () => {
  const results = ref<EmbeddingResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const recentResults = computed(() =>
    [...results.value].sort((a, b) => b.timestamp - a.timestamp),
  )

  /**
   * @param dimensions Optional Matryoshka truncation width (Ollama `dimensions`).
   *                   Omit for the model's native vector width.
   */
  async function embed(
    model: string,
    input: string,
    dimensions?: number,
  ): Promise<EmbeddingResult> {
    loading.value = true
    error.value = null

    const startTime = Date.now()
    try {
      const response = await ollamaClient.embed({ model, input, dimensions })
      const vector = response.embeddings[0]
      if (!vector) throw new Error('No embedding returned')

      const result: EmbeddingResult = {
        id: nanoid(),
        model,
        input,
        vector,
        dimensions: vector.length,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
      }

      results.value.push(result)
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Embedding failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!
      normA += a[i]! * a[i]!
      normB += b[i]! * b[i]!
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
  }

  function comparePair(a: EmbeddingResult, b: EmbeddingResult): SimilarityResult {
    return {
      score: cosineSimilarity(a.vector, b.vector),
      a,
      b,
    }
  }

  function clearResults() {
    results.value = []
  }

  function removeResult(id: string) {
    results.value = results.value.filter((r) => r.id !== id)
  }

  return {
    results,
    recentResults,
    loading,
    error,
    embed,
    cosineSimilarity,
    comparePair,
    clearResults,
    removeResult,
  }
})
