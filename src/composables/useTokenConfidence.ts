import { computed } from 'vue'
import type { Ref } from 'vue'
import { useTokenStore } from '@/stores/token-store'
import { confidenceToColor } from '@/utils/color-scales'

export function useTokenConfidence(sessionId: Ref<string>) {
  const tokenStore = useTokenStore()

  const tokens = computed(() => tokenStore.getTokens(sessionId.value))

  const confidenceRange = computed(() => {
    const t = tokens.value
    if (t.length === 0) return { min: 0, max: 1, median: 0.5 }

    const confidences = t.map((tk) => tk.confidence).sort((a, b) => a - b)
    return {
      min: confidences[0]!,
      max: confidences[confidences.length - 1]!,
      median: confidences[Math.floor(confidences.length / 2)]!,
    }
  })

  function getColor(confidence: number): string {
    return confidenceToColor(confidence)
  }

  function getConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.7) return 'high'
    if (confidence >= 0.4) return 'medium'
    return 'low'
  }

  return {
    tokens,
    confidenceRange,
    getColor,
    getConfidenceLabel,
  }
}
