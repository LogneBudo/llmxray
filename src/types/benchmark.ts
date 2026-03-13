export interface BenchmarkQuestion {
  id: string
  category: string
  subcategory?: string
  question: string
  choices: string[]
  correctAnswer: string
  difficulty?: string
}

export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  builtIn: boolean
  questions: BenchmarkQuestion[]
}

export interface QuestionResult {
  questionId: string
  category: string
  correct: boolean
  modelAnswer: string
  expectedAnswer: string
  latencyMs: number
  avgTokenConfidence: number
  answerLogprob: number
  tokensPerSecond: number
  fullResponse: string
  thinkingResponse: string
  tokenCount: number
}

export interface CategoryResult {
  category: string
  accuracy: number
  avgLatencyMs: number
  avgConfidence: number
  questionCount: number
  correctCount: number
}

export interface BenchmarkResult {
  id: string
  modelName: string
  benchmarkIds: string[]
  contextSize: number
  startedAt: number
  completedAt: number
  totalQuestions: number
  correctCount: number
  accuracy: number
  categories: CategoryResult[]
  questionResults: QuestionResult[]
}

export interface BenchmarkRunState {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error'
  modelName: string
  currentQuestionIndex: number
  totalQuestions: number
  currentQuestion: BenchmarkQuestion | null
  currentTokens: string
  currentThinkingTokens: string
  lastAnswer: { modelAnswer: string; expectedAnswer: string; correct: boolean; latencyMs: number } | null
  liveAccuracy: number
  liveAvgLatencyMs: number
  categoryProgress: Record<string, { correct: number; total: number }>
  error?: string
}

export interface BenchmarkConfig {
  modelNames: string[]
  suiteIds: string[]
  contextSize: number
}
