import type { ModelPricing } from '@/data/model-pricing'

export interface ModelUsageSummary {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  sessionCount: number
  /** null when the model has no known rate. */
  estimatedCost: number | null
  pricing: ModelPricing | null
}

export interface DailyUsageSummary {
  date: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  sessionCount: number
  estimatedCost: number
}
