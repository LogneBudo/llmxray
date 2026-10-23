/**
 * LLMxRay as a set of tools for agents (Model Context Protocol, stdio).
 *
 * The agent routes its Ollama calls through LLMxRay's observe port (11435
 * instead of 11434). Nothing else changes for it. It can then ask these tools
 * what happened: what went wrong with its own turns, what the last turn cost,
 * which local models exist and whether they fit.
 *
 * Reads from a running LLMxRay server (default http://localhost:5174) and from
 * Ollama directly. Writes nothing. Sends nothing anywhere.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { computeFindings, summariseClients, cacheShare, renderFinding, reloaded, truncation, median, underReportedMemory, UNDER_REPORT_ISSUE } from './findings.mjs'

function packageVersion() {
  try {
    return JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

const HOW_TO_ROUTE =
  'No turns have been seen yet. Point your Ollama client at the observe port instead of Ollama itself: ' +
  'http://localhost:11435 (OLLAMA_HOST=127.0.0.1:11435, or the base URL of your client). It behaves exactly like Ollama ' +
  'and forwards everything; LLMxRay only records what passes. Name yourself with the header X-LLMxRay-Client: <your name> ' +
  '(or ?client=<your name> on the base URL) and pass that name as "client" here. Claude Code: ANTHROPIC_BASE_URL=http://localhost:11435. Then call this tool again.'

export function createTools({ serverUrl, ollamaUrl, fetchImpl = fetch }) {
  const base = serverUrl.replace(/\/+$/, '')
  const ollama = ollamaUrl.replace(/\/+$/, '')

  async function getJson(url) {
    let res
    try {
      res = await fetchImpl(url)
    } catch (e) {
      const isOllama = url.startsWith(ollama)
      throw new Error(
        isOllama
          ? `Ollama is not reachable at ${ollama} (${e.message}). Start it, or set OLLAMA_URL.`
          : `LLMxRay is not running at ${base} (${e.message}). Start it with "npx llmxray" in another terminal, or set LLMXRAY_URL to where it runs. The MCP server only reads from it.`,
      )
    }
    if (!res.ok) throw new Error(`${url} answered ${res.status}`)
    return res.json()
  }

  /** Turns matching the filter, plus the labels of every client seen so a miss can say who was. */
  async function turnsFor(client, sinceMinutes) {
    const { turns } = await getJson(`${base}/__observe/turns?since=0`)
    const cutoff = sinceMinutes ? Date.now() - sinceMinutes * 60_000 : 0
    const needle = client?.toLowerCase()
    const matching = turns.filter(
      (t) => t.at >= cutoff && (!needle || t.client.label.toLowerCase().includes(needle) || t.client.id.toLowerCase().includes(needle)),
    )
    const seen = [...new Set(turns.map((t) => t.client.label))]
    return { matching, seen }
  }

  function nothingFor(client, seen) {
    if (!seen.length) return HOW_TO_ROUTE
    return (
      `No turns from a client matching "${client}". Clients seen so far: ${seen.join(', ')}. ` +
      `Pass one of those as "client", or omit it for all. A client with no User-Agent header shows as "Node (fetch)" or "python-requests".`
    )
  }

  function describeTurn(t) {
    const share = cacheShare(t)
    const lines = [
      `turn ${t.seq} at ${new Date(t.at).toISOString()}  client: ${t.client.label}  model: ${t.model}  mode: ${t.mode}  status: ${t.status}${t.error ? `  error: ${t.error}` : ''}`,
      `prompt: ${t.prompt.tokens ?? '?'} tokens, ${t.prompt.cached ?? '?'} from cache${share == null ? '' : ` (${Math.round(share * 100)}%)`}, ${t.prompt.evaluated ?? '?'} evaluated` +
        (t.prompt.prefillMs != null ? ` in ${t.prompt.prefillMs} ms${t.prompt.prefillTps != null ? ` (${Math.round(t.prompt.prefillTps)} tok/s uncached)` : ''}` : ''),
      `generation: ${t.gen.tokens ?? '?'} tokens${t.gen.ms != null ? ` in ${t.gen.ms} ms` : ''}${t.gen.tps != null ? ` (${t.gen.tps.toFixed(1)} tok/s)` : ''}${t.gen.doneReason ? `, stopped: ${t.gen.doneReason}` : ''}`,
      `prompt anatomy (chars): system ${t.anatomy.systemChars}, tools ${t.anatomy.toolsChars}, history ${t.anatomy.historyChars}, new message ${t.anatomy.messageChars}, ${t.anatomy.messages} messages`,
    ]
    if (t.prompt.contextRequested != null) lines.push(`context requested: ${t.prompt.contextRequested}`)
    if (t.contextExceeded) lines.push(`REJECTED: prompt ${t.contextExceeded.promptTokens} tokens > loaded context ${t.contextExceeded.contextLength}`)
    if (t.loadMs != null && t.loadMs > 500) lines.push(`model was (re)loaded for this turn: ${Math.round(t.loadMs)} ms, which is why nothing was cached`)
    if (t.toolsOffered) lines.push(`tools offered: ${t.toolsOffered}${t.toolCalls.length ? `, called: ${t.toolCalls.join(', ')}` : ', none called'}`)
    if (t.fit) lines.push(`model fit: context ${t.fit.contextLength ?? '?'}, ${t.fit.cpuShare == null ? 'VRAM share unknown' : `${Math.round((1 - t.fit.cpuShare) * 100)}% in VRAM`}${t.fit.runner ? `, runner ${t.fit.runner}` : ''}`)
    if (t.prefix && !t.prefix.identical) lines.push(`prefix: stopped matching the previous turn at ${Math.round(t.prefix.breakShare * 100)}% of the prompt${t.prefix.breakTokensEst != null ? ` (about token ${t.prefix.breakTokensEst}, an estimate from characters)` : ''}`)
    return lines.join('\n')
  }

  return {
    async diagnose_my_turns({ client, since_minutes } = {}) {
      const { matching: turns, seen } = await turnsFor(client, since_minutes)
      if (!turns.length) return nothingFor(client, seen)
      const findings = computeFindings(turns)
      const clients = summariseClients(turns)
      const out = []
      out.push(`${turns.length} turn${turns.length === 1 ? '' : 's'} seen${client ? ` for "${client}"` : ''}${since_minutes ? ` in the last ${since_minutes} min` : ''}.`)
      for (const c of clients) {
        out.push(
          `- ${c.label}: ${c.turns} turns, ${c.tokens} tokens, ${c.toolCalls} tool calls, ${Math.round(c.prefillMs / 1000)} s of prefill` +
            (c.cacheFixSavesMs != null && c.cacheFixSavesMs > 1000 ? `; about ${Math.round(c.cacheFixSavesMs / 1000)} s of that would have been skipped had the prompt prefix stayed cached (estimate)` : ''),
        )
      }
      if (!findings.length) {
        out.push('')
        out.push(
          turns.length < 3
            ? 'Nothing stands out yet. Findings need a few turns from the same client and model.'
            : 'Nothing stands out: the cache is holding, the model fits, prompts fit the context.',
        )
      } else {
        out.push('')
        out.push(`What stands out (${findings.length}):`)
        for (const f of findings) out.push(`- [${f.severity}] ${renderFinding(f)}`)
      }
      return out.join('\n')
    },

    async read_my_last_turn({ client } = {}) {
      const { matching: turns, seen } = await turnsFor(client)
      if (!turns.length) return nothingFor(client, seen)
      return describeTurn(turns[turns.length - 1])
    },

    /** The missing history view: one line per turn, newest last. */
    async list_my_turns({ client, since_minutes, limit } = {}) {
      const { matching, seen } = await turnsFor(client, since_minutes)
      if (!matching.length) return nothingFor(client, seen)
      const n = Math.min(Math.max(Number(limit) || 20, 1), 100)
      const shown = matching.slice(-n)
      const lines = [`${matching.length} turn${matching.length === 1 ? '' : 's'}${client ? ` for "${client}"` : ''}${since_minutes ? ` in the last ${since_minutes} min` : ''}; showing the last ${shown.length}. One line each: turn, time, client, model, prompt tokens (cached share), prefill ms, generation tok/s, stop reason, flags.`]
      for (const t of shown) {
        const share = cacheShare(t)
        const flags = []
        if (reloaded(t)) flags.push('reloaded')
        if (t.contextExceeded) flags.push('rejected: over context')
        const cut = truncation(t)
        if (cut) flags.push(cut.mode === 'history' ? 'cut: oldest messages dropped' : 'cut: start dropped')
        if (t.error) flags.push(`error: ${t.error}`)
        lines.push(
          `${t.seq}  ${new Date(t.at).toISOString().slice(0, 19)}Z  ${t.client.label}  ${t.model}  ${t.prompt.tokens ?? '?'} tok` +
            `${share == null ? '' : ` (${Math.round(share * 100)}% cached)`}  prefill ${t.prompt.prefillMs == null ? '?' : Math.round(t.prompt.prefillMs)} ms  ` +
            `gen ${t.gen.tps == null ? '?' : t.gen.tps.toFixed(1)} tok/s  ${t.gen.doneReason ?? '?'}${flags.length ? `  [${flags.join(', ')}]` : ''}`,
        )
      }
      return lines.join('\n')
    },

    /** Before and after a moment: the medians of what a change is supposed to move, and whether it did. */
    async compare_my_turns({ client, split_minutes_ago } = {}) {
      const { matching, seen } = await turnsFor(client)
      if (!matching.length) return nothingFor(client, seen)
      const split = Date.now() - Math.min(Math.max(Number(split_minutes_ago) || 60, 1), 10080) * 60_000
      const before = matching.filter((t) => t.at < split)
      const after = matching.filter((t) => t.at >= split)
      if (!before.length || !after.length) {
        return `Nothing to compare: ${before.length} turn${before.length === 1 ? '' : 's'} before and ${after.length} after the split ${split_minutes_ago ?? 60} minutes ago${client ? ` for "${client}"` : ''}. Move split_minutes_ago so both sides have turns; the oldest turn kept is ${matching.length ? new Date(matching[0].at).toISOString().slice(0, 16) + 'Z' : 'none'}.`
      }
      const m = (turns, f) => median(turns.map(f).filter((v) => v != null && Number.isFinite(v)))
      const row = (name, a, b, fmt, higherIsBetter) => {
        if (a == null || b == null) return `${name}: not measured on one side`
        const d = b - a
        const arrow = d === 0 ? 'unchanged' : (d > 0) === higherIsBetter ? 'better' : 'worse'
        return `${name}: ${fmt(a)} before, ${fmt(b)} after (${d > 0 ? '+' : ''}${fmt(d)}, ${arrow})`
      }
      const pct = (v) => `${Math.round(v * 100)}%`
      const ms = (v) => `${Math.round(v)} ms`
      const tps = (v) => `${v.toFixed(1)} tok/s`
      const tok = (v) => `${Math.round(v)} tokens`
      const out = [
        `${before.length} turn${before.length === 1 ? '' : 's'} before and ${after.length} after the split ${split_minutes_ago ?? 60} minutes ago${client ? ` for "${client}"` : ''}. Medians, after against before:`,
        row('cached share', m(before, cacheShare), m(after, cacheShare), pct, true),
        row('prefill', m(before, (t) => t.prompt.prefillMs), m(after, (t) => t.prompt.prefillMs), ms, false),
        row('generation speed', m(before, (t) => t.gen.tps), m(after, (t) => t.gen.tps), tps, true),
        row('prompt size', m(before, (t) => t.prompt.tokens), m(after, (t) => t.prompt.tokens), tok, false),
        `reloads: ${before.filter(reloaded).length} before, ${after.filter(reloaded).length} after`,
        `rejected or cut by the context: ${before.filter((t) => t.contextExceeded).length} before, ${after.filter((t) => t.contextExceeded).length} after`,
      ]
      const ca = m(before, cacheShare), cb = m(after, cacheShare)
      if (ca != null && cb != null) {
        const diff = cb - ca
        out.push('')
        out.push(
          diff >= 0.2 ? `Verdict: the cache is working now where it was not (${pct(ca)} to ${pct(cb)}).`
          : diff <= -0.2 ? `Verdict: the cache got worse (${pct(ca)} to ${pct(cb)}); something near the start of the prompt changed.`
          : `Verdict: no real change in cache reuse (${pct(ca)} to ${pct(cb)}); look at prefill and speed above for what did move.`,
        )
      }
      return out.join('\n')
    },

    /** Context headroom for a prompt you have not sent yet, from what is loaded and what this client last reused. */
    async estimate_my_prompt({ model, prompt_tokens, client } = {}) {
      const tokens = Math.min(Math.max(Number(prompt_tokens) || 0, 1), 2_000_000)
      const [tags, ps, info] = await Promise.all([
        getJson(`${ollama}/api/tags`),
        getJson(`${ollama}/api/ps`).catch(() => ({ models: [] })),
        getJson(`${base}/__system-info`).catch(() => null),
      ])
      const want = String(model ?? '').trim()
      const pulled = (tags.models ?? []).find((m) => m.name === want || m.name === `${want}:latest` || m.name.startsWith(want + ':'))
      if (!pulled) return `No pulled model matches "${want}". Pulled: ${(tags.models ?? []).map((m) => m.name).join(', ') || 'none'}.`
      const loaded = (ps.models ?? []).find((m) => m.name === pulled.name)
      const vram = info?.gpu?.[0]?.adapterRamBytes || 0
      const lines = [`${pulled.name}: ${loaded ? `loaded with a ${loaded.context_length}-token context` : `not loaded; its model file allows up to ${pulled.details?.context_length ?? '?'} tokens`}.`]
      const ctx = loaded?.context_length ?? pulled.details?.context_length ?? null
      if (ctx != null) {
        const room = ctx - tokens
        lines.push(
          room >= 0
            ? `A ${tokens}-token prompt fits with ${room} tokens of headroom for the answer${room < 512 ? ' (tight: under 512)' : ''}.`
            : `A ${tokens}-token prompt is ${-room} tokens over that context: Ollama will reject it or cut it silently. Raise num_ctx or shorten the prompt.`,
        )
      }
      if (loaded) {
        const inVram = loaded.size ? loaded.size_vram / loaded.size : null
        lines.push(inVram == null ? 'VRAM share unknown.' : inVram >= 0.99 ? 'The loaded model sits fully in video memory.' : `${Math.round(inVram * 100)}% of the loaded model is in video memory; the rest runs from RAM, slower.`)
        if (underReportedMemory(loaded.size, pulled.size)) lines.push(underReportLine(loaded.size, pulled.size))
      } else if (vram) {
        lines.push(pulled.size <= vram * 0.85 ? `Its weights (${gb(pulled.size)} GB) fit in video memory (${gb(vram)} GB) with room for context.` : pulled.size <= vram ? `Its weights (${gb(pulled.size)} GB) fit in video memory (${gb(vram)} GB) only with a small context.` : `Its weights (${gb(pulled.size)} GB) are larger than video memory (${gb(vram)} GB): it will run partly on CPU.`)
      }
      const { matching } = await turnsFor(client).catch(() => ({ matching: [] }))
      const last = [...matching].reverse().find((t) => t.model === pulled.name)
      if (last) {
        const share = cacheShare(last)
        lines.push(
          `Cache: ${client ? `"${client}"` : 'the last caller'} last reused ${share == null ? 'an unknown share' : `${Math.round(share * 100)}%`} of a ${last.prompt.tokens}-token prompt on this model` +
            (last.prefix && !last.prefix.identical && last.prefix.breakTokensEst != null ? `; the prefix stopped matching around token ${last.prefix.breakTokensEst}. Keep the first ${last.prefix.breakTokensEst} tokens identical and about that much is reused.` : '.'),
        )
      } else lines.push('Cache: no recorded turn on this model yet, so reuse cannot be estimated.')
      return lines.join('\n')
    },

    /** Where LLMxRay runs and what it holds. Read-only; nothing here can be changed through MCP. */
    async read_llmxray_status() {
      const [st, ver] = await Promise.all([
        getJson(`${base}/__observe/status`),
        getJson(`${ollama}/api/version`).catch(() => null),
      ])
      return [
        `LLMxRay at ${base}, started ${st.startedAt ? new Date(st.startedAt).toISOString().slice(0, 16) + 'Z' : '?'}.`,
        `Observe port ${st.port} on ${st.host}: ${st.listening ? 'listening' : `NOT listening${st.error ? ` (${st.error})` : ''}`}. Clients point at http://${st.host === '0.0.0.0' ? 'localhost' : st.host}:${st.port} instead of Ollama.`,
        `Forwards to Ollama at ${st.ollamaUrl}${ver?.version ? ` (version ${ver.version})` : ' (not reachable right now)'}.`,
        `Turns kept in memory: ${st.turns} of 500; older ones are dropped. Request text ${st.keepText ? `is kept on disk under ${st.textDir}` : 'is not kept'}, only the measurements.`,
        'Nothing here can be changed through MCP; settings are changed on the Live page.',
      ].join('\n')
    },

    async list_local_models() {
      const [tags, ps, info] = await Promise.all([
        getJson(`${ollama}/api/tags`),
        getJson(`${ollama}/api/ps`).catch(() => ({ models: [] })),
        getJson(`${base}/__system-info`).catch(() => null),
      ])
      const loaded = new Map((ps.models ?? []).map((m) => [m.name, m]))
      const vram = info?.gpu?.[0]?.adapterRamBytes || 0
      const lines = []
      if (info) {
        lines.push(
          `Machine: ${info.gpu?.map((g) => g.name).join(', ') || 'no GPU detected'}${vram ? `, ${gb(vram)} GB video memory` : ''}; ${gb(info.memory?.totalBytes || 0)} GB RAM.`,
        )
      }
      lines.push(`${tags.models.length} models pulled:`)
      for (const m of tags.models.sort((a, b) => a.name.localeCompare(b.name))) {
        const d = m.details ?? {}
        const l = loaded.get(m.name)
        const parts = [
          `${m.name}: ${gb(m.size)} GB on disk`,
          d.parameter_size ? `${d.parameter_size} parameters` : null,
          d.quantization_level ?? null,
          d.family ?? null,
        ].filter(Boolean)
        let fit = ''
        if (l) {
          const inVram = l.size ? l.size_vram / l.size : null
          fit = `  LOADED now${l.context_length ? ` with a ${l.context_length}-token context` : ''}${inVram == null ? '' : inVram >= 0.99 ? ', fully in VRAM' : `, ${Math.round(inVram * 100)}% in VRAM (the rest runs from RAM, slower)`}`
          if (underReportedMemory(l.size, m.size)) fit += ` ${underReportLine(l.size, m.size)}`
        } else if (vram) {
          fit = m.size <= vram * 0.85 ? '  fits in VRAM with room for context' : m.size <= vram ? '  fits in VRAM only with a small context' : '  larger than VRAM: will run partly on CPU'
        }
        lines.push(`- ${parts.join(', ')}.${fit}`)
      }
      return lines.join('\n')
    },
  }
}

