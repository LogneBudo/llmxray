import type { LiveStatus, LiveTurn, LiveTurnText } from '@/types/live'

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
    await fetch(`${BASE}/clear`, { method: 'POST' })
  } catch {
    /* nothing to clear */
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
