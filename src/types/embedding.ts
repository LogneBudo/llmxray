export interface EmbeddingResult {
  id: string
  model: string
  input: string
  vector: number[]
  dimensions: number
  timestamp: number
  durationMs: number
}

export interface SimilarityResult {
  score: number
  a: EmbeddingResult
  b: EmbeddingResult
}
