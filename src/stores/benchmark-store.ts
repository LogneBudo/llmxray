import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type {
  BenchmarkSuite,
  BenchmarkResult,
  BenchmarkRunState,
  BenchmarkConfig,
  BenchmarkQuestion,
} from '@/types/benchmark'
import { benchmarkDB } from '@/services/benchmark-db'
import { runBenchmark } from '@/services/benchmark-runner'
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
        categoryProgress: {},
      }

      completedCount = 0
      correctCount = 0
      totalLatency = 0

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
            runState.value.lastAnswer = {
              modelAnswer: qr.modelAnswer,
              expectedAnswer: qr.expectedAnswer,
              correct: qr.correct,
              latencyMs: qr.latencyMs,
            }
            completedCount++
            if (qr.correct) correctCount++
            totalLatency += qr.latencyMs

            runState.value.liveAccuracy =
              completedCount > 0 ? correctCount / completedCount : 0
            runState.value.liveAvgLatencyMs =
              completedCount > 0 ? totalLatency / completedCount : 0

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
    } else if (activeResultIds.value.length < 4) {
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
    cancelRun,
    deleteResult,
    importCustomSuite,
    deleteCustomSuite,
    toggleActiveResult,
  }
})
