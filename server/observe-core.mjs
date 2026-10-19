/**
 * Pure logic behind the Live page: what a request is, who sent it, what the
 * prompt is made of, what the daemon reported back. No I/O here, so every
 * function is unit-tested against captured shapes.
 */

const NS_TO_MS = 1_000_000

/** Request paths whose traffic is a model turn worth recording. */
const CAPTURED = new Map([
  ['/api/chat', { protocol: 'ollama-chat', kind: 'chat' }],
  ['/api/generate', { protocol: 'ollama-generate', kind: 'completion' }],
  ['/api/embed', { protocol: 'ollama-embed', kind: 'embedding' }],
  ['/api/embeddings', { protocol: 'ollama-embed', kind: 'embedding' }],
  ['/v1/chat/completions', { protocol: 'openai-chat', kind: 'chat' }],
  ['/v1/completions', { protocol: 'openai-completions', kind: 'completion' }],
  ['/v1/embeddings', { protocol: 'openai-embeddings', kind: 'embedding' }],
  // Ollama's Anthropic-compatible endpoint: what Claude Code sends when ANTHROPIC_BASE_URL points here.
  ['/v1/messages', { protocol: 'anthropic-messages', kind: 'chat' }],
])

/** Classify a request path. Returns null for traffic that is passed through unrecorded. */
export function classifyPath(method, path) {
  if (method !== 'POST') return null
  const clean = path.split('?')[0]
  return CAPTURED.get(clean) ?? null
}

/**
 * Who is on the other end, from the User-Agent and the shape of the body.
 * Labels are the names a user would recognise; the raw UA is kept beside them
 * so an unknown client is still identifiable.
 */
