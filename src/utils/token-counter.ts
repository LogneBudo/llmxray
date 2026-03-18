/**
 * Approximate token count for a string.
 * Uses language-aware heuristics:
 * - CJK (Chinese, Japanese, Korean): ~1 token per character
 * - Latin/Cyrillic/Arabic/Hebrew: ~1.3 tokens per word
 * This is a rough estimate — Ollama provides real counts after generation.
 */
export function approximateTokenCount(text: string, locale = 'en'): number {
  if (!text) return 0
  if (['zh', 'ja', 'ko'].includes(locale)) {
    // CJK: roughly 1 token per character (no word boundaries)
    return text.replace(/\s/g, '').length || 1
  }
  // Latin, Cyrillic, Arabic, Hebrew: ~1.3 tokens per word
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(words * 1.3)
}
