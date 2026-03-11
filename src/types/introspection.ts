export interface LayerInfo {
  index: number
  name: string
  type: 'attention' | 'feed_forward' | 'norm' | 'embedding' | 'output'
  parameterCount: number
}

export interface ModelArchitecture {
  family: string
  blockCount: number
  embeddingLength: number
  attentionHeadCount: number
  kvHeadCount: number
  contextLength: number
  feedForwardLength: number
  layers: LayerInfo[]
  totalParameters: number
  quantization: string
}

export interface AttentionPattern {
  tokenLabels: string[]
  matrix: number[][]
  headIndex: number
  layerIndex: number
}

export interface LayerActivation {
  layerIndex: number
  layerName: string
  meanActivation: number
  maxActivation: number
  norm: number
}
