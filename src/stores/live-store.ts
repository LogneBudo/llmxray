import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fetchLiveStatus,
  fetchLiveTurns,
  fetchLiveTurnText,
  setLiveKeepText,
  clearLiveTurns,
  retryLiveListen,
  openLiveStream,
} from '@/services/live-client'
import { computeFindings, summariseClients } from '@/services/live-findings'
import type { LiveStatus, LiveTurn, LiveTurnText } from '@/types/live'

const MAX_TURNS = 500

export const useLiveStore = defineStore('live', () => {
  const status = ref<LiveStatus | null>(null)
  const turns = ref<LiveTurn[]>([])
  const selectedId = ref<string | null>(null)
  const selectedText = ref<LiveTurnText | null>(null)
  const paused = ref(false)
  const connected = ref(false)
  /** Turns that arrived while paused, shown as a count until resumed. */
  const pending = ref<LiveTurn[]>([])

  let closeStream: (() => void) | null = null

  const hasTraffic = computed(() => turns.value.length > 0)
  const newestFirst = computed(() => [...turns.value].reverse())
  const selected = computed(() => turns.value.find((t) => t.id === selectedId.value) ?? null)
  const findings = computed(() => computeFindings(turns.value))
  const clients = computed(() => summariseClients(turns.value))
  const sessionMs = computed(() => {
    if (turns.value.length === 0) return 0
    return turns.value[turns.value.length - 1]!.at - turns.value[0]!.at
  })

  /** The address a tool should be pointed at, from the page's own host and the observe port. */
  const address = computed(() => {
    if (!status.value) return ''
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return `http://${host}:${status.value.port}`
  })

  function push(turn: LiveTurn) {
    turns.value.push(turn)
    if (turns.value.length > MAX_TURNS) turns.value.splice(0, turns.value.length - MAX_TURNS)
    if (!selectedId.value) selectedId.value = turn.id
  }

  function replace(turn: LiveTurn) {
    const i = turns.value.findIndex((t) => t.id === turn.id)
    if (i >= 0) turns.value[i] = turn
  }

  async function start(): Promise<void> {
    status.value = await fetchLiveStatus()
    const existing = await fetchLiveTurns(0)
    turns.value = existing.slice(-MAX_TURNS)
    if (!selectedId.value && turns.value.length) selectedId.value = turns.value[turns.value.length - 1]!.id
    closeStream?.()
    closeStream = openLiveStream({
      onTurn: (t) => (paused.value ? pending.value.push(t) : push(t)),
      onUpdate: replace,
      onStatus: (s) => (status.value = { ...status.value, ...s }),
      onOpen: () => (connected.value = true),
      onError: () => (connected.value = false),
    })
  }

  function stop(): void {
    closeStream?.()
    closeStream = null
    connected.value = false
  }

  function togglePause(): void {
    paused.value = !paused.value
    if (!paused.value) {
      for (const t of pending.value) push(t)
      pending.value = []
    }
  }

  async function select(id: string): Promise<void> {
    selectedId.value = id
    selectedText.value = null
    const t = selected.value
    if (t?.textKept) selectedText.value = await fetchLiveTurnText(id)
  }

  async function setKeepText(v: boolean): Promise<void> {
    const s = await setLiveKeepText(v)
    if (s) status.value = { ...status.value, ...s }
  }

  const retrying = ref(false)
  async function retryListen(): Promise<void> {
    retrying.value = true
    try {
      const s = await retryLiveListen()
      if (s) status.value = { ...status.value, ...s }
    } finally {
      retrying.value = false
    }
  }

  async function clear(): Promise<void> {
    await clearLiveTurns()
    turns.value = []
    pending.value = []
    selectedId.value = null
    selectedText.value = null
  }

  /** Previous turn from the same client and model, the one the prefix diff ran against. */
  function previousOf(turn: LiveTurn): LiveTurn | null {
    const i = turns.value.findIndex((t) => t.id === turn.id)
    for (let j = i - 1; j >= 0; j--) {
      const t = turns.value[j]!
      if (t.client.id === turn.client.id && t.model === turn.model) return t
    }
    return null
  }

  return {
    status,
    turns,
    selectedId,
    selected,
    selectedText,
    paused,
    pending,
    connected,
    hasTraffic,
    newestFirst,
    findings,
    clients,
    sessionMs,
    address,
    start,
    stop,
    togglePause,
    select,
    setKeepText,
    retrying,
    retryListen,
    clear,
    previousOf,
  }
})