/** What an agent should know when Ollama's loaded size cannot be true (ollama#19089). */
function underReportLine(reported, file) {
  return `Note: Ollama reports ${gb(reported)} GB in memory for it, less than its ${gb(file)} GB file, which cannot be true; this Ollama version under-reports memory on its llama.cpp runner (${UNDER_REPORT_ISSUE}). Treat the file size as the floor of what it occupies.`
}

function gb(bytes) {
  return (bytes / 1024 ** 3).toFixed(1)
}

/**
 * Every tool only reads: from the LLMxRay server's records and from Ollama's
 * listings. Nothing is written, started, stopped or sent anywhere, and calling
 * a tool twice gives the same answer for the same state. Clients that honour
 * annotations can therefore call them without asking the user first.
 */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

// Said in each of the four tools that read turns, so an agent reading any one of them sees the whole split.
const TURN_TOOLS =
  'Four tools read your turns, one question each: diagnose_my_turns, is anything wrong (a verdict over several turns); ' +
  'read_my_last_turn, what exactly happened on the latest turn (one turn in full); list_my_turns, what happened turn by turn ' +
  '(the sequence, one line each); compare_my_turns, did a change help (before against after).\n'

/** The server with its seven tools registered, not yet connected to a transport. Tests connect it in memory. */
export function buildServer({ serverUrl, ollamaUrl, fetchImpl }) {
  const tools = createTools({ serverUrl, ollamaUrl, ...(fetchImpl ? { fetchImpl } : {}) })
  const server = new McpServer({ name: 'llmxray', version: packageVersion() })

  server.registerTool(
    'diagnose_my_turns',
    {
      title: 'Diagnose my turns',
      description:
        'Is anything wrong with the Ollama calls your client sent through LLMxRay on port 11435? A verdict judged over several turns: a prompt rejected or silently cut by the context, the cache lost on every turn or on one turn, a model partly on CPU, tool schemas crowding the prompt.\n' +
        TURN_TOOLS +
        'Call it after a few turns, and again after a change. For which model or context fits use list_local_models.\n' +
        'Returns text. First one line per client seen, then one finding per line tagged [high], [medium] or [low], each ending with the fix. It says so when nothing stands out, and explains how to route through 11435 when no turn was seen.\n' +
        'client: your X-LLMxRay-Client name; without it on a shared machine you read every tool\'s turns. since_minutes: 1 to 10080, minutes since your change. They combine.\n' +
        'Needs LLMxRay running (npx llmxray) and says so if not. Under a second, from records already kept. No model is called.',
      inputSchema: {
        client: z.string().optional().describe('Part of the client label or id as LLMxRay shows it (for example "VS Code Copilot", "python-requests", or the X-LLMxRay-Client header you sent). Case-insensitive substring. Omit for all clients.'),
        since_minutes: z.number().int().positive().optional().describe('Only turns from the last N minutes. Omit for every turn LLMxRay has kept.'),
      },
      annotations: { ...READ_ONLY, title: 'Diagnose my turns' },
    },
    async (args) => guarded(() => tools.diagnose_my_turns(args)),
  )

  server.registerTool(
    'read_my_last_turn',
    {
      title: 'Read my last turn',
      description:
        'What exactly happened on your latest turn through LLMxRay, in numbers: prompt tokens and cached share, prefill time and speed, generated tokens and speed, stop reason, prompt make-up (system, tools, history, new message), context requested, VRAM fit, and where the prompt stopped matching the previous turn.\n' +
        TURN_TOOLS +
        'Use it to budget the next call. For what is installed and loaded use list_local_models.\n' +
        'Returns text, one fact per line. Explains how to route through 11435 when no turn was seen.\n' +
        'client: a substring of the label LLMxRay shows, which is the name you set in X-LLMxRay-Client. On a shared machine the latest turn may be another tool\'s, so pass your own name. Omit it when you are the only caller.\n' +
        'Needs LLMxRay running (npx llmxray) and says so if not. Under a second, from records already kept. No model is called.',
      inputSchema: {
        client: z.string().optional().describe('Part of the client label or id, case-insensitive substring. Omit for the latest turn from any client.'),
      },
      annotations: { ...READ_ONLY, title: 'Read my last turn' },
    },
    async (args) => guarded(() => tools.read_my_last_turn(args)),
  )

  server.registerTool(
    'list_local_models',
    {
      title: 'List local models',
      description:
        'Which models Ollama has pulled on this machine, with size, parameters and quantisation. Which are loaded now and with what context. How much of each sits in video memory, and whether each pulled model would fit.\n' +
        'Use it before choosing a model or a context length. It knows nothing about past calls. For those use diagnose_my_turns or read_my_last_turn.\n' +
        'Returns text. A machine line (GPU, video memory, RAM) when LLMxRay is running, then "N models pulled:" and one line per model, sorted by name, ending in LOADED now, fits in VRAM, or larger than VRAM.\n' +
        'Takes no arguments, no model name and no filter. Needs Ollama reachable. Under a second, two listing calls. No model is loaded. The answer is a snapshot: a loaded model unloads after its keep_alive, so call it right before deciding.',
      inputSchema: {},
      annotations: { ...READ_ONLY, title: 'List local models' },
    },
    async () => guarded(() => tools.list_local_models()),
  )

  server.registerTool(
    'list_my_turns',
    {
      title: 'List my turns',
      description:
        'What happened, turn by turn: the turns your client sent through LLMxRay on port 11435, newest last, one line each: turn number, time, client, model, prompt tokens with cached share, prefill ms, generation speed, stop reason, and flags (reloaded, rejected or cut by the context, error).\n' +
        TURN_TOOLS +
        'Use it to see the sequence behind a finding, or to find when a change took effect before calling compare_my_turns with that many minutes.\n' +
        'client: your X-LLMxRay-Client name; without it on a shared machine you read every tool\'s turns. since_minutes: 1 to 10080. limit: 1 to 100, default 20, the newest kept. The three combine.\n' +
        'Needs LLMxRay running (npx llmxray). Under a second. No model is called.',
      inputSchema: {
        client: z.string().optional().describe('Substring of the client label, case-insensitive. Omit for all clients.'),
        since_minutes: z.number().int().min(1).max(10080).optional().describe('Only turns from the last N minutes, 1 to 10080.'),
        limit: z.number().int().min(1).max(100).optional().describe('How many of the newest turns to show, 1 to 100. Default 20.'),
      },
      annotations: { ...READ_ONLY, title: 'List my turns' },
    },
    async (args) => guarded(() => tools.list_my_turns(args)),
  )

  server.registerTool(
    'compare_my_turns',
    {
      title: 'Compare my turns',
      description:
        'Did a change help? Medians of cached share, prefill time, generation speed and prompt size for the turns before and after a moment, with the difference and a one-line verdict on the cache.\n' +
        TURN_TOOLS +
        'Use it after you changed a system prompt, keep_alive, num_ctx or the tool list.\n' +
        'split_minutes_ago: 1 to 10080, default 60: turns older than that are "before", newer are "after"; set it to the minutes since your change. client: your X-LLMxRay-Client name, so another tool\'s turns do not mix in. Both sides need at least one turn, else it says what to move.\n' +
        'Needs LLMxRay running (npx llmxray). Under a second. No model is called.',
      inputSchema: {
        split_minutes_ago: z.number().int().min(1).max(10080).optional().describe('Minutes ago that separate before from after, 1 to 10080. Default 60.'),
        client: z.string().optional().describe('Substring of the client label, case-insensitive. Omit for all clients.'),
      },
      annotations: { ...READ_ONLY, title: 'Compare my turns' },
    },
    async (args) => guarded(() => tools.compare_my_turns(args)),
  )

  server.registerTool(
    'estimate_my_prompt',
    {
      title: 'Estimate my prompt',
      description:
        'Before sending a prompt of N tokens: whether it fits the context the model is loaded with and the headroom left for the answer. Also whether the model sits in video memory, and how much of the prompt the cache would reuse, from this client\'s last turn on that model.\n' +
        'Use it when a prompt grows, before raising num_ctx, or before switching model. For what is installed use list_local_models; for what actually happened use read_my_last_turn.\n' +
        'model: a pulled model name, "gemma4" or "gemma4:latest"; unknown names get the list of pulled ones. prompt_tokens: 1 to 2000000, your estimate of the prompt size. client: your X-LLMxRay-Client name, so the cache estimate uses your own last turn.\n' +
        'Needs Ollama reachable; the cache line needs LLMxRay running (npx llmxray). Under a second. No model is loaded or called.',
      inputSchema: {
        model: z.string().describe('A pulled model name, with or without the tag.'),
        prompt_tokens: z.number().int().min(1).max(2_000_000).describe('Size of the prompt you intend to send, in tokens, 1 to 2000000.'),
        client: z.string().optional().describe('Substring of the client label, for the cache estimate. Omit for the last caller.'),
      },
      annotations: { ...READ_ONLY, title: 'Estimate my prompt' },
    },
    async (args) => guarded(() => tools.estimate_my_prompt(args)),
  )

  server.registerTool(
    'read_llmxray_status',
    {
      title: 'Read LLMxRay status',
      description:
        'Where LLMxRay runs and what it holds: the observe port and whether it listens, the Ollama it forwards to and its version, how many turns are kept of the 500 it holds, whether request text is kept on disk, and when it started.\n' +
        'Use it first when diagnose_my_turns or read_my_last_turn answers that nothing was seen, or to confirm which Ollama your calls reach. Those tools read the turns; this one reads the server itself.\n' +
        'Takes no arguments. Nothing can be changed through MCP; settings live on the Live page. Needs LLMxRay running (npx llmxray); if it is not reachable the answer says so and names the URL tried. Under a second.',
      inputSchema: {},
      annotations: { ...READ_ONLY, title: 'Read LLMxRay status' },
    },
    async () => guarded(() => tools.read_llmxray_status()),
  )

  return server
}

export async function startMcpServer({ serverUrl, ollamaUrl }) {
  const server = buildServer({ serverUrl, ollamaUrl })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

function text(s) {
  return { content: [{ type: 'text', text: s }] }
}

/** A tool never surfaces a bare transport error: the sentence says what to start. */
async function guarded(run) {
  try {
    return text(await run())
  } catch (e) {
    return { content: [{ type: 'text', text: e.message }], isError: true }
  }
}
