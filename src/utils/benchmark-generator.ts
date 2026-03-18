import type { BenchmarkQuestion } from '@/types/benchmark'

export interface GenerateOptions {
  topic: string
  count: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  model: string
  category?: string
}

export function buildGenerationPrompt(options: GenerateOptions): string {
  const difficultyInstruction =
    options.difficulty === 'mixed'
      ? 'Use a mix of easy, medium, and hard questions.'
      : `All questions should be ${options.difficulty} difficulty.`

  const category = options.category || options.topic.toLowerCase().replace(/\s+/g, '_')

  return `Generate exactly ${options.count} multiple-choice questions about "${options.topic}".

${difficultyInstruction}

Each question must have exactly 4 choices labeled A, B, C, D.
One choice must be the correct answer.

Return ONLY a JSON array with no other text. Each element must have this exact structure:

[
  {
    "question": "What is the capital of France?",
    "choices": ["A. Berlin", "B. Madrid", "C. Paris", "D. Rome"],
    "correctAnswer": "C",
    "category": "${category}",
    "difficulty": "easy"
  }
]

Rules:
- "correctAnswer" must be one of "A", "B", "C", or "D"
- Each choice must start with its letter and a period (e.g., "A. ...")
- Questions should be factually accurate
- Return ONLY the JSON array, no explanations, no markdown fences`
}

export function parseGeneratedQuestions(
  response: string,
  category: string,
): {
  questions: BenchmarkQuestion[]
  errors: string[]
} {
  const questions: BenchmarkQuestion[] = []
  const errors: string[] = []

  // Strip <think> blocks
  let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  // Find JSON array (first [ to last ])
  const startIdx = cleaned.indexOf('[')
  const endIdx = cleaned.lastIndexOf(']')

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    errors.push('No JSON array found in response')
    return { questions, errors }
  }

  const jsonStr = cleaned.slice(startIdx, endIdx + 1)

  let parsed: unknown[]
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    errors.push(`JSON parse error: ${(e as Error).message}`)
    return { questions, errors }
  }

  if (!Array.isArray(parsed)) {
    errors.push('Parsed result is not an array')
    return { questions, errors }
  }

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>

    // Validate required fields
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${i + 1}: not an object`)
      continue
    }

    if (typeof item.question !== 'string' || !item.question.trim()) {
      errors.push(`Item ${i + 1}: missing or empty question`)
      continue
    }

    if (!Array.isArray(item.choices) || item.choices.length < 2 || item.choices.length > 6) {
      errors.push(`Item ${i + 1}: choices must be an array of 2-6 items`)
      continue
    }

    const validAnswers = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, item.choices.length)
    const answer = String(item.correctAnswer ?? '').trim().toUpperCase()

    if (!validAnswers.includes(answer)) {
      errors.push(`Item ${i + 1}: correctAnswer "${item.correctAnswer}" is not valid`)
      continue
    }

    questions.push({
      id: `gen_${i}`,
      question: String(item.question).trim(),
      choices: (item.choices as unknown[]).map((c) => String(c)),
      correctAnswer: answer,
      category: typeof item.category === 'string' ? item.category : category,
      difficulty: typeof item.difficulty === 'string' ? item.difficulty : undefined,
    })
  }

  return { questions, errors }
}
