import { nanoid } from 'nanoid'
import type { OllamaChatMessage } from '@/types/ollama'
import type { PromptSection, PromptSectionType, PromptAnatomy } from '@/types/prompt'
import { approximateTokenCount } from '@/utils/token-counter'

export function analyzePrompt(sessionId: string, rawPrompt: string): PromptAnatomy {
  const sections = detectSections(rawPrompt)
  const totalTokenCount = approximateTokenCount(rawPrompt)

  for (const section of sections) {
    section.tokenCount = approximateTokenCount(section.content)
    section.percentage = totalTokenCount > 0 ? (section.tokenCount / totalTokenCount) * 100 : 0
  }

  return {
    sessionId,
    rawPrompt,
    totalTokenCount,
    sections,
  }
}

export function analyzeMessages(
  sessionId: string,
  messages: OllamaChatMessage[],
): PromptAnatomy {
  const sections: PromptSection[] = []
  let offset = 0

  for (const msg of messages) {
    const typeMap: Record<string, PromptSectionType> = {
      system: 'system',
      user: 'user',
      assistant: 'context',
      tool: 'tools',
    }

    const section: PromptSection = {
      id: nanoid(),
      type: typeMap[msg.role] ?? 'unknown',
      label: `${msg.role} message`,
      content: msg.content,
      startOffset: offset,
      endOffset: offset + msg.content.length,
      tokenCount: approximateTokenCount(msg.content),
      percentage: 0,
    }

    sections.push(section)
    offset += msg.content.length + 1
  }

  const totalTokenCount = sections.reduce((sum, s) => sum + s.tokenCount, 0)
  for (const section of sections) {
    section.percentage = totalTokenCount > 0 ? (section.tokenCount / totalTokenCount) * 100 : 0
  }

  const rawPrompt = messages.map((m) => `[${m.role}] ${m.content}`).join('\n\n')

  return {
    sessionId,
    rawPrompt,
    totalTokenCount,
    sections,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      tokenCount: approximateTokenCount(m.content),
    })),
  }
}

function detectSections(text: string): PromptSection[] {
  const sections: PromptSection[] = []
  const patterns: Array<{ regex: RegExp; type: PromptSectionType; label: string }> = [
    { regex: /^#{1,3}\s*system\b/im, type: 'system', label: 'System Instructions' },
    { regex: /^#{1,3}\s*(?:user|query|question)\b/im, type: 'user', label: 'User Query' },
    { regex: /^#{1,3}\s*(?:context|background)\b/im, type: 'context', label: 'Context' },
    { regex: /^#{1,3}\s*(?:tools?|functions?)\b/im, type: 'tools', label: 'Tool Definitions' },
    { regex: /^#{1,3}\s*(?:memory|history|conversation)\b/im, type: 'memory', label: 'Memory / History' },
    { regex: /^#{1,3}\s*(?:examples?|few[- ]shot)\b/im, type: 'examples', label: 'Examples' },
    { regex: /^#{1,3}\s*(?:instructions?|rules?|guidelines?)\b/im, type: 'instructions', label: 'Instructions' },
  ]

  // Try to find labeled sections
  interface SectionMatch { index: number; type: PromptSectionType; label: string }
  const matches: SectionMatch[] = []

  for (const { regex, type, label } of patterns) {
    const match = text.match(regex)
    if (match?.index !== undefined) {
      matches.push({ index: match.index, type, label })
    }
  }

  if (matches.length === 0) {
    // No sections detected — treat entire prompt as user query
    sections.push({
      id: nanoid(),
      type: 'user',
      label: 'Prompt',
      content: text,
      startOffset: 0,
      endOffset: text.length,
      tokenCount: 0,
      percentage: 100,
    })
    return sections
  }

  // Sort by position
  matches.sort((a, b) => a.index - b.index)

  // Extract content between section headers
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!
    const next = matches[i + 1]
    const endOffset = next ? next.index : text.length
    const content = text.slice(current.index, endOffset).trim()

    sections.push({
      id: nanoid(),
      type: current.type,
      label: current.label,
      content,
      startOffset: current.index,
      endOffset,
      tokenCount: 0,
      percentage: 0,
    })
  }

  // If there's content before the first section, add it as unknown
  const firstMatch = matches[0]
  if (firstMatch && firstMatch.index > 0) {
    const prefix = text.slice(0, firstMatch.index).trim()
    if (prefix) {
      sections.unshift({
        id: nanoid(),
        type: 'unknown',
        label: 'Preamble',
        content: prefix,
        startOffset: 0,
        endOffset: firstMatch.index,
        tokenCount: 0,
        percentage: 0,
      })
    }
  }

  return sections
}
