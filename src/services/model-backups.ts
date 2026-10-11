import type { OllamaModel, OllamaShowManifestsResponse } from '@/types/ollama'

/**
 * A copy of a model that Ollama 0.40.2 kept on disk after upgrading it in the
 * background. The upgraded copy runs on `llamacpp`; the original stays behind
 * as a `ggml` manifest under the same tag so a downgrade remains safe. Ollama's
 * own release notes remove them with `ollama rm <digest>` — this is the same
 * selection, done by the app instead of a shell pipeline.
 */
export interface ModelBackup {
  /** The tag the backup belongs to, e.g. `qwen2.5:7b`. */
  model: string
  /** Digest of the backup manifest — what gets deleted. */
  digest: string
  /** Runner of the backup copy (`ggml`). */
  runner: string
  /** Runner of the copy that stays (`llamacpp` or `mlx`). */
  keptRunner: string
  /** Bytes the backup takes, when the model listing reports a row for it. */
  sizeBytes?: number
}

/** Runners that mark the UPGRADED copy; anything else alongside one of these is the backup. */
const CURRENT_RUNNERS = new Set(['llamacpp', 'mlx'])
/** The pre-0.40 manifest runner, which is what the upgrade leaves behind. */
const BACKUP_RUNNER = 'ggml'

/**
 * Pick out the backup manifests of one model from its `all_manifests` answer.
 * A model is only considered upgraded when a current-runner manifest is
 * present AND a `ggml` one with a digest sits next to it; a plain model, or a
 * list with a single child, yields nothing. Nothing here guesses.
 */
export function findBackups(
  model: string,
  shown: OllamaShowManifestsResponse,
  listingRows: OllamaModel[] = [],
): ModelBackup[] {
  const manifests = shown.manifests ?? []
  const kept = manifests.find((m) => m.runner && CURRENT_RUNNERS.has(m.runner))
  if (!kept?.runner) return []

  return manifests
    .filter((m) => m.runner === BACKUP_RUNNER && typeof m.digest === 'string' && m.digest.length > 0)
    .map((m) => {
      const row = listingRows.find((r) => r.name === model && r.digest === m.digest)
      return {
        model,
        digest: m.digest!,
        runner: BACKUP_RUNNER,
        keptRunner: kept.runner!,
        ...(row ? { sizeBytes: row.size } : {}),
      }
    })
}

/** Total bytes of the backups whose size the listing reported. */
export function backupsKnownSize(backups: ModelBackup[]): number {
  return backups.reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0)
}

/** Short digest for display: the hex after `sha256:`, first 12 characters. */
export function shortDigest(digest: string): string {
  return digest.replace(/^sha256:/, '').slice(0, 12)
}