const CLIENT_RULES = [
  { id: 'copilot', label: 'VS Code Copilot', test: (ua) => /copilot/i.test(ua) },
  { id: 'vscode', label: 'VS Code', test: (ua) => /vscode|visual studio code/i.test(ua) },
  { id: 'continue', label: 'Continue', test: (ua) => /continue/i.test(ua) },
  { id: 'open-webui', label: 'Open WebUI', test: (ua) => /open-?webui/i.test(ua) },
  { id: 'n8n', label: 'n8n', test: (ua) => /n8n/i.test(ua) },
  { id: 'langchain', label: 'LangChain', test: (ua) => /langchain/i.test(ua) },
  { id: 'ollama-cli', label: 'Ollama CLI', test: (ua) => /^ollama\//i.test(ua) },
  { id: 'ollama-python', label: 'Ollama Python SDK', test: (ua) => /ollama-python/i.test(ua) },
  { id: 'ollama-js', label: 'Ollama JS SDK', test: (ua) => /ollama-js/i.test(ua) },
  { id: 'openai-python', label: 'OpenAI Python SDK', test: (ua) => /^openai\/python|openai-python/i.test(ua) },
  { id: 'openai-node', label: 'OpenAI Node SDK', test: (ua) => /^openai\/(js|node)|openai-node/i.test(ua) },
  { id: 'curl', label: 'curl', test: (ua) => /^curl\//i.test(ua) },
  { id: 'python-requests', label: 'Python requests', test: (ua) => /python-requests/i.test(ua) },
  { id: 'aiohttp', label: 'Python aiohttp', test: (ua) => /aiohttp/i.test(ua) },
  { id: 'node-fetch', label: 'Node (fetch)', test: (ua) => /^node(-fetch)?\b|undici/i.test(ua) },
  { id: 'browser', label: 'Browser', test: (ua) => /mozilla\//i.test(ua) },
]

/**
 * Some clients hide behind a generic SDK user agent. Their prompts do not:
 * VS Code's Copilot Chat (through the Ollama extension, UA `ollama-js`) names
 * itself in the first line of its system prompt and offers a tool set no one
 * else does.
 */
const COPILOT_TOOLS = new Set(['read_powershell', 'stop_powershell', 'list_powershell', 'search_code_subagent', 'session_store_sql'])

function fingerprintClient(body) {
  if (!body || typeof body !== 'object') return null
  const first = Array.isArray(body.messages) ? body.messages[0] : null
  const system = typeof first?.content === 'string' && (first.role === 'system' || first.role === 'developer') ? first.content : ''
  if (/Copilot SDK in VS Code|GitHub Copilot/i.test(system.slice(0, 400))) return { id: 'copilot', label: 'VS Code Copilot' }
  const names = Array.isArray(body.tools) ? body.tools.map((t) => t?.function?.name ?? '') : []
  if (names.some((n) => COPILOT_TOOLS.has(n)) || names.some((n) => n.startsWith('github-mcp-server-'))) {
    return { id: 'copilot', label: 'VS Code Copilot' }
  }
  return null
}

export function identifyClient(headers, body = null) {
  const ua = String(headers['user-agent'] ?? '').trim()
  // A client may name itself with the X-LLMxRay-Client header (or ?client= on the URL,
  // which the proxy turns into this header). That beats any guess from the User-Agent, so
  // two agents on the same SDK stay apart and an agent can find its own turns.
  const tag = String(headers['x-llmxray-client'] ?? '').trim().slice(0, 64)
  if (tag) return { id: `tag:${tag.toLowerCase()}`, label: tag, userAgent: ua }
  const fingerprint = fingerprintClient(body)
  if (fingerprint) return { ...fingerprint, userAgent: ua }
  for (const rule of CLIENT_RULES) {
    if (ua && rule.test(ua)) return { id: rule.id, label: rule.label, userAgent: ua }
  }
  if (!ua) return { id: 'unknown', label: 'Unknown client', userAgent: '' }
  // Unknown UA: use its product token as the label so two unknowns stay distinct.
  const token = ua.split(/[\s/]/)[0] || 'Unknown client'
  return { id: `ua:${token.toLowerCase()}`, label: token, userAgent: ua }
}

/** Anthropic content: a string, or blocks of text / tool_use / tool_result / image. */
function anthropicBlocksText(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return JSON.stringify(content)
  return content
    .map((b) => {
      if (typeof b === 'string') return b
      if (b?.type === 'text') return b.text ?? ''
      if (b?.type === 'tool_use') return `[tool_use ${b.name ?? ''}]${JSON.stringify(b.input ?? {})}`
      if (b?.type === 'tool_result') return `[tool_result]${anthropicBlocksText(b.content)}`
      return b?.type ? `[${b.type}]` : ''
    })
    .join('')
}

/** Stringify any content shape (string, array of parts, null) to its text. */
function contentText(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : p?.text ?? (p?.type ? `[${p.type}]` : '')))
      .join('')
  }
  return JSON.stringify(content)
}

/**
 * What the prompt is made of, in characters, plus a canonical rendering used to
 * find where this turn stopped matching the previous one. Characters, not
 * tokens: the proxy never tokenises, it scales by the daemon's own token count.
 */
