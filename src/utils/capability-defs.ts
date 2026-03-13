export interface CapabilityDef {
  key: string
  label: string
  desc: string
  color: string
  svg: string
  unicode: string
}

const CAPABILITY_DEFS: Record<string, CapabilityDef> = {
  completion: {
    key: 'completion',
    label: 'Completion',
    desc: 'Can generate text continuations from a prompt. This is the base capability of all language models — predicting and producing the next tokens in a sequence.',
    color: 'text-text-secondary',
    svg: 'M4 7V4h16v3 M9 20h6 M12 4v16',
    unicode: '\u{270F}', // ✏
  },
  tools: {
    key: 'tools',
    label: 'Tool Calling',
    desc: 'Can call external tools and functions during generation',
    color: 'text-accent',
    svg: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    unicode: '\u{1F527}', // 🔧
  },
  thinking: {
    key: 'thinking',
    label: 'Reasoning',
    desc: 'Supports chain-of-thought reasoning with <think> blocks',
    color: 'text-warning',
    svg: 'M12 2a8 8 0 0 0-6 13.32V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4.68A8 8 0 0 0 12 2zM9 22h6',
    unicode: '\u{1F4A1}', // 💡
  },
  vision: {
    key: 'vision',
    label: 'Vision',
    desc: 'Can process and understand images alongside text',
    color: 'text-success',
    svg: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    unicode: '\u{1F441}', // 👁
  },
  embedding: {
    key: 'embedding',
    label: 'Embedding',
    desc: 'Converts text into numerical vectors for similarity search',
    color: 'text-text-muted',
    svg: 'M2 17l10-10M2 17l10 4 10-14-10-4zM12 7l10 4',
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
        svg: '',
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
