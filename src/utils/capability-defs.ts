import type { Component } from 'vue'
import { PenLine, Wrench, Lightbulb, Eye, Compass } from 'lucide-vue-next'

export interface CapabilityDef {
  key: string
  label: string
  desc: string
  color: string
  icon: Component
  unicode: string
}

const CAPABILITY_DEFS: Record<string, CapabilityDef> = {
  completion: {
    key: 'completion',
    label: 'Completion',
    desc: 'Can generate text continuations from a prompt. This is the base capability of all language models — predicting and producing the next tokens in a sequence.',
    color: 'text-text-secondary',
    icon: PenLine,
    unicode: '\u{270F}', // ✏
  },
  tools: {
    key: 'tools',
    label: 'Tool Calling',
    desc: 'Can call external tools and functions during generation',
    color: 'text-accent',
    icon: Wrench,
    unicode: '\u{1F527}', // 🔧
  },
  thinking: {
    key: 'thinking',
    label: 'Reasoning',
    desc: 'Supports chain-of-thought reasoning with <think> blocks',
    color: 'text-warning',
    icon: Lightbulb,
    unicode: '\u{1F4A1}', // 💡
  },
  vision: {
    key: 'vision',
    label: 'Vision',
    desc: 'Can process and understand images alongside text',
    color: 'text-success',
    icon: Eye,
    unicode: '\u{1F441}', // 👁
  },
  embedding: {
    key: 'embedding',
    label: 'Embedding',
    desc: 'Converts text into numerical vectors for similarity search',
    color: 'text-text-muted',
    icon: Compass,
    unicode: '\u{1F4D0}', // 📐
  },
}

/** Look up a single capability definition. Returns undefined for unknown keys. */
export function getCapabilityDef(key: string): CapabilityDef | undefined {
  return CAPABILITY_DEFS[key]
}

/** Resolve an array of capability keys to their full definitions (unknown keys get a neutral fallback). */
export function resolveCapabilities(keys: string[]): CapabilityDef[] {
  return keys.map(
    (k) =>
      CAPABILITY_DEFS[k] ?? {
        key: k,
        label: k,
        desc: '',
        color: 'text-text-secondary',
        icon: PenLine,
        unicode: '',
      },
  )
}

/** Build a unicode icon string from an array of capability keys (for use inside <option> text). */
export function capabilityUnicodeIcons(keys: string[]): string {
  return keys
    .map((k) => CAPABILITY_DEFS[k]?.unicode)
    .filter(Boolean)
    .join('')
}