export function anatomy(body, protocol) {
  const out = {
    systemChars: 0,
    toolsChars: 0,
    historyChars: 0,
    messageChars: 0,
    totalChars: 0,
    messages: 0,
    toolsOffered: 0,
    toolNames: [],
    canonical: '',
  }
  if (!body || typeof body !== 'object') return out

  const parts = []
  const tools = Array.isArray(body.tools) ? body.tools : []
  out.toolsOffered = tools.length
  out.toolNames = tools.map((t) => t?.function?.name ?? t?.name ?? '').filter(Boolean)

  if (protocol === 'anthropic-messages') {
    // system is top-level (string or blocks); messages carry content blocks; tools are {name, input_schema}.
    const system = contentText(body.system)
    const messages = Array.isArray(body.messages) ? body.messages : []
    out.messages = messages.length + (system ? 1 : 0)
    out.systemChars = system.length
    if (system) parts.push(`<system>${system}`)
    if (tools.length) {
      const toolsText = JSON.stringify(tools)
      out.toolsChars = toolsText.length
      parts.push(`<tools>${toolsText}`)
    }
    const lastUserIdx = (() => {
      for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user') return i
      return -1
    })()
    messages.forEach((m, i) => {
      const role = m?.role ?? ''
      const text = anthropicBlocksText(m?.content)
      parts.push(`<${role}>${text}`)
      if (i === lastUserIdx) out.messageChars += text.length
      else out.historyChars += text.length
    })
  } else if (protocol === 'ollama-chat' || protocol === 'openai-chat') {
    const messages = Array.isArray(body.messages) ? body.messages : []
    out.messages = messages.length
    const lastUserIdx = (() => {
      for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user') return i
      return -1
    })()
    messages.forEach((m, i) => {
      const role = m?.role ?? ''
      const text = contentText(m?.content) + (m?.tool_calls ? JSON.stringify(m.tool_calls) : '')
      const seg = `<${role}>${text}`
      parts.push(seg)
      if (role === 'system' || role === 'developer') out.systemChars += text.length
      else if (i === lastUserIdx) out.messageChars += text.length
      else out.historyChars += text.length
    })
    if (tools.length) {
      const toolsText = JSON.stringify(tools)
      out.toolsChars = toolsText.length
      // Ollama places tool schemas in the template after the system message; mirror that order.
      const sysCount = parts.filter((p) => p.startsWith('<system>') || p.startsWith('<developer>')).length
      parts.splice(sysCount, 0, `<tools>${toolsText}`)
    }
  } else if (protocol === 'ollama-generate' || protocol === 'openai-completions') {
    const system = contentText(body.system)
    const prompt = contentText(body.prompt)
    out.systemChars = system.length
    out.messageChars = prompt.length
    if (system) parts.push(`<system>${system}`)
    parts.push(`<prompt>${prompt}`)
    out.messages = 1
  } else {
    const input = body.input ?? body.prompt
    const items = Array.isArray(input) ? input : [input]
    const texts = items.map((it) => (typeof it === 'string' ? it : contentText(it?.text ?? it)))
    out.messageChars = texts.reduce((n, t) => n + t.length, 0)
    out.messages = items.length
    parts.push(`<input>${texts.join('\n')}`)
  }

  out.canonical = parts.join('\n')
  out.totalChars = out.systemChars + out.toolsChars + out.historyChars + out.messageChars
  return out
}

/** Length of the shared leading run of two strings. */
export function commonPrefixLength(a, b) {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) i++
  return i
}

/**
 * Where this turn's prompt diverged from the previous one sent by the same
 * client to the same model. The KV cache survives only on the shared prefix,
 * so this is the point after which everything is recomputed.
 */
export function prefixBreak(prevCanonical, canonical, promptTokens) {
  if (!prevCanonical || !canonical) return null
  const at = commonPrefixLength(prevCanonical, canonical)
  const total = canonical.length
  if (total === 0) return null
  const share = at / total
  return {
    breakChar: at,
    breakShare: share,
    /** Scaled by the daemon's token count: characters per token is not known, the ratio is. */
    breakTokensEst: promptTokens ? Math.round(share * promptTokens) : null,
    identical: at === total && prevCanonical.length === total,
  }
}

/** A short window of text around the break, for the page when text is kept. */
export function breakSnippet(canonical, at, radius = 80) {
  const start = Math.max(0, at - radius)
  const end = Math.min(canonical.length, at + radius)
  return {
    before: (start > 0 ? '…' : '') + canonical.slice(start, at),
    after: canonical.slice(at, end) + (end < canonical.length ? '…' : ''),
  }
}

/**
 * The model's answer, assembled from a whole response (one body or a stream of pieces): its
 * text, its thinking when the model shows it, and each tool call with its arguments. Kept only
 * when Keep text is on; the turn record itself never holds it.
 */
function newAnswer() {
  return { content: '', thinking: '', toolCalls: [] }
}
function doneAnswer(a) {
  return { content: a.content, thinking: a.thinking || null, toolCalls: a.toolCalls }
}
/** Streamed arguments are JSON text; a fragment that does not parse is kept as text. */
function parseArgs(args) {
  if (typeof args !== 'string') return args ?? null
  if (!args.trim()) return {}
  try {
    return JSON.parse(args)
  } catch {
    return args
  }
}

