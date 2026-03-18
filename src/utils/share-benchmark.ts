import type { BenchmarkResult } from '@/types/benchmark'
import { downloadJson, downloadCsv, downloadMarkdown } from '@/utils/download'

/**
 * Export the full BenchmarkResult as a JSON file.
 */
export function exportBenchmarkAsJson(result: BenchmarkResult): void {
  const filename = `benchmark-${result.modelName}-${result.id}.json`
  downloadJson(result, filename)
}

/**
 * Export benchmark results as a flat CSV with one row per question.
 */
export function exportBenchmarkAsCsv(result: BenchmarkResult): void {
  const headers = [
    'Category',
    'Question ID',
    'Expected Answer',
    'Model Answer',
    'Correct',
    'Confidence',
    'Latency (ms)',
    'TTFT (ms)',
    'Tokens/sec',
    'Full Response',
  ]

  const rows = result.questionResults.map((qr) => [
    qr.category,
    qr.questionId,
    qr.expectedAnswer,
    qr.modelAnswer,
    qr.correct ? 'Yes' : 'No',
    (qr.avgTokenConfidence * 100).toFixed(1) + '%',
    qr.latencyMs.toFixed(0),
    qr.ttftMs.toFixed(0),
    qr.tokensPerSecond.toFixed(1),
    qr.fullResponse.replace(/\n/g, ' ').slice(0, 500),
  ])

  const filename = `benchmark-${result.modelName}-${result.id}.csv`
  downloadCsv(headers, rows, filename)
}

/**
 * Build the markdown content for a benchmark report (no download).
 */
