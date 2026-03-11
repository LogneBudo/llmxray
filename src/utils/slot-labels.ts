import type { ComparisonSlot } from '@/types/comparison'

/**
 * Generate a human-readable label for a comparison slot.
 * - If the model is unique among all slots, just use the model name.
 * - If duplicated, differentiate by the most distinctive setting.
 */
export function generateSlotLabel(slot: ComparisonSlot, allSlots: ComparisonSlot[]): string {
  const siblings = allSlots.filter((s) => s.model === slot.model)
  if (siblings.length <= 1) return slot.model

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
