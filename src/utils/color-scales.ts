/**
 * Map a 0..1 confidence value to a color on a green-yellow-red gradient.
 * High confidence = green, low confidence = red.
 */
export function confidenceToColor(confidence: number): string {
  const c = Math.max(0, Math.min(1, confidence))

  if (c >= 0.7) {
    // Green zone: interpolate from yellow-green to green
    const t = (c - 0.7) / 0.3
    const r = Math.round(74 * (1 - t))
    return `rgb(${r}, 222, 128)`
  } else if (c >= 0.4) {
    // Yellow zone
    const t = (c - 0.4) / 0.3
    const g = Math.round(163 + 59 * t)
    return `rgb(${Math.round(251 - 177 * t)}, ${g}, ${Math.round(36 + 92 * t)})`
  } else {
    // Red zone
    const t = c / 0.4
    const g = Math.round(113 * t)
    return `rgb(248, ${g}, ${Math.round(113 * t)})`
  }
}

/**
 * Map a latency value to a color. Lower latency = green, higher = red.
 */
export function latencyToColor(latencyMs: number, medianMs: number): string {
  if (medianMs <= 0) return confidenceToColor(0.5)
  const ratio = latencyMs / medianMs
  const confidence = Math.max(0, Math.min(1, 1 - (ratio - 0.5) / 2))
  return confidenceToColor(confidence)
}

/**
 * Get a CSS opacity for a confidence value (for subtle background use).
 */
export function confidenceToOpacity(confidence: number): number {
  return 0.15 + confidence * 0.35
}

/**
 * Section type to color mapping for prompt anatomy.
 */
export const sectionColors: Record<string, string> = {
  system: '#818cf8',
  user: '#a855f7',
  context: '#a78bfa',
  tools: '#fb923c',
  memory: '#4ade80',
  examples: '#fbbf24',
  instructions: '#f472b6',
  unknown: '#94a3b8',
}

/**
 * Agent node type to color mapping.
 */
export const nodeTypeColors: Record<string, string> = {
  start: '#4ade80',
  llm_call: '#a855f7',
  tool_call: '#fb923c',
  decision: '#a78bfa',
  output: '#4ade80',
  error: '#f87171',
}
