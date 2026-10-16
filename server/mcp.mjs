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
import { computeFindings, summariseClients, cacheShare, renderFinding } from './findings.mjs'

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
        } else if (vram) {
          fit = m.size <= vram * 0.85 ? '  fits in VRAM with room for context' : m.size <= vram ? '  fits in VRAM only with a small context' : '  larger than VRAM: will run partly on CPU'
        }
        lines.push(`- ${parts.join(', ')}.${fit}`)
      }
      return lines.join('\n')
    },
  }
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

/** The server with its three tools registered, not yet connected to a transport. Tests connect it in memory. */
export function buildServer({ serverUrl, ollamaUrl, fetchImpl }) {
  const tools = createTools({ serverUrl, ollamaUrl, ...(fetchImpl ? { fetchImpl } : {}) })
  const server = new McpServer({ name: 'llmxray', version: packageVersion() })

  server.registerTool(
    'diagnose_my_turns',
    {
      title: 'Diagnose my turns',
      description:
        'What went wrong, if anything, in the Ollama calls your client sent through LLMxRay on port 11435, judged over several turns. It looks for a prompt rejected or silently cut by the context, the cache lost on every turn or on one turn, a model partly on CPU, and tool schemas crowding the prompt.\n' +
        'Call it after a few turns, and again after a change. For one turn in numbers use read_my_last_turn. For which model or context fits use list_local_models.\n' +
        'Returns text. First one line per client seen, then one finding per line tagged [high], [medium] or [low], each ending with the fix. It says so when nothing stands out, and explains how to route through 11435 when no turn was seen.\n' +
        'client: a substring of the label LLMxRay shows, which is the name you set in X-LLMxRay-Client. On a shared machine, without it you read every tool\'s turns. since_minutes: 1 to 10080, the minutes since your change, so older turns do not dilute the verdict. Omit it for every turn kept. The two combine.\n' +
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
        'The most recent turn seen through LLMxRay, as numbers: prompt tokens and cached share, prefill time and speed, generated tokens and speed, stop reason, prompt make-up (system, tools, history, new message), context requested, VRAM fit, and where the prompt stopped matching the previous turn.\n' +
        'Use it to budget the next call or to confirm a change helped. For a verdict across turns use diagnose_my_turns. For what is installed and loaded use list_local_models.\n' +
        'Returns text, one fact per line, starting "turn <n> at <time>  client: ...  model: ...". It explains how to route through 11435 when no turn was seen.\n' +
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
