<script setup lang="ts">
/**
 * The request a client sent, rendered as what it is (a conversation, a tool
 * list, a few options) instead of a wall of escaped JSON. Every byte stays
 * reachable through the Raw tab, Copy and Download. The cache-break position
 * the proxy computed is drawn inside the actual text.
 */
import { computed, ref, watch } from 'vue'
import { Copy, Check, Download, Search, ChevronDown, ChevronRight, AlertTriangle } from '@lucide/vue'
import { formatNumber } from '@/utils/format'

const props = defineProps<{
  request: unknown
  protocol: string
  /** Character offset in the canonical prompt where this turn stopped matching the previous one. */
  breakChar: number | null
  promptTokens: number | null
}>()

type Msg = { role: string; content: unknown; tool_calls?: unknown[]; [k: string]: unknown }
type Tool = { type?: string; function?: { name?: string; description?: string; parameters?: { properties?: Record<string, unknown> } }; name?: string }

const tab = ref<'rendered' | 'raw'>('rendered')
const query = ref('')
const copied = ref(false)

const req = computed(() => (props.request && typeof props.request === 'object' ? (props.request as Record<string, unknown>) : {}))
const messages = computed<Msg[]>(() => (Array.isArray(req.value.messages) ? (req.value.messages as Msg[]) : []))
const tools = computed<Tool[]>(() => (Array.isArray(req.value.tools) ? (req.value.tools as Tool[]) : []))
const isChat = computed(() => props.protocol === 'ollama-chat' || props.protocol === 'openai-chat')

/** Same rule as the proxy: any content shape to its text. */
function contentText(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === 'string' ? p : ((p as { text?: string; type?: string })?.text ?? ((p as { type?: string })?.type ? `[${(p as { type: string }).type}]` : '')))).join('')
  }
  return JSON.stringify(content)
}

function messageText(m: Msg): string {
  return contentText(m.content) + (m.tool_calls ? JSON.stringify(m.tool_calls) : '')
}

/**
 * The canonical prompt the proxy diffed, rebuilt here with the same rules so a
 * break offset maps back to a message and a position inside it.
 */
interface Part { kind: 'message' | 'tools' | 'system' | 'prompt' | 'input'; index: number; start: number; end: number; tag: string; text: string }
const parts = computed<Part[]>(() => {
  const out: Part[] = []
  const push = (kind: Part['kind'], index: number, tag: string, text: string) => {
    const start = out.length ? out[out.length - 1]!.end + 1 : 0
    out.push({ kind, index, start, end: start + tag.length + text.length, tag, text })
  }
  if (isChat.value) {
    const sysCount = messages.value.filter((m) => m.role === 'system' || m.role === 'developer').length
    messages.value.forEach((m, i) => {
      if (i === sysCount && tools.value.length) push('tools', -1, '<tools>', JSON.stringify(tools.value))
      push('message', i, `<${m.role ?? ''}>`, messageText(m))
    })
    if (messages.value.length <= sysCount && tools.value.length) push('tools', -1, '<tools>', JSON.stringify(tools.value))
  } else if (props.protocol === 'ollama-generate' || props.protocol === 'openai-completions') {
    const system = contentText(req.value.system)
    if (system) push('system', -1, '<system>', system)
    push('prompt', -1, '<prompt>', contentText(req.value.prompt))
  } else {
    const input = req.value.input ?? req.value.prompt
    const items = Array.isArray(input) ? input : [input]
    push('input', -1, '<input>', items.map((it) => (typeof it === 'string' ? it : contentText((it as { text?: unknown })?.text ?? it))).join('\n'))
  }
  return out
})

const totalChars = computed(() => parts.value.reduce((n, p) => n + p.text.length, 0))
function tokensFor(chars: number): number | null {
  if (props.promptTokens == null || totalChars.value === 0) return null
  return Math.round((chars / totalChars.value) * props.promptTokens)
}

/** Which part the cache break falls in, and the offset inside that part's text. */
const breakAt = computed(() => {
  if (props.breakChar == null) return null
  const p = parts.value.find((x) => props.breakChar! >= x.start && props.breakChar! <= x.end)
  if (!p) return null
  return { part: p, offset: Math.max(0, Math.min(p.text.length, props.breakChar - p.start - p.tag.length)) }
})

/** Options: everything at the top level that is not the prompt itself. */
const PROMPT_KEYS = new Set(['messages', 'tools', 'prompt', 'system', 'input'])
const header = computed(() =>
  Object.entries(req.value)
    .filter(([k]) => !PROMPT_KEYS.has(k))
    .map(([k, v]) => ({ key: k, value: typeof v === 'string' ? v : JSON.stringify(v) })),
)

