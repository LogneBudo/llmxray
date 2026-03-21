import type { ModelPricing } from '@/data/model-pricing'

export interface ModelUsageSummary {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  sessionCount: number
  estimatedCost: number
  pricing: ModelPricing
}

export interface DailyUsageSummary {
  date: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  sessionCount: number
  estimatedCost: number
}
