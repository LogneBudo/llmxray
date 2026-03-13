import type { BenchmarkSuite } from '@/types/benchmark'
import mmlupro from './mmlu-pro.json'
import arc from './arc.json'
import hellaswag from './hellaswag.json'
import gsm8k from './gsm8k.json'
import truthfulqa from './truthfulqa.json'

export const BUILTIN_SUITES = new Map<string, BenchmarkSuite>([
  ['mmlu_pro', mmlupro as BenchmarkSuite],
  ['arc', arc as BenchmarkSuite],
  ['hellaswag', hellaswag as BenchmarkSuite],
  ['gsm8k', gsm8k as BenchmarkSuite],
  ['truthfulqa', truthfulqa as BenchmarkSuite],
])

export const BUILTIN_SUITE_IDS = [...BUILTIN_SUITES.keys()]