/** Parse the last `done: true` object of an NDJSON stream (or a single JSON body). */
export function parseOllamaResponse(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  let final = null
  const toolCalls = []
  const answer = newAnswer()
  let generated = 0
  for (const line of lines) {
    let obj
    try {
      obj = JSON.parse(line)
    } catch {
      continue
    }
    const calls = obj?.message?.tool_calls
    if (Array.isArray(calls)) {
      for (const c of calls) {
        toolCalls.push(c?.function?.name ?? 'tool')
        answer.toolCalls.push({ name: c?.function?.name ?? 'tool', arguments: c?.function?.arguments ?? null })
      }
    }
    if (typeof obj?.message?.content === 'string') {
      generated += obj.message.content.length
      answer.content += obj.message.content
    }
    if (typeof obj?.message?.thinking === 'string') answer.thinking += obj.message.thinking
    if (typeof obj?.response === 'string') answer.content += obj.response
    if (typeof obj?.thinking === 'string') answer.thinking += obj.thinking
    if (obj && (obj.done === true || obj.prompt_eval_count !== undefined || obj.embeddings)) final = obj
    if (obj?.error) final = { ...(final ?? {}), error: obj.error }
  }
  if (!final) return null
  const err = normaliseError(final.error)
  return {
    // A context-size rejection still tells us how big the prompt was.
    promptTokens: final.prompt_eval_count ?? err.contextExceeded?.promptTokens ?? null,
    cachedTokens: final.prompt_eval_cached_count ?? null,
    prefillMs: final.prompt_eval_duration != null ? final.prompt_eval_duration / NS_TO_MS : null,
    evalTokens: final.eval_count ?? null,
    evalMs: final.eval_duration != null ? final.eval_duration / NS_TO_MS : null,
    loadMs: final.load_duration != null ? final.load_duration / NS_TO_MS : null,
    totalMs: final.total_duration != null ? final.total_duration / NS_TO_MS : null,
    doneReason: final.done_reason ?? null,
    toolCalls,
    generatedChars: generated,
    answer: doneAnswer(answer),
    error: err.message,
    contextExceeded: err.contextExceeded,
  }
}

/**
 * Ollama answers a prompt larger than the loaded context with a 400 whose
 * body carries the two numbers that matter: how many tokens the prompt was and
 * how many the context holds. Keep them; they are the finding.
 */
export function normaliseError(error) {
  if (error == null) return { message: null, contextExceeded: null }
  if (typeof error === 'string') {
    const m = error.match(/request \((\d+) tokens\) exceeds the available context size \((\d+) tokens\)/)
    return {
      message: error,
      contextExceeded: m ? { promptTokens: Number(m[1]), contextLength: Number(m[2]) } : null,
    }
  }
  const message = error.message ?? JSON.stringify(error)
  const exceeded =
    error.type === 'exceed_context_size_error' || (error.n_prompt_tokens != null && error.n_ctx != null)
      ? { promptTokens: Number(error.n_prompt_tokens), contextLength: Number(error.n_ctx) }
      : normaliseError(message).contextExceeded
  return { message, contextExceeded: exceeded }
}

/**
 * Parse an OpenAI-compatible response: either one JSON object or an SSE stream
 * of `data:` lines. Usage arrives on the final chunk; Ollama adds a `timings`
 * block beside it. Its `prompt_per_second` is NOT used (see Protocol
 * Observatory: it divides the full prompt by the uncached time).
 */
