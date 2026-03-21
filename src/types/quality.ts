export type QualityStatus = 'pass' | 'warn' | 'fail'

export interface QualityCheckResult {
  detector: string
  status: QualityStatus
  reason: string
  detail?: string
}

export interface QualityReport {
  messageId: string
  sessionId: string
  overall: QualityStatus
  checks: QualityCheckResult[]
  analyzedAt: number
}
