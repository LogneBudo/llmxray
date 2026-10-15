/**
 * The GPU as a map: what sits in video memory right now, model by model, what
 * each one's context costs on top of its weights, what is free, and what else
 * would fit. Pure arithmetic over Ollama's /api/ps and /api/tags and the
 * machine's video memory figure.
 *
 * Ollama reports one footprint per loaded model (weights plus the context's
 * key-value cache plus working buffers). The weights are the file on disk, so
 * the context's share is footprint minus file: an estimate, labelled as one.
 */
import type { OllamaModel, OllamaRunningModel } from '@/types/ollama'

export interface GpuBlock {
  name: string
  /** Bytes of this model in video memory. */
  vramBytes: number
  /** Bytes of this model that spilled to system RAM, 0 when it fits. */
  cpuBytes: number
  /** The weights, from the file on disk; null when the model is not in the pulled list. */
  weightsBytes: number | null
  /** What the context and buffers cost on top of the weights. An estimate. */
  contextBytes: number | null
  contextLength: number | null
  /** Milliseconds until the daemon unloads it; null when unknown; Infinity when kept forever. */
  expiresInMs: number | null
  parameterSize: string | null
  quantization: string | null
}

export type FitVerdict = 'fits-now' | 'fits-alone' | 'too-big'

export interface FitCandidate {
  name: string
  fileBytes: number
  parameterSize: string | null
  quantization: string | null
  verdict: FitVerdict
}

export interface GpuMap {
  vramBytes: number | null
  usedBytes: number
  freeBytes: number | null
  blocks: GpuBlock[]
  candidates: FitCandidate[]
}

const FOREVER_MS = 10 * 365 * 24 * 3600 * 1000
/** Room a model needs beyond its file for a modest context and buffers. */
const HEADROOM = 1.15

function expiresIn(iso: string | undefined, now: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const d = t - now
  return d > FOREVER_MS ? Infinity : Math.max(0, d)
}

export function buildGpuMap(loaded: OllamaRunningModel[], pulled: OllamaModel[], vramBytes: number | null, now = Date.now()): GpuMap {
  const fileOf = new Map(pulled.map((m) => [m.name, m]))
  const blocks: GpuBlock[] = loaded
    .map((m) => {
      const file = fileOf.get(m.name) ?? fileOf.get(m.model ?? '')
      const weights = file?.size ?? null
      const vram = m.size_vram ?? 0
      const total = m.size ?? vram
      return {
        name: m.name,
        vramBytes: vram,
        cpuBytes: Math.max(0, total - vram),
        weightsBytes: weights,
        contextBytes: weights != null ? Math.max(0, total - weights) : null,
        contextLength: m.context_length ?? null,
        expiresInMs: expiresIn(m.expires_at, now),
        parameterSize: m.details?.parameter_size ?? file?.details?.parameter_size ?? null,
        quantization: m.details?.quantization_level ?? file?.details?.quantization_level ?? null,
      }
    })
    .sort((a, b) => b.vramBytes - a.vramBytes)

  const usedBytes = blocks.reduce((n, b) => n + b.vramBytes, 0)
  const freeBytes = vramBytes != null ? Math.max(0, vramBytes - usedBytes) : null
  const loadedNames = new Set(loaded.map((m) => m.name))

  const candidates: FitCandidate[] = pulled
    .filter((m) => !loadedNames.has(m.name))
    .map((m) => {
      const need = m.size * HEADROOM
      let verdict: FitVerdict = 'fits-now'
      if (vramBytes == null) verdict = 'fits-now'
      else if (freeBytes != null && need <= freeBytes) verdict = 'fits-now'
      else if (need <= vramBytes) verdict = 'fits-alone'
      else verdict = 'too-big'
      return { name: m.name, fileBytes: m.size, parameterSize: m.details?.parameter_size ?? null, quantization: m.details?.quantization_level ?? null, verdict }
    })
    .sort((a, b) => b.fileBytes - a.fileBytes)

  return { vramBytes, usedBytes, freeBytes, blocks, candidates }
}
