import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { nanoid } from 'nanoid'
import type {
  BenchmarkSuite,
  BenchmarkResult,
  BenchmarkRunState,
  BenchmarkConfig,
  BenchmarkQuestion,
  QuestionResult,
} from '@/types/benchmark'
import { benchmarkDB } from '@/services/benchmark-db'
import { recordBenchmark } from '@/services/history-writer'
import { runBenchmark, aggregateCategories } from '@/services/benchmark-runner'
import { useModelStore } from '@/stores/model-store'

function createIdleState(): BenchmarkRunState {
  return {
    status: 'idle',
    modelName: '',
    currentQuestionIndex: 0,
    totalQuestions: 0,
    currentQuestion: null,
    currentTokens: '',
    currentThinkingTokens: '',
    lastAnswer: null,
    liveAccuracy: 0,
    liveAvgLatencyMs: 0,
    liveAvgTtftMs: 0,
    categoryProgress: {},
    error: undefined,
  }
}

export const useBenchmarkStore = defineStore('benchmark', () => {
  const runState = ref<BenchmarkRunState>(createIdleState())
  const savedResults = ref<BenchmarkResult[]>([])
  const customSuites = ref<BenchmarkSuite[]>([])
  const activeResultIds = ref<string[]>([])
  const abortController = ref<AbortController | null>(null)
  const latestResult = ref<BenchmarkResult | null>(null)

  const isRunning = computed(() => runState.value.status === 'running')

  const activeResults = computed(() =>
    savedResults.value.filter((r) => activeResultIds.value.includes(r.id)),
  )

  async function loadFromDB() {
    savedResults.value = await benchmarkDB.getAllResults()
    customSuites.value = await benchmarkDB.getAllCustomSuites()
  }

  async function startRun(config: BenchmarkConfig, builtInSuites: Map<string, BenchmarkSuite>) {
    const suites: BenchmarkSuite[] = config.suiteIds
      .map((id) => builtInSuites.get(id) ?? customSuites.value.find((s) => s.id === id))
      .filter((s): s is BenchmarkSuite => s !== undefined)

    if (suites.length === 0) return

    const totalQuestions = suites.reduce((s, suite) => s + suite.questions.length, 0)
    let completedCount = 0
    let correctCount = 0
    let totalLatency = 0
    let totalTtft = 0

    const modelStore = useModelStore()

    for (const modelName of config.modelNames) {
      const ctrl = new AbortController()
      abortController.value = ctrl
      const isThinking = modelStore.isThinkingModel(modelName)

      runState.value = {
        status: 'running',
        modelName,
        currentQuestionIndex: 0,
        totalQuestions,
        currentQuestion: null,
        currentTokens: '',
        currentThinkingTokens: '',
        lastAnswer: null,
        liveAccuracy: 0,
        liveAvgLatencyMs: 0,
        liveAvgTtftMs: 0,
        categoryProgress: {},
      }

      completedCount = 0
      correctCount = 0
      totalLatency = 0
      totalTtft = 0

      try {
        const result = await runBenchmark(modelName, suites, config.contextSize, isThinking, ctrl.signal, {
          onQuestionStart(index: number, question: BenchmarkQuestion) {
            runState.value.currentQuestionIndex = index
            runState.value.currentQuestion = question
            runState.value.currentTokens = ''
            runState.value.currentThinkingTokens = ''
          },
          onToken(_token: string, cumulative: string, thinkingCumulative: string) {
            runState.value.currentTokens = cumulative
            runState.value.currentThinkingTokens = thinkingCumulative
          },
          onQuestionComplete(qr) {
            const ttft = qr.ttftMs ?? qr.latencyMs
            runState.value.lastAnswer = {
              modelAnswer: qr.modelAnswer,
              expectedAnswer: qr.expectedAnswer,
              correct: qr.correct,
              latencyMs: qr.latencyMs,
              ttftMs: ttft,
            }
            completedCount++
            if (qr.correct) correctCount++
            totalLatency += qr.latencyMs
            totalTtft += ttft

            runState.value.liveAccuracy =
              completedCount > 0 ? correctCount / completedCount : 0
            runState.value.liveAvgLatencyMs =
              completedCount > 0 ? totalLatency / completedCount : 0
            runState.value.liveAvgTtftMs =
              completedCount > 0 ? totalTtft / completedCount : 0

            const cat = qr.category
            const progress = runState.value.categoryProgress[cat] ?? { correct: 0, total: 0 }
            progress.total++
            if (qr.correct) progress.correct++
            runState.value.categoryProgress[cat] = progress
          },
          onComplete(benchmarkResult) {
            latestResult.value = benchmarkResult
            savedResults.value.push(benchmarkResult)
            benchmarkDB.saveResult(benchmarkResult)
            recordBenchmark(benchmarkResult)
          },
          onError(error) {
            runState.value.error = error.message
          },
        })

        // If aborted, result still contains partial data — already saved in onComplete
        if (ctrl.signal.aborted) {
          runState.value.status = 'cancelled'
        } else if (result.questionResults.length === totalQuestions) {
          runState.value.status = 'completed'
        }
      } catch {
        runState.value.status = 'error'
      }
    }

    if (runState.value.status === 'running') {
      runState.value.status = 'completed'
    }
    abortController.value = null
  }

  async function resumeRun(resultId: string, builtInSuites: Map<string, BenchmarkSuite>) {
    const existing = savedResults.value.find((r) => r.id === resultId)
    if (!existing) return

    const suites: BenchmarkSuite[] = existing.benchmarkIds
      .map((id) => builtInSuites.get(id) ?? customSuites.value.find((s) => s.id === id))
      .filter((s): s is BenchmarkSuite => s !== undefined)

    const allQuestions = suites.flatMap((s) => s.questions)
    const completedIds = new Set(existing.questionResults.map((qr) => qr.questionId))
    const remaining = allQuestions.filter((q) => !completedIds.has(q.id))

    if (remaining.length === 0) return

    const totalQuestions = allQuestions.length
    const modelStore = useModelStore()
    const isThinking = modelStore.isThinkingModel(existing.modelName)

    let completedCount = existing.questionResults.length
    let correctCount = existing.correctCount
    let totalLatency = existing.questionResults.reduce((s, qr) => s + qr.latencyMs, 0)
    let totalTtft = existing.questionResults.reduce((s, qr) => s + (qr.ttftMs ?? qr.latencyMs), 0)
    const baseCompletedCount = completedCount

    const ctrl = new AbortController()
    abortController.value = ctrl

    runState.value = {
      status: 'running',
      modelName: existing.modelName,
      currentQuestionIndex: completedCount,
      totalQuestions,
      currentQuestion: null,
      currentTokens: '',
      currentThinkingTokens: '',
      lastAnswer: null,
      liveAccuracy: completedCount > 0 ? correctCount / completedCount : 0,
      liveAvgLatencyMs: completedCount > 0 ? totalLatency / completedCount : 0,
      liveAvgTtftMs: completedCount > 0 ? totalTtft / completedCount : 0,
      categoryProgress: {},
    }

    for (const qr of existing.questionResults) {
      const cat = qr.category
      const progress = runState.value.categoryProgress[cat] ?? { correct: 0, total: 0 }
      progress.total++
      if (qr.correct) progress.correct++
      runState.value.categoryProgress[cat] = progress
    }

    const resumeSuite: BenchmarkSuite = {
      id: '_resume',
      name: 'Resume',
      description: '',
      builtIn: false,
      questions: remaining,
    }

    const newQuestionResults: QuestionResult[] = []

    try {
      await runBenchmark(
        existing.modelName,
        [resumeSuite],
        existing.contextSize,
        isThinking,
        ctrl.signal,
        {
          onQuestionStart(index: number, question: BenchmarkQuestion) {
            runState.value.currentQuestionIndex = baseCompletedCount + index
            runState.value.currentQuestion = question
            runState.value.currentTokens = ''
            runState.value.currentThinkingTokens = ''
          },
          onToken(_token: string, cumulative: string, thinkingCumulative: string) {
            runState.value.currentTokens = cumulative
            runState.value.currentThinkingTokens = thinkingCumulative
          },
          onQuestionComplete(qr) {
            const ttft = qr.ttftMs ?? qr.latencyMs
            runState.value.lastAnswer = {
              modelAnswer: qr.modelAnswer,
              expectedAnswer: qr.expectedAnswer,
              correct: qr.correct,
              latencyMs: qr.latencyMs,
              ttftMs: ttft,
            }
            completedCount++
            if (qr.correct) correctCount++
            totalLatency += qr.latencyMs
            totalTtft += ttft

            runState.value.liveAccuracy = correctCount / completedCount
            runState.value.liveAvgLatencyMs = totalLatency / completedCount
            runState.value.liveAvgTtftMs = totalTtft / completedCount

            const cat = qr.category
            const progress = runState.value.categoryProgress[cat] ?? { correct: 0, total: 0 }
            progress.total++
            if (qr.correct) progress.correct++
            runState.value.categoryProgress[cat] = progress

            // Persist incrementally so progress survives HMR/interruptions
            newQuestionResults.push(qr)
            const existingQR = toRaw(existing.questionResults).map((r) => toRaw(r))
            const allQR = [...existingQR, ...newQuestionResults]
            const mergedCorrect = allQR.filter((r) => r.correct).length
            const snapshot: BenchmarkResult = {
              ...toRaw(existing),
              completedAt: Date.now(),
              questionResults: allQR,
              correctCount: mergedCorrect,
              totalQuestions,
              accuracy: allQR.length > 0 ? mergedCorrect / allQR.length : 0,
              categories: aggregateCategories(allQR),
            }
            const idx = savedResults.value.findIndex((r) => r.id === existing.id)
            if (idx >= 0) savedResults.value.splice(idx, 1, snapshot)
            else savedResults.value.push(snapshot)
            latestResult.value = snapshot
            // Deep-clone to strip any remaining reactive proxies before IndexedDB put()
            benchmarkDB.saveResult(JSON.parse(JSON.stringify(snapshot)))
            recordBenchmark(snapshot)
          },
          onComplete() {
            // Already saved incrementally in onQuestionComplete
          },
          onError(error) {
            runState.value.error = error.message
          },
        },
      )

      if (ctrl.signal.aborted) {
        runState.value.status = 'cancelled'
      } else {
        runState.value.status = 'completed'
      }
    } catch {
      runState.value.status = 'error'
    }

    abortController.value = null
  }

  function cancelRun() {
    abortController.value?.abort()
    abortController.value = null
  }

  async function deleteResult(id: string) {
    await benchmarkDB.deleteResult(id)
    savedResults.value = savedResults.value.filter((r) => r.id !== id)
    activeResultIds.value = activeResultIds.value.filter((rid) => rid !== id)
  }

  async function importCustomSuite(jsonStr: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const raw = JSON.parse(jsonStr)
      const suite = structuredClone(raw) as BenchmarkSuite

      // Validate
      if (!suite.name || typeof suite.name !== 'string') {
        return { ok: false, error: 'Missing or invalid suite name' }
      }
      if (!Array.isArray(suite.questions) || suite.questions.length === 0) {
        return { ok: false, error: 'No questions found in suite' }
      }
      if (suite.questions.length > 500) {
        return { ok: false, error: 'Maximum 500 questions per suite' }
      }

      const errors: string[] = []
      const seenIds = new Set<string>()
      const sanitized = suite.questions.map((q, i) => {
        if (!q.id || typeof q.id !== 'string') q.id = `custom_${i + 1}`
        if (seenIds.has(q.id)) {
          q.id = `${q.id}_${i}`
        }
        seenIds.add(q.id)

        if (!q.question || typeof q.question !== 'string') {
          errors.push(`Question ${i + 1}: missing question text`)
        } else if (q.question.length > 2000) {
          q.question = q.question.slice(0, 2000)
        }

        if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) {
          errors.push(`Question ${i + 1}: must have 2-6 choices`)
        } else {
          q.choices = q.choices.map((c) =>
            typeof c === 'string' ? c.replace(/<[^>]*>/g, '').slice(0, 500) : String(c),
          )
        }

        if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
          errors.push(`Question ${i + 1}: missing correctAnswer`)
        }

        if (!q.category || typeof q.category !== 'string') {
          q.category = 'custom'
        }

        // Strip HTML from question text
        q.question = q.question.replace(/<[^>]*>/g, '').trim()

        return q
      })

      if (errors.length > 0) {
        return { ok: false, error: errors.join('; ') }
      }

      suite.questions = sanitized
      suite.id = suite.id || `custom_${nanoid(8)}`
      suite.builtIn = false
      suite.description = suite.description || `Custom suite with ${suite.questions.length} questions`

      await benchmarkDB.saveCustomSuite(suite)
      customSuites.value.push(suite)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof SyntaxError ? 'Invalid JSON format' : String(e) }
    }
  }

  async function deleteCustomSuite(id: string) {
    await benchmarkDB.deleteCustomSuite(id)
    customSuites.value = customSuites.value.filter((s) => s.id !== id)
  }

  function toggleActiveResult(id: string) {
    const idx = activeResultIds.value.indexOf(id)
    if (idx >= 0) {
      activeResultIds.value = activeResultIds.value.filter((r) => r !== id)
    } else {
      activeResultIds.value = [...activeResultIds.value, id]
    }
  }

  return {
    runState,
    savedResults,
    customSuites,
    activeResultIds,
    latestResult,
    isRunning,
    activeResults,
    loadFromDB,
    startRun,
    resumeRun,
    cancelRun,
    deleteResult,
    importCustomSuite,
    deleteCustomSuite,
    toggleActiveResult,
  }
})