// ---- expand / collapse -----------------------------------------------------
const LONG = 1500
const PREVIEW = 600
const expanded = ref(new Set<number>())
const expandedTools = ref(new Set<number>())
watch(
  () => props.request,
  () => {
    expanded.value = new Set()
    expandedTools.value = new Set()
    query.value = ''
    tab.value = 'rendered'
  },
)
function isCollapsed(i: number, m: Msg): boolean {
  if (expanded.value.has(i)) return false
  const text = messageText(m)
  return m.role === 'tool' || text.length > LONG
}
function toggle(i: number) {
  const s = new Set(expanded.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expanded.value = s
}
function toggleTool(i: number) {
  const s = new Set(expandedTools.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expandedTools.value = s
}

// ---- search ------------------------------------------------------------------
const needle = computed(() => query.value.trim().toLowerCase())
function countIn(text: string): number {
  if (!needle.value) return 0
  let n = 0
  let i = 0
  const hay = text.toLowerCase()
  while ((i = hay.indexOf(needle.value, i)) !== -1) {
    n++
    i += needle.value.length
  }
  return n
}
const matchCount = computed(() => {
  if (!needle.value) return 0
  let n = 0
  for (const m of messages.value) n += countIn(messageText(m))
  for (const t of tools.value) n += countIn(toolName(t)) + countIn(toolDescription(t))
  for (const p of parts.value) if (p.kind !== 'message' && p.kind !== 'tools') n += countIn(p.text)
  return n
})

/** Text split into spans: search hits, and whether the span sits after the cache break. */
interface Span { text: string; hit: boolean; after: boolean }
function spans(text: string, breakOffset: number | null): Span[] {
  const out: Span[] = []
  const pushRun = (run: string, after: boolean) => {
    if (!run) return
    if (!needle.value) {
      out.push({ text: run, hit: false, after })
      return
    }
    const hay = run.toLowerCase()
    let i = 0
    let j: number
    while ((j = hay.indexOf(needle.value, i)) !== -1) {
      if (j > i) out.push({ text: run.slice(i, j), hit: false, after })
      out.push({ text: run.slice(j, j + needle.value.length), hit: true, after })
      i = j + needle.value.length
    }
    if (i < run.length) out.push({ text: run.slice(i), hit: false, after })
  }
  if (breakOffset == null) pushRun(text, false)
  else {
    pushRun(text.slice(0, breakOffset), false)
    pushRun(text.slice(breakOffset), true)
  }
  return out
}

function visibleText(i: number, m: Msg): { text: string; truncated: boolean } {
  const full = contentText(m.content)
  if (!isCollapsed(i, m) || needle.value) return { text: full, truncated: false }
  return { text: full.slice(0, PREVIEW), truncated: full.length > PREVIEW }
}
function breakOffsetFor(i: number): number | null {
  const b = breakAt.value
  if (!b || b.part.kind !== 'message' || b.part.index !== i) return null
  return Math.min(b.offset, contentText(messages.value[i]!.content).length)
}

// ---- tools -------------------------------------------------------------------
function toolName(t: Tool): string {
  return t.function?.name ?? t.name ?? '?'
}
function toolDescription(t: Tool): string {
  return t.function?.description ?? ''
}
function toolParamCount(t: Tool): number {
  return Object.keys(t.function?.parameters?.properties ?? {}).length
}
function toolChars(t: Tool): number {
  return JSON.stringify(t).length
}
const toolsChars = computed(() => (tools.value.length ? JSON.stringify(tools.value).length : 0))
const filteredTools = computed(() =>
  tools.value
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !needle.value || toolName(t).toLowerCase().includes(needle.value) || toolDescription(t).toLowerCase().includes(needle.value)),
)

// ---- raw ---------------------------------------------------------------------
const raw = computed(() => {
  try {
    return JSON.stringify(props.request, null, 2)
  } catch {
    return String(props.request)
  }
})
async function copyRaw() {
  try {
    await navigator.clipboard.writeText(raw.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* clipboard blocked */
  }
}
function downloadRaw() {
  const blob = new Blob([raw.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const model = String(req.value.model ?? 'request').replace(/[^\w.-]+/g, '_')
  a.href = url
  a.download = `llmxray-request-${model}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="text-sm">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex rounded-md border border-border-default">
        <button
          class="px-3 py-1 text-sm"
          :class="tab === 'rendered' ? 'bg-surface-overlay font-semibold text-text-primary' : 'text-text-secondary'"
          @click="tab = 'rendered'"
        >
          {{ $t('live.viewer.rendered') }}
        </button>
        <button
          class="border-s border-border-default px-3 py-1 text-sm"
          :class="tab === 'raw' ? 'bg-surface-overlay font-semibold text-text-primary' : 'text-text-secondary'"
          @click="tab = 'raw'"
        >
          {{ $t('live.viewer.raw') }}
        </button>
      </div>
      <label class="relative flex-1 min-w-[12rem]">
        <Search class="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          v-model="query"
          type="search"
          class="w-full rounded-md border border-border-default bg-surface py-1 pe-3 ps-8 text-sm text-text-primary focus:border-accent focus:outline-none"
          :placeholder="$t('live.viewer.searchPlaceholder')"
        />
      </label>
      <span v-if="needle" class="text-sm text-text-secondary">{{ $t('live.viewer.matches', { n: formatNumber(matchCount) }) }}</span>
      <span class="text-sm text-text-muted">{{ $t('live.viewer.size', { chars: formatNumber(totalChars) }) }}</span>
      <button class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-sm text-text-secondary hover:bg-surface-overlay" @click="copyRaw">
        <component :is="copied ? Check : Copy" :size="14" /> {{ copied ? $t('live.viewer.copied') : $t('live.viewer.copy') }}
      </button>
      <button class="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-sm text-text-secondary hover:bg-surface-overlay" @click="downloadRaw">
        <Download :size="14" /> {{ $t('live.viewer.download') }}
      </button>
    </div>

    <!-- Raw -->
    <pre
      v-if="tab === 'raw'"
      class="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border-default bg-surface p-3 font-mono text-xs leading-relaxed text-text-primary"
      data-testid="raw-json"
    >{{ raw }}</pre>

    <!-- Rendered -->
    <div v-else class="mt-3 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div class="space-y-3 min-w-0">
        <!-- Options -->
        <div v-if="header.length" class="rounded-lg border border-border-default bg-surface p-3">
          <p class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">{{ $t('live.viewer.options') }}</p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-xs">
            <template v-for="h in header" :key="h.key">
              <dt class="text-text-secondary">{{ h.key }}</dt>
              <dd class="truncate text-text-primary" :title="h.value">{{ h.value }}</dd>
            </template>
          </dl>
        </div>

        <!-- Conversation -->
        <template v-if="isChat">
          <p class="text-xs font-medium uppercase tracking-wide text-text-muted">{{ $t('live.viewer.messages', { n: messages.length }) }}</p>
          <article
            v-for="(m, i) in messages"
            :key="i"
            class="rounded-lg border bg-surface p-3"
            :class="breakOffsetFor(i) !== null ? 'border-error/60' : 'border-border-default'"
            :data-testid="`message-${i}`"
          >
            <header class="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                class="rounded px-1.5 py-0.5 text-xs font-semibold"
                :class="{
                  'bg-[#7c3aed]/15 text-[#7c3aed]': m.role === 'system' || m.role === 'developer',
                  'bg-[#16a34a]/15 text-[#16a34a]': m.role === 'user',
                  'bg-[#0891b2]/15 text-[#0891b2]': m.role === 'assistant',
                  'bg-[#2563eb]/15 text-[#2563eb]': m.role === 'tool',
                }"
              >{{ $t(`live.viewer.role.${['system', 'developer', 'user', 'assistant', 'tool'].includes(m.role) ? m.role : 'other'}`, { role: m.role }) }}</span>
              <span class="text-xs text-text-muted">
                {{ $t('live.viewer.chars', { n: formatNumber(messageText(m).length) }) }}
                <template v-if="tokensFor(messageText(m).length) !== null"> · {{ $t('live.viewer.tokensEst', { n: formatNumber(tokensFor(messageText(m).length)!) }) }}</template>
              </span>
              <span v-if="breakOffsetFor(i) !== null" class="inline-flex items-center gap-1 rounded bg-error/15 px-1.5 py-0.5 text-xs font-semibold text-error">
                <AlertTriangle :size="12" /> {{ $t('live.viewer.breakHere') }}
              </span>
              <button
                v-if="messageText(m).length > PREVIEW || m.role === 'tool'"
                class="ms-auto inline-flex items-center gap-1 text-xs text-accent hover:underline"
                @click="toggle(i)"
              >
                <component :is="isCollapsed(i, m) ? ChevronRight : ChevronDown" :size="14" />
                {{ isCollapsed(i, m) ? $t('live.viewer.expand', { chars: formatNumber(contentText(m.content).length) }) : $t('live.viewer.collapse') }}
              </button>
            </header>

            <p class="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-primary">
              <template v-for="(s, k) in spans(visibleText(i, m).text, breakOffsetFor(i))" :key="k">
                <mark v-if="s.hit" class="rounded-sm bg-warning/40 text-text-primary">{{ s.text }}</mark>
                <span v-else-if="s.after" class="bg-error/10 text-text-primary">{{ s.text }}</span>
                <template v-else>{{ s.text }}</template>
              </template>
              <span v-if="visibleText(i, m).truncated" class="text-text-muted">…</span>
            </p>

            <div v-if="Array.isArray(m.tool_calls) && m.tool_calls.length" class="mt-2 space-y-1">
              <p class="text-xs font-medium text-text-secondary">{{ $t('live.viewer.toolCalls') }}</p>
              <div v-for="(tc, j) in m.tool_calls" :key="j" class="rounded border border-[#2563eb]/40 bg-[#2563eb]/5 p-2 font-mono text-xs">
                <span class="font-semibold text-[#2563eb]">{{ (tc as any)?.function?.name ?? 'tool' }}</span>
                <span class="text-text-secondary">({{ JSON.stringify((tc as any)?.function?.arguments ?? {}) }})</span>
              </div>
            </div>
          </article>
        </template>

        <!-- Generate / embed bodies -->
        <template v-else>
          <article v-for="p in parts" :key="p.kind" class="rounded-lg border bg-surface p-3" :class="breakAt?.part === p ? 'border-error/60' : 'border-border-default'">
            <header class="mb-1.5 flex items-center gap-2">
              <span class="rounded bg-surface-overlay px-1.5 py-0.5 text-xs font-semibold text-text-secondary">{{ p.tag.slice(1, -1) }}</span>
              <span class="text-xs text-text-muted">{{ $t('live.viewer.chars', { n: formatNumber(p.text.length) }) }}</span>
              <span v-if="breakAt?.part === p" class="inline-flex items-center gap-1 rounded bg-error/15 px-1.5 py-0.5 text-xs font-semibold text-error">
                <AlertTriangle :size="12" /> {{ $t('live.viewer.breakHere') }}
              </span>
            </header>
            <p class="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-primary">
              <template v-for="(s, k) in spans(p.text, breakAt?.part === p ? breakAt.offset : null)" :key="k">
                <mark v-if="s.hit" class="rounded-sm bg-warning/40">{{ s.text }}</mark>
                <span v-else-if="s.after" class="bg-error/10">{{ s.text }}</span>
                <template v-else>{{ s.text }}</template>
              </template>
            </p>
          </article>
        </template>
      </div>

      <!-- Tools -->
      <div v-if="tools.length" class="min-w-0">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          {{ $t('live.viewer.tools', { n: tools.length }) }}
          · {{ $t('live.viewer.chars', { n: formatNumber(toolsChars) }) }}
          <template v-if="tokensFor(toolsChars) !== null"> · {{ $t('live.viewer.tokensEst', { n: formatNumber(tokensFor(toolsChars)!) }) }}</template>
        </p>
        <p v-if="breakAt?.part.kind === 'tools'" class="mb-2 flex items-center gap-1 rounded bg-error/10 px-2 py-1 text-xs text-error">
          <AlertTriangle :size="12" /> {{ $t('live.viewer.breakInTools') }}
        </p>
        <ul class="max-h-[70vh] space-y-1 overflow-auto pe-1">
          <li v-for="{ t, i } in filteredTools" :key="i" class="rounded border border-border-default bg-surface" :data-testid="`tool-${i}`">
            <button class="flex w-full items-start gap-2 p-2 text-start" @click="toggleTool(i)">
              <component :is="expandedTools.has(i) ? ChevronDown : ChevronRight" :size="14" class="mt-0.5 shrink-0 text-text-muted" />
              <span class="min-w-0 flex-1">
                <span class="font-mono text-xs font-semibold text-text-primary">{{ toolName(t) }}</span>
                <span class="ms-2 text-xs text-text-muted">
                  {{ toolParamCount(t) ? $t('live.viewer.params', { n: toolParamCount(t) }) : $t('live.viewer.noParams') }}
                  · {{ $t('live.viewer.chars', { n: formatNumber(toolChars(t)) }) }}
                </span>
                <span v-if="toolDescription(t)" class="mt-0.5 block text-xs text-text-secondary" :class="expandedTools.has(i) ? '' : 'line-clamp-2'">{{ toolDescription(t) }}</span>
              </span>
            </button>
            <pre v-if="expandedTools.has(i)" class="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t border-border-default p-2 font-mono text-xs text-text-secondary">{{ JSON.stringify(t.function?.parameters ?? t, null, 2) }}</pre>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
