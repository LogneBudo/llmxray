import { describe, it, expect } from 'vitest'
import { retentionCutoff } from './history-db'

describe('retentionCutoff', () => {
  const now = Date.UTC(2026, 9, 16)
  it('keeps everything by default and for "forever"', () => {
    expect(retentionCutoff(null, now)).toBeNull()
    expect(retentionCutoff(undefined, now)).toBeNull()
    expect(retentionCutoff('forever', now)).toBeNull()
    expect(retentionCutoff('nonsense', now)).toBeNull()
  })
  it('cuts at 30, 90 and 365 days', () => {
    const day = 86_400_000
    expect(retentionCutoff('30d', now)).toBe(now - 30 * day)
    expect(retentionCutoff('90d', now)).toBe(now - 90 * day)
    expect(retentionCutoff('1y', now)).toBe(now - 365 * day)
  })
})
