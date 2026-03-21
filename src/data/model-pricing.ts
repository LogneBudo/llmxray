// Cloud API equivalent pricing for common Ollama models.
// Ollama runs locally at no cost — these estimates show what
// equivalent usage would cost on cloud APIs.
// Last updated: 2026-03-21

export interface ModelPricing {
  family: string
  inputPer1M: number
  outputPer1M: number
  source: string
}

export const MODEL_PRICING: ModelPricing[] = [
  { family: 'llama3.2', inputPer1M: 0.04, outputPer1M: 0.04, source: 'Together AI' },
  { family: 'llama3.1', inputPer1M: 0.05, outputPer1M: 0.08, source: 'Groq' },
  { family: 'llama3', inputPer1M: 0.05, outputPer1M: 0.08, source: 'Groq' },
  { family: 'gemma3', inputPer1M: 0.10, outputPer1M: 0.10, source: 'Google' },
  { family: 'gemma2', inputPer1M: 0.07, outputPer1M: 0.07, source: 'Google' },
  { family: 'gemma', inputPer1M: 0.07, outputPer1M: 0.07, source: 'Google' },
  { family: 'mistral', inputPer1M: 0.25, outputPer1M: 0.25, source: 'Mistral' },
  { family: 'mixtral', inputPer1M: 0.60, outputPer1M: 0.60, source: 'Mistral' },
  { family: 'phi4', inputPer1M: 0.07, outputPer1M: 0.14, source: 'Azure' },
  { family: 'phi3', inputPer1M: 0.07, outputPer1M: 0.14, source: 'Azure' },
  { family: 'qwen2.5', inputPer1M: 0.15, outputPer1M: 0.15, source: 'Alibaba' },
  { family: 'qwen2', inputPer1M: 0.15, outputPer1M: 0.15, source: 'Alibaba' },
  { family: 'deepseek-r1', inputPer1M: 0.55, outputPer1M: 2.19, source: 'DeepSeek' },
  { family: 'deepseek-coder', inputPer1M: 0.14, outputPer1M: 0.28, source: 'DeepSeek' },
  { family: 'codellama', inputPer1M: 0.05, outputPer1M: 0.08, source: 'Estimated' },
  { family: 'qwen2.5-coder', inputPer1M: 0.15, outputPer1M: 0.15, source: 'Estimated' },
  { family: 'command-r', inputPer1M: 0.50, outputPer1M: 1.50, source: 'Cohere' },
  { family: 'starcoder', inputPer1M: 0.10, outputPer1M: 0.10, source: 'Estimated' },
]

const DEFAULT_PRICING: ModelPricing = {
  family: 'unknown',
  inputPer1M: 0.10,
  outputPer1M: 0.10,
  source: 'Estimated',
}

export function findPricing(modelName: string): ModelPricing {
  const name = modelName.toLowerCase().split(':')[0]!
  // Try exact match first
  const exact = MODEL_PRICING.find((p) => name === p.family)
  if (exact) return exact
  // Try prefix match (e.g. "llama3.1" matches "llama3.1-8b-instruct")
  const prefix = MODEL_PRICING.find((p) => name.startsWith(p.family))
  if (prefix) return prefix
  return { ...DEFAULT_PRICING, family: name }
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: ModelPricing,
): number {
  return (promptTokens * pricing.inputPer1M + completionTokens * pricing.outputPer1M) / 1_000_000
}
