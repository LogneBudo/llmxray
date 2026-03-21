export interface TurnQualityScore {
  turnIndex: number
  role: 'user' | 'assistant'
  wordCount: number
  sentenceCount: number
  uniqueWordRatio: number
  repetitionRatio: number
  score: number
}

function buildNgrams(words: string[], n: number): string[] {
  const ngrams: string[] = []
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '))
  }
  return ngrams
}

export function scoreTurn(text: string, turnIndex: number, role: 'user' | 'assistant'): TurnQualityScore {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const sentenceCount = sentences.length

  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
  const uniqueWordRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0

  let repetitionRatio = 0
  if (words.length >= 8) {
    const ngrams = buildNgrams(words.map((w) => w.toLowerCase()), 4)
    if (ngrams.length > 0) {
      const freq = new Map<string, number>()
      for (const ng of ngrams) freq.set(ng, (freq.get(ng) ?? 0) + 1)
      let repeated = 0
      for (const count of freq.values()) {
        if (count > 1) repeated += count
      }
      repetitionRatio = repeated / ngrams.length
    }
  }

  // Score: 0-5 scale
  // wordCount component: more words = higher (capped at 50 words for max contribution)
  const wordScore = Math.min(wordCount / 50, 1) * 0.4
  // uniqueness component: higher unique word ratio = better
  const uniquenessScore = uniqueWordRatio * 0.3
  // non-repetition component: lower repetition = better
  const nonRepScore = (1 - repetitionRatio) * 0.3

  const score = Math.min(5, Math.max(0, (wordScore + uniquenessScore + nonRepScore) * 5))

  return { turnIndex, role, wordCount, sentenceCount, uniqueWordRatio, repetitionRatio, score }
}

export function scoreConversationTurns(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
): TurnQualityScore[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m, i) => scoreTurn(
      m.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
      i,
      m.role as 'user' | 'assistant',
    ))
}