export function buildBenchmarkMarkdown(result: BenchmarkResult): string {
  const date = new Date(result.startedAt).toLocaleString()
  const suites = result.benchmarkIds.join(', ')
  const accuracy = (result.accuracy * 100).toFixed(1)
  const duration = result.completedAt
    ? `${((result.completedAt - result.startedAt) / 1000).toFixed(0)}s`
    : 'N/A'

  const lines: string[] = []

  // Header
  lines.push(`# Benchmark Report — LLMxRay`)
  lines.push('')
  lines.push(`| Detail | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| **Model** | ${result.modelName} |`)
  lines.push(`| **Suites** | ${suites} |`)
  lines.push(`| **Date** | ${date} |`)
  lines.push(`| **Context Size** | ${result.contextSize} tokens |`)
  lines.push(`| **Duration** | ${duration} |`)
  lines.push(`| **Overall Accuracy** | **${accuracy}%** (${result.correctCount}/${result.totalQuestions}) |`)
  lines.push('')

  // Accuracy visual bar
  const filled = Math.round(parseFloat(accuracy) / 5)
  const empty = 20 - filled
  lines.push(`**Accuracy:** ${'█'.repeat(filled)}${'░'.repeat(empty)} ${accuracy}%`)
  lines.push('')

  // Per-Category Results
  lines.push(`## Per-Category Results`)
  lines.push('')
  lines.push(`| Category | Accuracy | Correct | Avg Latency | Avg TTFT | Avg Confidence |`)
  lines.push(`|----------|----------|---------|-------------|----------|----------------|`)
  for (const c of result.categories) {
    const acc = (c.accuracy * 100).toFixed(1) + '%'
    const correct = `${c.correctCount}/${c.questionCount}`
    const avgLat = c.avgLatencyMs.toFixed(0) + 'ms'
    const avgTtft = c.avgTtftMs.toFixed(0) + 'ms'
    const avgConf = (c.avgConfidence * 100).toFixed(1) + '%'
    lines.push(`| ${c.category} | ${acc} | ${correct} | ${avgLat} | ${avgTtft} | ${avgConf} |`)
  }
  lines.push('')

  // Question-by-Question Details
  lines.push(`## Question-by-Question Details`)
  lines.push('')

  // Group by category for readability
  const byCategory = new Map<string, typeof result.questionResults>()
  for (const qr of result.questionResults) {
    const list = byCategory.get(qr.category) ?? []
    list.push(qr)
    byCategory.set(qr.category, list)
  }

  const LETTERS = 'ABCDEFGHIJ'

  function resolveAnswer(letter: string, choices?: string[]): string {
    if (!choices || !letter) return letter
    const idx = LETTERS.indexOf(letter.trim().toUpperCase())
    if (idx >= 0 && idx < choices.length) {
      // Choices may already include "A) ..." prefix — don't double it
      const choice = choices[idx]!
      if (choice.match(/^[A-Z]\)\s/)) return choice
      return `${letter.trim().toUpperCase()}) ${choice}`
    }
    return letter
  }

  let qNum = 0
  for (const [category, questions] of byCategory) {
    lines.push(`### ${category}`)
    lines.push('')
    lines.push(`| # | Result | Question | Expected | Model | Confidence | Latency |`)
    lines.push(`|---|--------|----------|----------|-------|------------|---------|`)

    for (const qr of questions) {
      qNum++
      const icon = qr.correct ? '✅' : '❌'
      const conf = (qr.avgTokenConfidence * 100).toFixed(0) + '%'
      const lat = qr.latencyMs.toFixed(0) + 'ms'
      const question = qr.questionText ? qr.questionText.slice(0, 80) + (qr.questionText.length > 80 ? '...' : '') : '-'
      const expected = resolveAnswer(qr.expectedAnswer, qr.choices)
      const model = resolveAnswer(qr.modelAnswer, qr.choices)
      lines.push(`| ${qNum} | ${icon} | ${question} | ${expected} | ${model} | ${conf} | ${lat} |`)
    }
    lines.push('')
  }

  // Summary stats
  const correct = result.questionResults.filter(q => q.correct).length
  const wrong = result.questionResults.filter(q => !q.correct).length
  const highConfWrong = result.questionResults.filter(q => !q.correct && q.avgTokenConfidence > 0.8).length

  lines.push(`## Summary`)
  lines.push('')
  lines.push(`- ✅ **${correct}** correct answers`)
  lines.push(`- ❌ **${wrong}** wrong answers`)
  if (highConfWrong > 0) {
    lines.push(`- ⚠️ **${highConfWrong}** high-confidence wrong answers (>80% confidence but incorrect)`)
  }
  lines.push('')

  lines.push(`---`)
  lines.push(`*Generated by [LLMxRay](https://lognebudo.github.io/llmxray/) — Local LLM Observatory*`)

  return lines.join('\n')
}

/**
 * Export benchmark results as a formatted Markdown report.
 */
export function exportBenchmarkAsMarkdown(result: BenchmarkResult): string {
  const md = buildBenchmarkMarkdown(result)
  const filename = `benchmark-report-${result.modelName}-${result.id}.md`
  downloadMarkdown(md, filename)
  return md
}

/**
 * Build a pre-filled GitHub Discussion URL containing the benchmark report.
 */
/**
 * Copy full benchmark report to clipboard and open GitHub Discussions with title pre-filled.
 * Returns true if clipboard copy succeeded.
 */
export async function shareToDiscussions(result: BenchmarkResult, commentary?: string): Promise<boolean> {
  const fullReport = buildBenchmarkMarkdown(result)
  const body = commentary?.trim() ? `${commentary.trim()}\n\n---\n\n${fullReport}` : fullReport

  // Copy full report to clipboard
  let copied = false
  try {
    await navigator.clipboard.writeText(body)
    copied = true
  } catch {
    // Clipboard failed — user will need to copy manually
  }

  // Open Discussions with title only (body is on clipboard)
  const accuracy = (result.accuracy * 100).toFixed(1)
  const title = `Benchmark: ${result.modelName} — ${accuracy}% on ${result.benchmarkIds.join(', ')}`
  const params = new URLSearchParams({
    category: 'show-and-tell',
    title,
  })
  window.open(`https://github.com/LogneBudo/llmxray/discussions/new?${params.toString()}`, '_blank')

  return copied
}