export function parseOpenAIResponse(text) {
  const objects = []
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      objects.push(JSON.parse(trimmed))
    } catch {
      return null
    }
  } else {
    for (const raw of trimmed.split('\n')) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        objects.push(JSON.parse(payload))
      } catch {
        /* partial line */
      }
    }
  }
  if (objects.length === 0) return null

  const toolCalls = []
  let generated = 0
  let usage = null
  let timings = null
  let error = null
  const answer = newAnswer()
  // Streamed tool calls arrive in pieces keyed by index: the name once, the arguments as text fragments.
  const streamedCalls = new Map()
  for (const o of objects) {
    if (o.usage) usage = o.usage
    if (o.timings) timings = o.timings
    if (o.error) error = typeof o.error === 'string' ? o.error : (o.error.message ?? JSON.stringify(o.error))
    for (const ch of o.choices ?? []) {
      const msg = ch.delta ?? ch.message ?? {}
      if (typeof msg.content === 'string') {
        generated += msg.content.length
        answer.content += msg.content
      }
      const thought = msg.reasoning_content ?? msg.reasoning
      if (typeof thought === 'string') answer.thinking += thought
      for (const tc of msg.tool_calls ?? []) {
        if (tc?.function?.name) toolCalls.push(tc.function.name)
        const key = tc?.index ?? streamedCalls.size
        const call = streamedCalls.get(key) ?? { name: null, args: '' }
        if (tc?.function?.name) call.name = tc.function.name
        const a = tc?.function?.arguments
        if (typeof a === 'string') call.args += a
        else if (a != null) call.args = a
        streamedCalls.set(key, call)
      }
      if (typeof ch.text === 'string') {
        generated += ch.text.length
        answer.content += ch.text
      }
    }
  }
  for (const c of streamedCalls.values()) answer.toolCalls.push({ name: c.name ?? 'tool', arguments: parseArgs(c.args) })

  const promptTokens = usage?.prompt_tokens ?? timings?.prompt_n ?? null
  const cached = usage?.prompt_tokens_details?.cached_tokens ?? timings?.prompt_cached_n ?? null
  return {
    promptTokens,
    cachedTokens: cached,
    prefillMs: timings?.prompt_ms ?? null,
    evalTokens: usage?.completion_tokens ?? timings?.predicted_n ?? null,
    evalMs: timings?.predicted_ms ?? null,
    loadMs: null,
    totalMs: null,
    doneReason: objects.at(-1)?.choices?.[0]?.finish_reason ?? null,
    toolCalls: [...new Set(toolCalls)],
    generatedChars: generated,
    answer: doneAnswer(answer),
    error,
    contextExceeded: normaliseError(error).contextExceeded,
  }
}

/**
 * Anthropic Messages, as Ollama serves it: one JSON object, or SSE events
 * (message_start, content_block_start, content_block_delta, message_delta).
 * Verified on Ollama 0.40.4 (2026-10-15): usage.input_tokens is the UNCACHED part
 * and usage.cache_read_input_tokens the cached part, Anthropic's own semantics,
 * so the prompt is their sum. No timings are reported on this path.
 */
