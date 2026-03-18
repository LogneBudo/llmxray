import type { ComparisonSlot } from '@/types/comparison'

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'Français', ar: 'العربية', zh: '中文',
  ja: '日本語', he: 'עברית', de: 'Deutsch', es: 'Español',
  pt: 'Português', it: 'Italiano', ru: 'Русский', ko: '한국어', hi: 'हिन्दी',
}

/**
 * Generate a human-readable label for a comparison slot.
 * - If the model is unique among all slots, just use the model name.
 * - If duplicated, differentiate by the most distinctive setting.
 */
export function generateSlotLabel(slot: ComparisonSlot, allSlots: ComparisonSlot[]): string {
  const siblings = allSlots.filter((s) => s.model === slot.model)
  const modelPart = siblings.length <= 1 ? slot.model : slot.model

  // Check if this slot has a language tag — use it for differentiation
  if (slot.language) {
    const langName = LANGUAGE_NAMES[slot.language] ?? slot.language.toUpperCase()
    const base = siblings.length <= 1 ? slot.model : slot.model
    return `${base} (${langName})`
  }

  if (siblings.length <= 1) return modelPart

  // Check if temperatures differ
  const temps = new Set(siblings.map((s) => s.options.temperature ?? 0.7))
  if (temps.size === siblings.length) {
    return `${slot.model} @ ${(slot.options.temperature ?? 0.7).toFixed(2)}`
  }

  // Check if system prompts differ
  const systems = new Set(siblings.map((s) => s.system))
  if (systems.size === siblings.length && slot.system) {
    const firstWord = slot.system.split(/\s+/)[0] ?? ''
    const tag = firstWord.length > 12 ? firstWord.slice(0, 12) + '...' : firstWord
    return `${slot.model} (${tag})`
  }

  // Check if seeds differ
  const seeds = new Set(siblings.map((s) => s.options.seed))
  if (seeds.size === siblings.length && slot.options.seed != null) {
    return `${slot.model} seed:${slot.options.seed}`
  }

  // Fallback: number them
  const index = siblings.findIndex((s) => s.slotId === slot.slotId)
  return `${slot.model} #${index + 1}`
}
