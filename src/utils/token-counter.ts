/**
 * Approximate token count for a string.
 * Uses a heuristic of ~1.3 tokens per word for English text.
 * This is a rough estimate — Ollama provides real counts after generation.
 */
export function approximateTokenCount(text: string): number {
  if (!text) return 0
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(words * 1.3)
}
