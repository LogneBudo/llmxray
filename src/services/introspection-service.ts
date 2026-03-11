import type { OllamaModelInfo } from '@/types/ollama'
import type { ModelArchitecture, LayerInfo, AttentionPattern, LayerActivation } from '@/types/introspection'

export function parseModelArchitecture(
  _modelName: string,
  info: OllamaModelInfo,
): ModelArchitecture {
  const mi = info.model_info
  const family = info.details.family || 'unknown'

  // Extract architecture params from model_info keys
  // Keys follow the pattern: <family>.<param_name>
  const blockCount = getNumericParam(mi, 'block_count') ?? 32
  const embeddingLength = getNumericParam(mi, 'embedding_length') ?? 4096
  const attentionHeadCount = getNumericParam(mi, 'attention.head_count') ?? 32
  const kvHeadCount = getNumericParam(mi, 'attention.head_count_kv') ?? attentionHeadCount
  const contextLength = getNumericParam(mi, 'context_length') ?? 4096
  const feedForwardLength = getNumericParam(mi, 'feed_forward_length') ?? embeddingLength * 4

  const paramStr = info.details.parameter_size || '0'
  const totalParameters = parseParameterSize(paramStr)

  const layers = generateLayerList(blockCount)

  return {
    family,
    blockCount,
    embeddingLength,
    attentionHeadCount,
    kvHeadCount,
    contextLength,
    feedForwardLength,
    layers,
    totalParameters,
    quantization: info.details.quantization_level || 'unknown',
  }
}

export function generateSyntheticAttention(
  tokens: string[],
  headCount: number,
  layerCount: number,
): AttentionPattern[] {
  const patterns: AttentionPattern[] = []
  const n = tokens.length

  // Generate for first 2 heads of first 2 layers (keep it lightweight)
  const headsToShow = Math.min(headCount, 2)
  const layersToShow = Math.min(layerCount, 2)

  for (let layer = 0; layer < layersToShow; layer++) {
    for (let head = 0; head < headsToShow; head++) {
      const matrix: number[][] = []
      for (let q = 0; q < n; q++) {
        const row: number[] = []
        for (let k = 0; k < n; k++) {
          if (k > q) {
            // Causal mask: future tokens are zero
            row.push(0)
          } else {
            // Distance decay + random noise for visual interest
            const distance = q - k
            const decay = Math.exp(-distance * (0.1 + layer * 0.05))
            const noise = Math.random() * 0.15
            const localAttention = k === q ? 0.3 : 0
            row.push(Math.min(1, decay + noise + localAttention))
          }
        }
        // Normalize row (softmax-like)
        const sum = row.reduce((a, b) => a + b, 0)
        matrix.push(sum > 0 ? row.map((v) => v / sum) : row)
      }

      patterns.push({
        tokenLabels: tokens,
        matrix,
        headIndex: head,
        layerIndex: layer,
      })
    }
  }

  return patterns
}

export function generateSyntheticActivations(arch: ModelArchitecture): LayerActivation[] {
  const activations: LayerActivation[] = []

  for (const layer of arch.layers) {
    // Generate plausible activation statistics
    const baseNorm = Math.sqrt(arch.embeddingLength) * (1 + Math.random() * 0.5)
    const layerFactor = layer.type === 'attention' ? 1.0 : layer.type === 'feed_forward' ? 1.3 : 0.8

    activations.push({
      layerIndex: layer.index,
      layerName: layer.name,
      meanActivation: (0.5 + Math.random() * 0.5) * layerFactor,
      maxActivation: (2 + Math.random() * 3) * layerFactor,
      norm: baseNorm * layerFactor * (0.8 + Math.random() * 0.4),
    })
  }

  return activations
}

function getNumericParam(
  info: Record<string, string | number | null>,
  suffix: string,
): number | undefined {
  for (const [key, value] of Object.entries(info)) {
    if (key.endsWith(suffix) && typeof value === 'number') {
      return value
    }
  }
  return undefined
}

function parseParameterSize(str: string): number {
  const match = str.match(/([\d.]+)\s*([BMK])?/i)
  if (!match) return 0
  const num = parseFloat(match[1]!)
  const unit = (match[2] ?? '').toUpperCase()
  if (unit === 'B') return num * 1_000_000_000
  if (unit === 'M') return num * 1_000_000
  if (unit === 'K') return num * 1_000
  return num
}

function generateLayerList(blockCount: number): LayerInfo[] {
  const layers: LayerInfo[] = []
  let index = 0

  layers.push({
    index: index++,
    name: 'token_embedding',
    type: 'embedding',
    parameterCount: 0,
  })

  for (let b = 0; b < blockCount; b++) {
    layers.push({
      index: index++,
      name: `block_${b}_attention`,
      type: 'attention',
      parameterCount: 0,
    })
    layers.push({
      index: index++,
      name: `block_${b}_ffn`,
      type: 'feed_forward',
      parameterCount: 0,
    })
    layers.push({
      index: index++,
      name: `block_${b}_norm`,
      type: 'norm',
      parameterCount: 0,
    })
  }

  layers.push({
    index: index++,
    name: 'output',
    type: 'output',
    parameterCount: 0,
  })

  return layers
}
