import { nanoid } from 'nanoid'
import type { OpenAIChatChunk } from '@/types/ollama'
import type {
  BenchmarkQuestion,
  BenchmarkSuite,
  BenchmarkResult,
  QuestionResult,
  CategoryResult,
} from '@/types/benchmark'
import { ollamaClient } from './ollama-client'
import { readSSEStream } from './stream-handler'

export interface BenchmarkCallbacks {
  onQuestionStart(index: number, question: BenchmarkQuestion): void
  onToken(token: string, cumulative: string, thinkingCumulative: string): void
  onQuestionComplete(result: QuestionResult): void
  onComplete(result: BenchmarkResult): void
  onError(error: Error): void
}

function buildPrompt(q: BenchmarkQuestion): string {
  return [
    'Answer the following multiple-choice question. Reply with ONLY the letter of the correct answer (A, B, C, or D).',
    '',
    `Question: ${q.question}`,
    '',
    ...q.choices,
    '',
    'Answer:',
  ].join('\n')
}

const ANSWER_PATTERNS = [
  /^\s*([A-D])\b/,
  /\banswer\s*(?:is\s*)?([A-D])\b/i,
  /\b([A-D])\)/,
  /\b([A-D])\b/,
]

/** Strip <think>...</think> blocks from the response (DeepSeek R1 legacy format). */
function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function extractAnswer(response: string): string {
  // First try with thinking blocks stripped
  const cleaned = stripThinkingBlocks(response)
  const textToSearch = cleaned || response

  for (const pattern of ANSWER_PATTERNS) {
    const match = textToSearch.match(pattern)
    if (match?.[1]) return match[1]
  }
  return 'UNPARSED'
}

async function runQuestion(
  modelName: string,
  question: BenchmarkQuestion,
  contextSize: number,
  isThinking: boolean,
  signal: AbortSignal,
  callbacks: BenchmarkCallbacks,
  questionIndex: number,
): Promise<QuestionResult> {
  callbacks.onQuestionStart(questionIndex, question)

  const prompt = buildPrompt(question)
  const startTime = Date.now()
  let firstTokenAt: number | null = null
  let cumulative = ''
  let thinkingCumulative = ''
  const contentLogprobs: number[] = []
  let totalTokens = 0

  // Dynamic token budget: thinking models need 2048+ for reasoning chains,
  // standard models answer MC in 1-5 tokens so 64 is generous.
  const maxTokens = isThinking ? 2048 : 64

  const stream = await ollamaClient.streamChatOpenAI(
    {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0,
      logprobs: true,
      top_logprobs: 1,
      num_ctx: contextSize,
    },
    signal,
  )

  await readSSEStream<OpenAIChatChunk>(
    stream,
    (chunk) => {
      const choice = chunk.choices[0]
      if (!choice) return

      // Capture TTFT on first arriving token (thinking or content)
      if (!firstTokenAt && (choice.delta.reasoning || choice.delta.content)) {
        firstTokenAt = Date.now()
      }

      // Thinking tokens (DeepSeek R1, QwQ — Ollama extension)
      if (choice.delta.reasoning) {
        thinkingCumulative += choice.delta.reasoning
        callbacks.onToken(choice.delta.reasoning, cumulative, thinkingCumulative)
      }

      // Content tokens
      const tokenText = choice.delta.content
      if (tokenText) {
        cumulative += tokenText
        callbacks.onToken(tokenText, cumulative, thinkingCumulative)
      }

      // Collect logprobs — only from content tokens (when content is non-empty).
      // During thinking phase, delta.content is empty but logprobs still arrive
      // for the thinking tokens; we want only the actual answer confidence.
      if (choice.logprobs?.content && tokenText) {
        for (const lp of choice.logprobs.content) {
          contentLogprobs.push(lp.logprob)
        }
      }

      // Track total tokens from usage on the final chunk
      if (chunk.usage) {
        totalTokens = chunk.usage.completion_tokens
      }
    },
    signal,
  )

  const latencyMs = Date.now() - startTime
  const ttftMs = firstTokenAt ? firstTokenAt - startTime : latencyMs

  // If Ollama sent reasoning via <think> blocks in content (older versions)
  // rather than via the delta.reasoning extension, extract it now.
  if (!thinkingCumulative && cumulative) {
    const thinkMatch = cumulative.match(/<think>([\s\S]*?)<\/think>/)
    if (thinkMatch) {
      thinkingCumulative = thinkMatch[1]!.trim()
    }
  }

  // Try extracting from content first. If empty/UNPARSED, fall back to the
  // thinking text — thinking models often state "The answer is B" in their
  // reasoning chain even when the content field ends up empty.
  let modelAnswer = extractAnswer(cumulative)
  if (modelAnswer === 'UNPARSED' && thinkingCumulative) {
    modelAnswer = extractAnswer(thinkingCumulative)
  }
  const correct = modelAnswer === question.correctAnswer

  // Confidence from REAL logprobs: mean(exp(logprob)) across content tokens
  let avgTokenConfidence = 0.5
  if (contentLogprobs.length > 0) {
    const probs = contentLogprobs.map((lp) => Math.exp(lp))
    avgTokenConfidence = probs.reduce((a, b) => a + b, 0) / probs.length
  }

  // Answer-specific logprob: the logprob of the first content token (the A/B/C/D letter)
  const answerLogprob = contentLogprobs.length > 0 ? contentLogprobs[0]! : 0

  // tokens/sec from wall clock (OpenAI endpoint doesn't return eval_duration)
  const tokensPerSecond = latencyMs > 0 && totalTokens > 0 ? (totalTokens / latencyMs) * 1000 : 0

  const result: QuestionResult = {
    questionId: question.id,
    questionText: question.question,
    choices: question.choices,
    category: question.category,
    correct,
    modelAnswer,
    expectedAnswer: question.correctAnswer,
    latencyMs,
    ttftMs,
    avgTokenConfidence,
    answerLogprob,
    tokensPerSecond,
    fullResponse: cumulative,
    thinkingResponse: thinkingCumulative,
    tokenCount: totalTokens,
  }

  callbacks.onQuestionComplete(result)
  return result
}

