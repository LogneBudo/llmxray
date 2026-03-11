import { nanoid } from 'nanoid'
import type { StreamToken } from '@/types/token'
import type { ReasoningStep, ReasoningStepType } from '@/types/reasoning'

interface ActiveStep {
  type: ReasoningStepType
  content: string
  startTokenIndex: number
  startTimestamp: number
}

export class ReasoningParser {
  private sessionId: string
  private stepIndex = 0
  private activeStep: ActiveStep | null = null
  private inThinkBlock = false
  private completedSteps: ReasoningStep[] = []
  private lastProcessedLineIndex = -1

  get isThinking(): boolean {
    return this.inThinkBlock
  }

  get thinkingContent(): string {
    return this.inThinkBlock && this.activeStep ? this.activeStep.content : ''
  }

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  processToken(token: StreamToken, fullText: string): ReasoningStep | null {
    // Detect <think> block opening — check if fullText contains the tag,
    // not just endsWith (tokens may arrive in pieces)
    if (!this.inThinkBlock && fullText.includes('<think>')) {
      this.inThinkBlock = true
      // Strip everything up to and including <think> from what we'll accumulate
      const afterTag = fullText.split('<think>').pop() ?? ''
      this.activeStep = {
        type: 'thought',
        content: afterTag,
        startTokenIndex: token.index,
        startTimestamp: token.timestamp,
      }
      return null
    }

    // Detect </think> block closing
    if (this.inThinkBlock && fullText.includes('</think>')) {
      this.inThinkBlock = false
      if (this.activeStep) {
        // Extract content between <think> and </think>
        const thinkMatch = fullText.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          this.activeStep.content = thinkMatch[1]?.trim() ?? this.activeStep.content.trim()
        } else {
          this.activeStep.content = this.activeStep.content.replace(/<\/think>[\s\S]*$/, '').trim()
        }

        // Create a single reasoning step for the entire think block
        if (this.activeStep.content) {
          const step = this.finalizeStep(token)
          return step
        }
        this.activeStep = null
      }
      return null
    }

    // Inside a think block, just accumulate — DON'T create sub-steps
    if (this.inThinkBlock && this.activeStep) {
      this.activeStep.content += token.text
      return null
    }

    // Outside think blocks, detect pattern-based reasoning markers
    // But only process each complete line ONCE
    const lines = fullText.split('\n')
    if (lines.length < 2) return null

    const currentLineIndex = lines.length - 2
    if (currentLineIndex <= this.lastProcessedLineIndex) return null

    this.lastProcessedLineIndex = currentLineIndex
    const lastLine = lines[currentLineIndex]?.trim() ?? ''
    if (!lastLine) return null

    const detected = detectStepType(lastLine)
    if (detected) {
      // Finalize any previous step
      let previousStep: ReasoningStep | null = null
      if (this.activeStep) {
        previousStep = this.finalizeStep(token)
      }

      this.activeStep = {
        type: detected.type,
        content: detected.content,
        startTokenIndex: token.index,
        startTimestamp: token.timestamp,
      }

      return previousStep
    }

    // Accumulate into active step if present
    if (this.activeStep) {
      this.activeStep.content += token.text
    }

    return null
  }

  finalize(): ReasoningStep | null {
    if (this.activeStep) {
      const step: ReasoningStep = {
        id: nanoid(),
        index: this.stepIndex++,
        type: this.activeStep.type,
        content: this.activeStep.content.trim(),
        startTokenIndex: this.activeStep.startTokenIndex,
        endTokenIndex: this.activeStep.startTokenIndex,
        timestamp: this.activeStep.startTimestamp,
        durationMs: Date.now() - this.activeStep.startTimestamp,
      }
      this.activeStep = null
      if (step.content) {
        this.completedSteps.push(step)
        return step
      }
    }
    return null
  }

  private finalizeStep(currentToken: StreamToken): ReasoningStep {
    const step: ReasoningStep = {
      id: nanoid(),
      index: this.stepIndex++,
      type: this.activeStep!.type,
      content: this.activeStep!.content.trim(),
      startTokenIndex: this.activeStep!.startTokenIndex,
      endTokenIndex: currentToken.index,
      timestamp: this.activeStep!.startTimestamp,
      durationMs: currentToken.timestamp - this.activeStep!.startTimestamp,
    }
    this.completedSteps.push(step)
    this.activeStep = null
    return step
  }
}

interface DetectedStep {
  type: ReasoningStepType
  content: string
}

// Only match explicit reasoning prefixes — NOT bare numbered lists
const STEP_PATTERNS: Array<{ regex: RegExp; type: ReasoningStepType }> = [
  { regex: /^(?:Step\s+\d+[:.]\s*)(.+)/i, type: 'thought' },
  { regex: /^(?:Thought[:.]\s*)(.+)/i, type: 'thought' },
  { regex: /^(?:Observation[:.]\s*)(.+)/i, type: 'observation' },
  { regex: /^(?:Action[:.]\s*)(.+)/i, type: 'action' },
  { regex: /^(?:Conclusion[:.]\s*)(.+)/i, type: 'conclusion' },
  { regex: /^(?:Therefore[,:.]\s*)(.+)/i, type: 'conclusion' },
]

function detectStepType(line: string): DetectedStep | null {
  const trimmed = line.trim()
  for (const { regex, type } of STEP_PATTERNS) {
    const match = trimmed.match(regex)
    if (match) {
      return { type, content: match[1] ?? trimmed }
    }
  }
  return null
}
