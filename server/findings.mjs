/**
 * Plain-sentence findings over the turns seen on the observe port. One source
 * for the Live page (through src/services/live-findings.ts) and for the MCP
 * server (server/mcp.mjs). Pure functions over turn records; no I/O.
 *
 * Each finding is backed by a specific turn. Thresholds are deliberately
 * conservative: a finding that fires on one noisy turn is worse than none.
 */

const MIN_TURNS = 3
const LOW_CACHE_SHARE = 0.5
const MIN_WASTED_TOKENS = 500
/** A turn's cached share must fall this far below the previous turn's to count as a drop. */
const DROP_POINTS = 0.4
const CPU_SHARE_FLOOR = 0.05
const TOOLS_SHARE_FLOOR = 0.25
/** A turn whose model took this long to load had no cache to keep; it proves nothing about the prompt. */
const RELOAD_MS = 500

/** True when the daemon (re)loaded the model for this turn. */
/**
 * Ollama's /api/ps footprint for a loaded model, checked against the model's own file. A footprint
 * under half the file cannot be true: the weights alone are the file. Ollama 0.40.6 reports such
 * figures on its llama.cpp runner (432 MB for a 6.1 GB gemma4; ollama/ollama#19089), so the figure
 * is flagged and the file size stands in for it.
 */
export const UNDER_REPORT_ISSUE = 'https://github.com/ollama/ollama/issues/19089'
export function underReportedMemory(reportedBytes, fileBytes) {
  return reportedBytes != null && fileBytes != null && fileBytes > 0 && reportedBytes < fileBytes * 0.5
}

export function reloaded(t) {
  return t.loadMs != null && t.loadMs > RELOAD_MS
}

