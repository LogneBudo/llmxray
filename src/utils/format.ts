/**
 * Format milliseconds into a human-readable duration.
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = ((ms % 60_000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

/**
 * Format a number with thousand separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Format tokens per second.
 */
export function formatTps(tps: number): string {
  if (tps < 1) return `${(tps * 1000).toFixed(0)} tok/min`
  return `${tps.toFixed(1)} tok/s`
}

/**
 * Format a parameter count (e.g., 7_000_000_000 → "7B").
 */
export function formatParamCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(0)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return count.toString()
}

/**
 * Format a byte count.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

/**
 * Format a date timestamp to relative time.
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}
