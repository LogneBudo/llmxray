import data from './baselines.json'

interface BaselineData {
  benchmarks: Record<
    string,
    {
      label: string
      random_baseline: number
      scores: Record<string, number>
    }
  >
}

const baselines = data as BaselineData

/**
 * Get the percentile (0–100) for a given accuracy on a benchmark.
 * Interpolates between known model-size reference points.
 * Returns the raw accuracy as a fallback for unknown benchmarks.
 */
export function getPercentile(benchmarkId: string, accuracy: number): number {
  const bench = baselines.benchmarks[benchmarkId]
  if (!bench) return accuracy * 100

  const entries = Object.values(bench.scores).sort((a, b) => a - b)
  if (entries.length === 0) return accuracy * 100

  // Below the weakest reference → scale 0–10
  if (accuracy <= entries[0]!) return (accuracy / entries[0]!) * 10

  // Above the strongest reference → scale 90–100
  const top = entries[entries.length - 1]!
  if (accuracy >= top) return 90 + ((accuracy - top) / (1 - top)) * 10

  // Interpolate between reference points
  for (let i = 0; i < entries.length - 1; i++) {
    const lo = entries[i]!
    const hi = entries[i + 1]!
    if (accuracy >= lo && accuracy <= hi) {
      const t = (accuracy - lo) / (hi - lo)
      const pctLo = 10 + (i / (entries.length - 1)) * 80
      const pctHi = 10 + ((i + 1) / (entries.length - 1)) * 80
      return pctLo + t * (pctHi - pctLo)
    }
  }

  return accuracy * 100
}

/** Get the human-readable label for a benchmark */
export function getBenchmarkLabel(benchmarkId: string): string {
  return baselines.benchmarks[benchmarkId]?.label ?? benchmarkId
}

/** Get all known benchmark IDs from the baselines data */
export function getBaselineBenchmarkIds(): string[] {
  return Object.keys(baselines.benchmarks)
}