export function median(values) {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Cached share of a turn's prompt, or null when the daemon did not say. */
export function cacheShare(t) {
  if (t.prompt.tokens == null || t.prompt.cached == null || t.prompt.tokens <= 0) return null
  return Math.min(t.prompt.cached, t.prompt.tokens) / t.prompt.tokens
}

/** Tokens of the current message, scaled from characters onto the daemon's count. */
export function messageTokensEst(t) {
  if (t.prompt.tokens == null || t.anatomy.totalChars <= 0) return null
  return Math.round((t.anatomy.messageChars / t.anatomy.totalChars) * t.prompt.tokens)
}

/**
 * Prefill time a turn would have saved if everything but the new message had
 * been served from cache. Linear in the uncached tokens, which prefill is to a
 * good approximation; still an estimate, and labelled as one in the UI.
 */
export function cacheFixSavingMs(t) {
  // A first turn (or a cold load) has no previous prompt to share a prefix with:
  // nothing about its ordering could have been cached, so it is not a saving.
  if (!t.prefix) return null
  const evaluated = t.prompt.evaluated
  const msgTokens = messageTokensEst(t)
  if (evaluated == null || msgTokens == null || t.prompt.prefillMs == null || evaluated <= 0) return null
  const avoidable = Math.max(0, evaluated - msgTokens)
  return (avoidable / evaluated) * t.prompt.prefillMs
}

/** Tokens a prompt most likely had, from its characters: ~3.5 chars per token plus template overhead. */
export function estimateTokens(t) {
  return t.anatomy.totalChars / 3.5 + 20
}

/** The daemon answered, reported exactly a context-full prompt, and the prompt was clearly larger than that. */
/**
 * The context one request can use. The request's own num_ctx when it set one; otherwise the
 * loaded figure, which /api/ps reports as num_ctx times the parallel slots (measured 2026-10-16:
 * num_ctx 1024 loaded as context_length 2048 with two slots), so it can overstate the ceiling.
 */
export function requestContext(t) {
  return t.prompt.contextRequested ?? t.fit?.contextLength ?? null
}

export function silentlyTruncated(t) {
  const ctx = requestContext(t)
  if (!ctx || t.prompt.tokens == null || t.contextExceeded || t.error) return false
  if (t.prompt.tokens < ctx - 8) return false
  return estimateTokens(t) > ctx * 1.15
}

function groupBy(items, key) {
  const m = new Map()
  for (const it of items) {
    const k = key(it)
    const arr = m.get(k)
    if (arr) arr.push(it)
    else m.set(k, [it])
  }
  return m
}

export function computeFindings(turns) {
  const findings = []
  const chatTurns = turns.filter((t) => (t.mode === 'chat' || t.mode === 'agent') && !t.error)

  // 0. Requests the daemon refused because the prompt is larger than the loaded
  //    context. One such turn is proof enough; it is deterministic, not noisy.
  for (const [, group] of groupBy(turns.filter((t) => t.contextExceeded), (t) => `${t.client.id}|${t.model}`)) {
    const latest = group[group.length - 1]
    findings.push({
      kind: 'context',
      severity: 'error',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        model: latest.model,
        tokens: latest.contextExceeded.promptTokens,
        context: latest.contextExceeded.contextLength,
        rejected: group.length,
      },
    })
  }

  // 0b. Prompts the daemon silently cut to fit the loaded context. Measured on Ollama 0.40.4:
  //     HTTP 200, prompt_eval_count equal to the context (plus a few), only the first handful of
  //     tokens kept, the system prompt gone, no field in the response. The count at the ceiling
  //     while the prompt's characters say it was far larger is the signature.
  for (const [, group] of groupBy(turns.filter(silentlyTruncated), (t) => `${t.client.id}|${t.model}`)) {
    const latest = group[group.length - 1]
    const est = estimateTokens(latest)
    findings.push({
      kind: 'truncated',
      severity: 'error',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        model: latest.model,
        context: requestContext(latest),
        tokens: Math.round(est),
        lost: Math.round(est - requestContext(latest)),
        systemChars: latest.anatomy.systemChars,
        turns: group.length,
      },
    })
  }

  // 1. A client whose prompts keep breaking the cache early.
  for (const [, group] of groupBy(chatTurns, (t) => `${t.client.id}|${t.model}`)) {
    const measured = group.filter((t) => cacheShare(t) != null && t.prompt.evaluated != null && !reloaded(t))
    if (measured.length < MIN_TURNS) continue
    const share = median(measured.map((t) => cacheShare(t)))
    const wasted = median(measured.map((t) => t.prompt.evaluated))
    if (share >= LOW_CACHE_SHARE || wasted < MIN_WASTED_TOKENS) continue
    const latest = measured[measured.length - 1]
    const breakTokens = median(measured.map((t) => t.prefix?.breakTokensEst ?? NaN))
    const promptTokens = median(measured.map((t) => t.prompt.tokens))
    findings.push({
      kind: 'prefix',
      severity: 'error',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        model: latest.model,
        tokens: Math.round(wasted),
        promptTokens: Math.round(promptTokens),
        share: Math.round(share * 100),
        breakTokens: breakTokens == null ? -1 : Math.round(breakTokens),
      },
    })
  }

  // 1b. The one turn where a client that was cached stopped being cached.
  //     Per turn, not a median: a session average hides exactly this turn.
  //     Only the latest drop per client+model is reported, so a client that
  //     breaks every turn is covered by the prefix finding above, not by a
  //     flag on each of them.
  for (const [, group] of groupBy(chatTurns, (t) => `${t.client.id}|${t.model}`)) {
    const measured = group.filter((t) => cacheShare(t) != null && t.prompt.tokens != null)
    let drop = null
    for (let i = 1; i < measured.length; i++) {
      const prev = cacheShare(measured[i - 1])
      const cur = cacheShare(measured[i])
      const t = measured[i]
      // A reload explains the empty cache, so a reloaded turn is never a drop.
      if (prev >= LOW_CACHE_SHARE && prev - cur >= DROP_POINTS && t.prompt.tokens >= MIN_WASTED_TOKENS && !reloaded(t)) {
        drop = { turn: t, from: prev, to: cur }
      }
    }
    if (!drop) continue
    const breakTokens = drop.turn.prefix?.breakTokensEst ?? null
    findings.push({
      kind: 'drop',
      severity: 'warning',
      turnId: drop.turn.id,
      params: {
        client: drop.turn.client.label,
        model: drop.turn.model,
        from: Math.round(drop.from * 100),
        to: Math.round(drop.to * 100),
        promptTokens: Math.round(drop.turn.prompt.tokens),
        breakTokens: breakTokens == null ? -1 : Math.round(breakTokens),
        // The model's load time on that turn: a few ms means it stayed resident, so the
        // KV cache was there and the daemon reused none of it. A reload is excluded above.
        loadMs: drop.turn.loadMs == null ? -1 : Math.round(drop.turn.loadMs),
      },
    })
  }

  // 2. A model that no longer fits on the GPU.
  const byModel = groupBy(
    turns.filter((t) => t.fit?.cpuShare != null),
    (t) => t.model,
  )
  for (const [model, group] of byModel) {
    const latest = group[group.length - 1]
    const cpu = latest.fit.cpuShare
    if (cpu < CPU_SHARE_FLOOR || cpu >= 0.999) continue
    findings.push({
      kind: 'cpu',
      severity: 'warning',
      turnId: latest.id,
      params: {
        model,
        cpu: Math.round(cpu * 100),
        context: latest.fit.contextLength ?? -1,
        runner: latest.fit.runner ?? '',
      },
    })
  }

  // 3. A client whose tool schemas dominate the prompt. Rejected turns count
  //    here too: the schemas are what made the prompt too big.
  const toolTurns = turns.filter((t) => (t.mode === 'chat' || t.mode === 'agent') && t.toolsOffered > 0 && (!t.error || t.contextExceeded))
  for (const [, group] of groupBy(toolTurns, (t) => t.client.id)) {
    const shares = group
      .filter((t) => t.anatomy.totalChars > 0)
      .map((t) => t.anatomy.toolsChars / t.anatomy.totalChars)
    const share = median(shares)
    if (share == null || share < TOOLS_SHARE_FLOOR) continue
    const latest = group[group.length - 1]
    const used = new Set(group.flatMap((t) => t.toolCalls))
    findings.push({
      kind: 'tools',
      severity: 'warning',
      turnId: latest.id,
      params: {
        client: latest.client.label,
        share: Math.round(share * 100),
        offered: latest.toolsOffered,
        used: used.size,
        turns: group.length,
      },
    })
  }

  return findings
}

