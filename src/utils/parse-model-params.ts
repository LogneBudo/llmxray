export function parseModelParameters(raw: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^(\S+)\s+(.+)$/)
    if (match) params[match[1]!] = match[2]!.replace(/^"|"$/g, '')
  }
  return params
}