export function parseAnthropicResponse(text) {
  const objects = []
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      objects.push(JSON.parse(trimmed))
    } catch {
      return null
    }
  } else {
    for (const raw of trimmed.split('\n')) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      try {
        objects.push(JSON.parse(line.slice(5).trim()))
      } catch {
        /* partial line */
      }
    }
  }
  if (objects.length === 0) return null

  let input = null
  let cached = null
  let output = null
  let stop = null
  let error = null
  const toolCalls = []
  const answer = newAnswer()
  // Streamed blocks: a tool_use block starts with its name; its input arrives as partial JSON text.
  const blocks = new Map()
  let generated = 0
  const takeUsage = (u) => {
    if (!u) return
    if (u.input_tokens != null) input = u.input_tokens
    if (u.cache_read_input_tokens != null) cached = u.cache_read_input_tokens
    if (u.output_tokens != null) output = u.output_tokens
  }
  for (const o of objects) {
    if (o.type === 'error' || o.error) error = typeof o.error === 'string' ? o.error : (o.error?.message ?? JSON.stringify(o.error ?? o))
    if (o.type === 'message' || o.role === 'assistant') {
      takeUsage(o.usage)
      stop = o.stop_reason ?? stop
      for (const b of o.content ?? []) {
        if (b?.type === 'text') {
          generated += (b.text ?? '').length
          answer.content += b.text ?? ''
        }
        if (b?.type === 'thinking') answer.thinking += b.thinking ?? ''
        if (b?.type === 'tool_use' && b.name) {
          toolCalls.push(b.name)
          answer.toolCalls.push({ name: b.name, arguments: b.input ?? null })
        }
      }
    }
    if (o.type === 'message_start') takeUsage(o.message?.usage)
    if (o.type === 'content_block_start' && o.content_block?.type === 'tool_use' && o.content_block.name) {
      toolCalls.push(o.content_block.name)
      blocks.set(o.index, { name: o.content_block.name, args: '' })
    }
    if (o.type === 'content_block_delta' && o.delta?.type === 'text_delta') {
      generated += (o.delta.text ?? '').length
      answer.content += o.delta.text ?? ''
    }
    if (o.type === 'content_block_delta' && o.delta?.type === 'thinking_delta') answer.thinking += o.delta.thinking ?? ''
    if (o.type === 'content_block_delta' && o.delta?.type === 'input_json_delta' && blocks.has(o.index)) blocks.get(o.index).args += o.delta.partial_json ?? ''
    if (o.type === 'message_delta') {
      takeUsage(o.usage)
      stop = o.delta?.stop_reason ?? stop
    }
  }
  for (const b of blocks.values()) answer.toolCalls.push({ name: b.name, arguments: parseArgs(b.args) })
  const promptTokens = input == null && cached == null ? null : (input ?? 0) + (cached ?? 0)
  return {
    promptTokens,
    cachedTokens: cached,
    prefillMs: null,
    evalTokens: output,
    evalMs: null,
    loadMs: null,
    totalMs: null,
    doneReason: stop,
    toolCalls: [...new Set(toolCalls)],
    generatedChars: generated,
    answer: doneAnswer(answer),
    error,
    contextExceeded: normaliseError(error).contextExceeded,
  }
}

export function parseResponse(protocol, text) {
  if (protocol === 'anthropic-messages') return parseAnthropicResponse(text)
  return protocol.startsWith('openai') ? parseOpenAIResponse(text) : parseOllamaResponse(text)
}

/** Derived rates. Real prefill divides by the UNCACHED tokens only. */
export function rates(r) {
  if (!r) return { prefillTps: null, genTps: null, evaluated: null }
  const evaluated =
    r.promptTokens != null ? Math.max(0, r.promptTokens - (r.cachedTokens ?? 0)) : null
  const prefillTps =
    evaluated != null && r.prefillMs ? Math.round((evaluated / r.prefillMs) * 1000) : null
  const genTps = r.evalTokens != null && r.evalMs ? +((r.evalTokens / r.evalMs) * 1000).toFixed(1) : null
  return { prefillTps, genTps, evaluated }
}

/**
 * A bounded, in-memory log of turns with a monotonic sequence so the page can
 * ask "everything since N" and subscribe to what follows.
 */
export function createTurnLog(capacity = 500) {
  const turns = []
  const listeners = new Set()
  let seq = 0
  /** Last canonical prompt per client+model, for the prefix diff. Text is kept here only. */
  const lastCanonical = new Map()

  return {
    get size() {
      return turns.length
    },
    nextSeq() {
      return ++seq
    },
    push(turn) {
      turns.push(turn)
      if (turns.length > capacity) turns.splice(0, turns.length - capacity)
      for (const fn of listeners) fn(turn)
    },
    since(n) {
      return turns.filter((t) => t.seq > n)
    },
    all() {
      return turns.slice()
    },
    find(id) {
      return turns.find((t) => t.id === id) ?? null
    },
    clear() {
      turns.length = 0
      lastCanonical.clear()
    },
    /** Puts back turns kept from an earlier run, oldest first; numbering carries on after them. */
    restore(kept) {
      turns.push(...kept.slice(-capacity))
      seq = Math.max(seq, ...kept.map((t) => t.seq ?? 0))
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    previousCanonical(key) {
      return lastCanonical.get(key) ?? null
    },
    rememberCanonical(key, canonical) {
      lastCanonical.set(key, canonical)
    },
  }
}
