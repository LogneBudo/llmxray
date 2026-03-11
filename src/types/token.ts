export interface StreamToken {
  id: string
  index: number
  text: string
  timestamp: number
  confidence: number
  logprob?: number
  cumulativeText: string
  interTokenLatencyMs: number
}

export interface ConfidenceColorScale {
  min: number
  max: number
  colorStops: Array<{ value: number; color: string }>
}

export type HeatmapMode = 'confidence' | 'latency' | 'position'
