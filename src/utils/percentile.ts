export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo)
}

export function computePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  }
}

export interface WindowedPercentiles {
  label: string
  p50: number
  p95: number
  p99: number
}

export function windowedPercentiles(
  entries: { timestamp: number; value: number }[],
  windowSize: number = 10,
): WindowedPercentiles[] {
  if (entries.length < windowSize) {
    if (entries.length === 0) return []
    const p = computePercentiles(entries.map((e) => e.value))
    return [{ label: new Date(entries[entries.length - 1]!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...p }]
  }

  const results: WindowedPercentiles[] = []
  const step = Math.max(1, Math.floor(entries.length / 20))

  for (let i = windowSize - 1; i < entries.length; i += step) {
    const window = entries.slice(Math.max(0, i - windowSize + 1), i + 1)
    const p = computePercentiles(window.map((e) => e.value))
    results.push({
      label: new Date(entries[i]!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...p,
    })
  }

  return results
}
