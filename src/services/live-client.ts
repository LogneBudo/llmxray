import type { LiveExport, LiveExportTest, LiveStatus, LiveTurn, LiveTurnText } from '@/types/live'

const BASE = '/__observe'

export async function fetchLiveStatus(): Promise<LiveStatus | null> {
  try {
    const res = await fetch(`${BASE}/status`)
    if (!res.ok) return null
    return (await res.json()) as LiveStatus
  } catch {
    return null
  }
}

export async function fetchLiveTurns(since = 0): Promise<LiveTurn[]> {
  try {
    const res = await fetch(`${BASE}/turns?since=${since}`)
    if (!res.ok) return []
    const data = (await res.json()) as { turns: LiveTurn[] }
    return data.turns
  } catch {
    return []
  }
}

export async function fetchLiveTurnText(id: string): Promise<LiveTurnText | null> {
  try {
    const res = await fetch(`${BASE}/turns/${id}/text`)
    if (!res.ok) return null
    return (await res.json()) as LiveTurnText
  } catch {
    return null
  }
}

export async function setLiveKeepText(keepText: boolean): Promise<LiveStatus | null> {
  try {
    const res = await fetch(`${BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepText }),
    })
    return res.ok ? ((await res.json()) as LiveStatus) : null
  } catch {
    return null
  }
}

/** Ask the server to open the observe port again. Returns the state either way. */
export async function retryLiveListen(): Promise<LiveStatus | null> {
  try {
    const res = await fetch(`${BASE}/listen`, { method: 'POST' })
    return (await res.json()) as LiveStatus
  } catch {
    return null
  }
}

export async function clearLiveTurns(): Promise<void> {
  try {
    await fetch(`${BASE}/clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  } catch {
    /* nothing to clear */
  }
}

const JSON_POST = { method: 'POST', headers: { 'Content-Type': 'application/json' } } as const

export async function fetchLiveExport(): Promise<LiveExport | null> {
  try {
    const res = await fetch(`${BASE}/export`)
    return res.ok ? ((await res.json()) as LiveExport) : null
  } catch {
    return null
  }
}

/** Saves a change to the export settings; `headers` is sent only when the person typed new ones. */
export async function saveLiveExport(change: Partial<{ address: string; headers: string; includeText: boolean; enabled: boolean }>): Promise<LiveExport | null> {
  try {
    const res = await fetch(`${BASE}/export`, { ...JSON_POST, body: JSON.stringify(change) })
    return res.ok ? ((await res.json()) as LiveExport) : null
  } catch {
    return null
  }
}

export async function testLiveExport(): Promise<LiveExportTest> {
  try {
    const res = await fetch(`${BASE}/export/test`, { ...JSON_POST, body: '{}' })
    return (await res.json()) as LiveExportTest
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unreachable' }
  }
}

export interface LiveStreamHandlers {
  onTurn: (turn: LiveTurn) => void
  onUpdate: (turn: LiveTurn) => void
  onStatus: (status: LiveStatus) => void
  onOpen?: () => void
  onError?: () => void
}

/** Subscribe to turns as they arrive. Returns a function that closes the stream. */
export function openLiveStream(handlers: LiveStreamHandlers): () => void {
  const source = new EventSource(`${BASE}/stream`)
  source.addEventListener('turn', (e) => handlers.onTurn(JSON.parse((e as MessageEvent).data)))
  source.addEventListener('update', (e) => handlers.onUpdate(JSON.parse((e as MessageEvent).data)))
  source.addEventListener('status', (e) => handlers.onStatus(JSON.parse((e as MessageEvent).data)))
  source.onopen = () => handlers.onOpen?.()
  source.onerror = () => handlers.onError?.()
  return () => source.close()
}
