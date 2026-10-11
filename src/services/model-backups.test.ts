import { findBackups, backupsKnownSize, shortDigest } from './model-backups'
import type { OllamaModel, OllamaShowManifestsResponse } from '@/types/ollama'

function row(name: string, digest: string, size: number, runner?: string): OllamaModel {
  return {
    name, model: name, modified_at: '', size, digest,
    details: { parent_model: '', format: 'gguf', family: 'qwen2', families: ['qwen2'], parameter_size: '7B', quantization_level: 'Q4_K_M', runner },
  }
}

/**
 * The upgraded-model shape Ollama's 0.40.2 release notes select with jq:
 *   select(any(.manifests[]?; .runner == "llamacpp")) | .manifests[] | select(.runner == "ggml") | .digest
 * No daemon in reach had a backup to probe, so this fixture IS the vendor's
 * description, not a live capture — see the Models tab note.
 */
const UPGRADED: OllamaShowManifestsResponse = {
  license: 'Apache',
  manifests: [
    { runner: 'llamacpp', digest: 'sha256:aaaa1111aaaa1111aaaa', selected: true },
    { runner: 'ggml', digest: 'sha256:bbbb2222bbbb2222bbbb' },
  ],
}

/** What a plain, never-upgraded model answers on 0.40.3 (verified live: nimble, qwen2.5:7b). */
const PLAIN: OllamaShowManifestsResponse = { license: '', manifests: [{ runner: 'llamacpp' }] }
const PRE_040: OllamaShowManifestsResponse = { license: '', manifests: [{}] }

describe('model-backups — selecting the copy an upgrade left behind', () => {
  it('names the ggml manifest as the backup when a llamacpp copy sits beside it', () => {
    const backups = findBackups('qwen2.5:7b', UPGRADED)
    expect(backups).toEqual([
      { model: 'qwen2.5:7b', digest: 'sha256:bbbb2222bbbb2222bbbb', runner: 'ggml', keptRunner: 'llamacpp' },
    ])
  })

  it('attaches the size when the listing has a row for that digest, and only then', () => {
    const rows = [
      row('qwen2.5:7b', 'sha256:aaaa1111aaaa1111aaaa', 4_700_000_000, 'llamacpp'),
      row('qwen2.5:7b', 'sha256:bbbb2222bbbb2222bbbb', 4_683_087_332, 'ggml'),
    ]
    const [b] = findBackups('qwen2.5:7b', UPGRADED, rows)
    expect(b!.sizeBytes).toBe(4_683_087_332)
    expect(backupsKnownSize([b!])).toBe(4_683_087_332)

    const [noRow] = findBackups('qwen2.5:7b', UPGRADED, [])
    expect(noRow!.sizeBytes).toBeUndefined()
    expect(backupsKnownSize([noRow!])).toBe(0)
  })

  it('finds nothing for a plain model, a pre-0.40 daemon, or a ggml-only model', () => {
    expect(findBackups('nimble:latest', PLAIN)).toEqual([])
    expect(findBackups('qwen2.5:7b', PRE_040)).toEqual([])
    // ggml alone is a never-upgraded model, not a backup of anything
    expect(findBackups('old:7b', { manifests: [{ runner: 'ggml', digest: 'sha256:cccc' }] })).toEqual([])
  })

  it('ignores a ggml manifest without a digest, since there is nothing to delete', () => {
    expect(findBackups('x', { manifests: [{ runner: 'llamacpp' }, { runner: 'ggml' }] })).toEqual([])
  })

  it('shortens a digest for display', () => {
    expect(shortDigest('sha256:845dbda0ea48ed749caafd9e6037047aa19acfcfd82e704d7ca97d631a0b697e')).toBe('845dbda0ea48')
  })
})