export function summariseClients(turns) {
  const out = []
  for (const [clientId, group] of groupBy(turns, (t) => t.client.id)) {
    let tokens = 0
    let toolCalls = 0
    let prefillMs = 0
    let saves = 0
    let savesKnown = false
    const modes = new Set()
    for (const t of group) {
      tokens += (t.prompt.tokens ?? 0) + (t.gen.tokens ?? 0)
      toolCalls += t.toolCalls.length
      prefillMs += t.prompt.prefillMs ?? 0
      modes.add(t.mode)
      const s = cacheFixSavingMs(t)
      if (s != null) {
        saves += s
        savesKnown = true
      }
    }
    out.push({
      clientId,
      label: group[0].client.label,
      modes: [...modes],
      turns: group.length,
      tokens,
      toolCalls,
      prefillMs,
      cacheFixSavesMs: savesKnown ? saves : null,
    })
  }
  return out.sort((a, b) => b.turns - a.turns)
}

/**
 * The finding as English sentences, for readers that are not the Live page:
 * the MCP server hands these to agents. Same wording as src/locales/en/live.json.
 */
export function renderFinding(f) {
  const p = f.params
  switch (f.kind) {
    case 'context':
      return (
        `${p.client} sends ${p.tokens}-token prompts, but ${p.model} is loaded with a ${p.context}-token context. ` +
        `${p.rejected} request${p.rejected === 1 ? '' : 's'} rejected. ` +
        `Ollama refuses a prompt larger than the context it loaded the model with, so nothing reaches the model. ` +
        `Raise the context length in Ollama's settings (or OLLAMA_CONTEXT_LENGTH) to above the prompt size; coding assistants ask for 32K to 64K. ` +
        `The larger context also needs room in video memory.`
      )
    case 'truncated':
      return (
        `${p.client} sent about ${p.tokens}-token prompts to ${p.model}, loaded with a ${p.context}-token context, and the daemon answered as if nothing was wrong. ` +
        `It kept the first few tokens and the end, and dropped about ${p.lost} tokens from the start${p.systemChars > 0 ? ', the system prompt included' : ''}. ` +
        `Nothing in the response says so; the prompt count sitting exactly at the context size is the only trace. ` +
        `${p.turns === 1 ? 'Seen on 1 turn' : `Seen on ${p.turns} turns`}. Raise num_ctx (or OLLAMA_CONTEXT_LENGTH) above the prompt size, or shorten the prompt; the answer you got was to a prompt you did not send.`
      )
    case 'prefix':
      return (
        `${p.client} re-reads about ${p.tokens} tokens on every turn with ${p.model}; the prompt cache (the KV cache) is not helping. ` +
        (p.breakTokens >= 0
          ? `The prompt is about ${p.promptTokens} tokens and the cache keeps ${p.share}%. It stops matching the previous turn around token ${p.breakTokens} (an estimate from characters); everything after that point is recomputed each time.`
          : `The prompt is about ${p.promptTokens} tokens and the cache keeps ${p.share}% of it. Something near the start changes between turns; everything after it is recomputed each time.`)
      )
    case 'drop':
      return (
        `${p.client} lost the cache on this turn with ${p.model}: ${p.from}% kept on the previous turn, ${p.to}% on this one. ` +
        (p.loadMs != null && p.loadMs >= 0
          ? `The model stayed loaded (load ${p.loadMs} ms), so its KV cache was still there and the daemon reused none of it: not an eviction, a prefix that no longer matched. `
          : `The daemon did not report a reload, so this is a prefix that no longer matched rather than an eviction. `) +
        (p.breakTokens >= 0
          ? `The prompt is about ${p.promptTokens} tokens and stopped matching the previous turn around token ${p.breakTokens} (an estimate from characters); everything after that point was recomputed. The turns before it were fine, which is why this one stands out.`
          : `The prompt is about ${p.promptTokens} tokens. Something before the new message changed between the two turns, so everything after that point was recomputed. The turns before it were fine, which is why this one stands out.`)
      )
    case 'cpu':
      return (
        `${p.model} runs ${p.cpu}% on CPU. ` +
        (p.context >= 0
          ? `It is loaded with a ${p.context}-token context and no longer fits in video memory, so part of it runs from system RAM. Prefill and generation slow down with that share, from a little at 5% to several times at half. A smaller context window, or a quantised KV cache (OLLAMA_KV_CACHE_TYPE=q8_0), is the usual fix.`
          : `Part of it runs from system RAM rather than video memory. Prefill and generation slow down with that share, from a little at 5% to several times at half. A smaller context window, or a quantised KV cache, is the usual fix.`)
      )
    case 'tools':
      return (
        `Tool schemas are ${p.share}% of every ${p.client} prompt. ` +
        `${p.offered} tools are described on each turn; ${p.used} of them were used in the ${p.turns} turns seen. ` +
        `The schemas sit in the stable prefix, so they are cached, but they still occupy context.`
      )
    default:
      return JSON.stringify(f)
  }
}
