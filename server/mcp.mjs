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
  'and forwards everything; LLMxRay only records what passes. Then call this tool again.'

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
    if (t.toolsOffered) lines.push(`tools offered: ${t.toolsOffered}${t.toolCalls.length ? `, called: ${t.toolCalls.join(', ')}` : ', none called'}`)
    if (t.fit) lines.push(`model fit: context ${t.fit.contextLength ?? '?'}, ${t.fit.cpuShare == null ? 'VRAM share unknown' : `${Math.round((1 - t.fit.cpuShare) * 100)}% in VRAM`}${t.fit.runner ? `, runner ${t.fit.runner}` : ''}`)
    if (t.prefix && !t.prefix.identical) lines.push(`prefix: stopped matching the previous turn at ${Math.round(t.prefix.breakShare * 100)}% of the prompt${t.prefix.breakTokensEst != null ? ` (about token ${t.prefix.breakTokensEst})` : ''}`)
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

    async last_turn_metrics({ client } = {}) {
      const { matching: turns, seen } = await turnsFor(client)
      if (!turns.length) return nothingFor(client, seen)
      return describeTurn(turns[turns.length - 1])
    },

    async local_models() {
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

export async function startMcpServer({ serverUrl, ollamaUrl }) {
  const tools = createTools({ serverUrl, ollamaUrl })
  const server = new McpServer({ name: 'llmxray', version: packageVersion() })

  server.registerTool(
    'diagnose_my_turns',
    {
      title: 'Diagnose my turns',
      description:
        'What went wrong, if anything, with the calls your Ollama client sent through LLMxRay (port 11435): ' +
        'prompts rejected for exceeding the loaded context, prompt-cache lost on every turn or on one turn, a model running partly on CPU, ' +
        'tool schemas crowding the prompt. Each finding is a plain sentence with the fix. Call it after a few turns; ' +
        'optionally narrow to your client label and a time window.',
      inputSchema: {
        client: z.string().optional().describe('Part of the client label or id as LLMxRay shows it (for example "VS Code Copilot", "python-requests"). Omit for all clients.'),
        since_minutes: z.number().int().positive().optional().describe('Only turns from the last N minutes.'),
      },
    },
    async (args) => guarded(() => tools.diagnose_my_turns(args)),
  )

  server.registerTool(
    'last_turn_metrics',
    {
      title: 'Last turn metrics',
      description:
        'The most recent turn seen through LLMxRay, in numbers: prompt tokens and how many came from cache, prefill time and speed, ' +
        'generated tokens and speed, why generation stopped, what the prompt was made of, whether the model fit in video memory. ' +
        'Use it to budget your next call or to confirm a change helped.',
      inputSchema: {
        client: z.string().optional().describe('Part of the client label or id. Omit for the latest turn from any client.'),
      },
    },
    async (args) => guarded(() => tools.last_turn_metrics(args)),
  )

  server.registerTool(
    'local_models',
    {
      title: 'Local models',
      description:
        'Which models Ollama has on this machine, their size, parameters and quantisation, which are loaded now and with what context, ' +
        'and whether each fits in video memory. Use it before choosing a model or a context length.',
      inputSchema: {},
    },
    async () => guarded(() => tools.local_models()),
  )

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