export function aggregateCategories(results: QuestionResult[]): CategoryResult[] {
  const groups = new Map<string, QuestionResult[]>()
  for (const r of results) {
    const arr = groups.get(r.category) ?? []
    arr.push(r)
    groups.set(r.category, arr)
  }

  return [...groups.entries()].map(([category, items]) => {
    const correctCount = items.filter((r) => r.correct).length
    return {
      category,
      accuracy: items.length > 0 ? correctCount / items.length : 0,
      avgLatencyMs: items.reduce((s, r) => s + r.latencyMs, 0) / items.length,
      avgTtftMs: items.reduce((s, r) => s + (r.ttftMs ?? r.latencyMs), 0) / items.length,
      avgConfidence: items.reduce((s, r) => s + r.avgTokenConfidence, 0) / items.length,
      questionCount: items.length,
      correctCount,
    }
  })
}

export async function runBenchmark(
  modelName: string,
  suites: BenchmarkSuite[],
  contextSize: number,
  isThinking: boolean,
  signal: AbortSignal,
  callbacks: BenchmarkCallbacks,
): Promise<BenchmarkResult> {
  const allQuestions = suites.flatMap((s) => s.questions)
  const benchmarkIds = suites.map((s) => s.id)
  const startedAt = Date.now()
  const questionResults: QuestionResult[] = []

  try {
    for (let i = 0; i < allQuestions.length; i++) {
      if (signal.aborted) break

      const result = await runQuestion(
        modelName,
        allQuestions[i]!,
        contextSize,
        isThinking,
        signal,
        callbacks,
        i,
      )
      questionResults.push(result)
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError(err as Error)
    }
  }

  const correctCount = questionResults.filter((r) => r.correct).length
  const benchmarkResult: BenchmarkResult = {
    id: nanoid(),
    modelName,
    benchmarkIds,
    contextSize,
    startedAt,
    completedAt: Date.now(),
    totalQuestions: allQuestions.length,
    correctCount,
    accuracy: questionResults.length > 0 ? correctCount / questionResults.length : 0,
    categories: aggregateCategories(questionResults),
    questionResults,
  }

  callbacks.onComplete(benchmarkResult)
  return benchmarkResult
}
