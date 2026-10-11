/**
 * What gets embedded: plain text, or text and/or an image for a model that
 * reports both `embedding` and `vision` (Ollama 0.40, `/api/embed` object
 * input). `image` is base64 without a data-URL prefix, as the daemon wants it.
 */
export interface EmbeddingInput {
  text?: string
  image?: string
}

export interface EmbeddingResult {
  id: string
  model: string
  /** The text that was embedded; empty when the input was an image alone. */
  input: string
  /** Base64 of the image that was embedded alongside `input`, when there was one. */
  image?: string
  vector: number[]
  dimensions: number
  timestamp: number
  durationMs: number
  /**
   * Tokens the daemon evaluated for this input (`prompt_eval_count`). An
   * image costs a fixed block of them — measured ~258 on embeddinggemma-2 —
   * which is why it is worth showing. Undefined when the daemon omits it.
   */
  promptTokens?: number
}

export interface SimilarityResult {
  score: number
  a: EmbeddingResult
  b: EmbeddingResult
}
