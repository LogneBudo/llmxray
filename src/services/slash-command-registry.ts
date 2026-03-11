import type { SlashCommand } from '@/types/slash-command'
import { formatTps, formatNumber } from '@/utils/format'

const commands: SlashCommand[] = [
  // ── Chat & Conversation ──────────────────────────────────────────
  {
    name: 'help',
    description: 'Show all available commands',
    usage: '/help',
    category: 'chat',
    execute(_args, ctx) {
      const grouped = getCommandsByCategory()
      const lines: string[] = ['Available commands:\n']
      for (const [category, cmds] of Object.entries(grouped)) {
        lines.push(`**${category}**`)
        for (const c of cmds) {
          lines.push(`  ${c.usage}  —  ${c.description}`)
        }
        lines.push('')
      }
      ctx.showNotification(lines.join('\n'))
    },
  },
  {
    name: 'clear',
    description: 'Clear current conversation',
    usage: '/clear',
    category: 'chat',
    execute(_args, ctx) {
      ctx.clearConversation()
      ctx.showNotification('Conversation cleared.')
    },
  },
  {
    name: 'new',
    description: 'Start a new chat session',
    usage: '/new',
    category: 'chat',
    execute(_args, ctx) {
      ctx.newChat()
      ctx.showNotification('New chat started.')
    },
  },
  {
    name: 'summarize',
    description: 'Ask the model to summarize the conversation',
    usage: '/summarize',
    category: 'chat',
    execute(_args, ctx) {
      if (ctx.messages.length === 0) {
        ctx.showNotification('Nothing to summarize — conversation is empty.')
        return
      }
      ctx.sendAsUser('Please summarize our conversation so far in a concise way.')
    },
  },
  {
    name: 'save',
    description: 'Export conversation as JSON or text',
    usage: '/save [json|text]',
    category: 'chat',
    execute(args, ctx) {
      const format = args.trim() === 'text' ? 'text' : 'json'
      ctx.exportConversation(format)
      ctx.showNotification(`Conversation exported as ${format}.`)
    },
  },
  {
    name: 'copy',
    description: 'Copy last assistant response to clipboard',
    usage: '/copy',
    category: 'chat',
    execute(_args, ctx) {
      ctx.copyLastResponse()
    },
  },
  {
    name: 'history',
    description: 'Show recent conversations',
    usage: '/history',
    category: 'chat',
    execute(_args, ctx) {
      ctx.showNotification('Scroll down to the recent chats section, or start a /new chat.')
    },
  },

  // ── Model & Settings ─────────────────────────────────────────────
  {
    name: 'model',
    description: 'Switch model or list available models',
    usage: '/model [name]',
    category: 'settings',
    execute(args, ctx) {
      const name = args.trim()
      if (!name) {
        const list = ctx.availableModels.join(', ')
        ctx.showNotification(`Available models: ${list}\nCurrent: ${ctx.currentModel}`)
        return
      }
      const match = ctx.availableModels.find(
        (m) => m === name || m.startsWith(name),
      )
      if (match) {
        ctx.switchModel(match)
        ctx.showNotification(`Switched to ${match}.`)
      } else {
        ctx.showNotification(`Model "${name}" not found. Available: ${ctx.availableModels.join(', ')}`)
      }
    },
  },
  {
    name: 'system',
    description: 'Set the system prompt',
    usage: '/system <prompt>',
    category: 'settings',
    execute(args, ctx) {
      const prompt = args.trim()
      if (!prompt) {
        const current = ctx.chatSettings.value.systemPrompt || '(none)'
        ctx.showNotification(`Current system prompt: ${current}`)
        return
      }
      ctx.setSystemPrompt(prompt)
      ctx.showNotification('System prompt updated.')
    },
  },
  {
    name: 'temperature',
    description: 'Set temperature (0-2)',
    usage: '/temperature <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 0 || val > 2) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.temperature ?? 0.7}. Usage: /temperature 0.0-2.0`)
        return
      }
      ctx.setOption('temperature', val)
      ctx.showNotification(`Temperature set to ${val}.`)
    },
  },
  {
    name: 'top_p',
    description: 'Set top-p / nucleus sampling (0-1)',
    usage: '/top_p <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 0 || val > 1) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.top_p ?? 0.9}. Usage: /top_p 0.0-1.0`)
        return
      }
      ctx.setOption('top_p', val)
      ctx.showNotification(`Top-p set to ${val}.`)
    },
  },
  {
    name: 'top_k',
    description: 'Set top-k sampling (1-100)',
    usage: '/top_k <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (isNaN(val) || val < 1 || val > 100) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.top_k ?? 40}. Usage: /top_k 1-100`)
        return
      }
      ctx.setOption('top_k', val)
      ctx.showNotification(`Top-k set to ${val}.`)
    },
  },
  {
    name: 'context',
    description: 'Set context window size',
    usage: '/context <size>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      const valid = [2048, 4096, 8192, 16384, 32768, 65536, 131072]
      if (isNaN(val) || !valid.includes(val)) {
        ctx.showNotification(`Current: ${formatNumber(ctx.chatSettings.value.options.num_ctx ?? 4096)}. Valid sizes: ${valid.join(', ')}`)
        return
      }
      ctx.setOption('num_ctx', val)
      ctx.showNotification(`Context window set to ${formatNumber(val)}.`)
    },
  },
  {
    name: 'repeat_penalty',
    description: 'Set repeat penalty (1.0-2.0)',
    usage: '/repeat_penalty <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 1.0 || val > 2.0) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.repeat_penalty ?? 1.1}. Usage: /repeat_penalty 1.0-2.0`)
        return
      }
      ctx.setOption('repeat_penalty', val)
      ctx.showNotification(`Repeat penalty set to ${val}.`)
    },
  },
  {
    name: 'seed',
    description: 'Set seed for reproducibility (-1 for random)',
    usage: '/seed <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (isNaN(val)) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.seed ?? -1}. Usage: /seed <number>`)
        return
      }
      ctx.setOption('seed', val === -1 ? undefined : val)
      ctx.showNotification(val === -1 ? 'Seed set to random.' : `Seed set to ${val}.`)
    },
  },
  {
    name: 'stop',
    description: 'Set stop sequences (comma-separated)',
    usage: '/stop <sequences>',
    category: 'settings',
    execute(args, ctx) {
      const raw = args.trim()
      if (!raw) {
        const current = ctx.chatSettings.value.options.stop?.join(', ') || '(none)'
        ctx.showNotification(`Current stop sequences: ${current}`)
        return
      }
      const stops = raw.split(',').map((s) => s.trim()).filter(Boolean)
      ctx.setOption('stop', stops.length > 0 ? stops : undefined)
      ctx.showNotification(`Stop sequences set: ${stops.join(', ')}`)
    },
  },
  {
    name: 'mirostat',
    description: 'Set mirostat mode (0=off, 1=v1, 2=v2)',
    usage: '/mirostat <0|1|2>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (![0, 1, 2].includes(val)) {
        ctx.showNotification(`Current: ${ctx.chatSettings.value.options.mirostat ?? 0}. Usage: /mirostat 0|1|2`)
        return
      }
      ctx.setOption('mirostat', val)
      ctx.showNotification(val === 0 ? 'Mirostat disabled.' : `Mirostat v${val} enabled.`)
    },
  },
  {
    name: 'format',
    description: 'Toggle JSON output format',
    usage: '/format [json]',
    category: 'settings',
    execute(args, ctx) {
      const enable = args.trim().toLowerCase() === 'json'
      ctx.setJsonFormat(enable)
      ctx.showNotification(enable ? 'JSON format enabled.' : 'JSON format disabled.')
    },
  },
  {
    name: 'reset',
    description: 'Reset all settings to defaults',
    usage: '/reset',
    category: 'settings',
    execute(_args, ctx) {
      ctx.resetSettings()
      ctx.showNotification('All settings reset to defaults.')
    },
  },

  // ── Features & Navigation ────────────────────────────────────────
  {
    name: 'rag',
    description: 'Toggle RAG context on/off',
    usage: '/rag',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.toggleRag()
      ctx.showNotification(ctx.ragEnabled ? 'RAG context disabled.' : 'RAG context enabled.')
    },
  },
  {
    name: 'tools',
    description: 'Open tools settings panel',
    usage: '/tools',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.openSettings()
      ctx.showNotification('Settings panel opened.')
    },
  },
  {
    name: 'status',
    description: 'Show Ollama connection status and model info',
    usage: '/status',
    category: 'navigation',
    async execute(_args, ctx) {
      const info = await ctx.getOllamaStatus()
      ctx.showNotification(
        `Ollama: ${info.connected ? 'Connected' : 'Disconnected'}\nModel: ${info.model || '(none)'}`,
      )
    },
  },
  {
    name: 'tokens',
    description: 'Show token count for current session',
    usage: '/tokens',
    category: 'navigation',
    execute(_args, ctx) {
      const counts = ctx.getSessionTokenCount()
      if (!counts) {
        ctx.showNotification('No active session.')
        return
      }
      ctx.showNotification(
        `Prompt tokens: ${formatNumber(counts.prompt)}\nCompletion tokens: ${formatNumber(counts.completion)}\nTotal: ${formatNumber(counts.prompt + counts.completion)}`,
      )
    },
  },
  {
    name: 'speed',
    description: 'Show average generation speed across sessions',
    usage: '/speed',
    category: 'navigation',
    execute(_args, ctx) {
      const avg = ctx.getAverageSpeed()
      if (avg === null) {
        ctx.showNotification('No sessions recorded yet.')
        return
      }
      ctx.showNotification(`Average speed: ${formatTps(avg)}`)
    },
  },
  {
    name: 'compare',
    description: 'Navigate to the Compare page',
    usage: '/compare',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.navigate('/compare')
    },
  },
  {
    name: 'session',
    description: 'View current session details',
    usage: '/session',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.openSessionDetails()
    },
  },

  // ── Memory ──────────────────────────────────────────────────────
  {
    name: 'remember',
    description: 'Remember a fact about you across conversations',
    usage: '/remember <fact>',
    category: 'memory',
    execute(args, ctx) {
      const fact = args.trim()
      if (!fact) {
        ctx.showNotification('Usage: /remember <something to remember>\nExample: /remember I prefer TypeScript over JavaScript')
        return
      }
      ctx.addFact(fact)
      ctx.showNotification(`Remembered: "${fact}"`)
    },
  },
  {
    name: 'forget',
    description: 'Forget a previously remembered fact',
    usage: '/forget <search>',
    category: 'memory',
    execute(args, ctx) {
      const search = args.trim()
      if (!search) {
        ctx.showNotification('Usage: /forget <part of the fact to remove>\nExample: /forget TypeScript')
        return
      }
      const removed = ctx.removeFact(search)
      if (removed) {
        ctx.showNotification(`Forgot fact matching "${search}".`)
      } else {
        ctx.showNotification(`No fact found matching "${search}". Use /memories to see all facts.`)
      }
    },
  },
  {
    name: 'memories',
    description: 'Show all remembered facts',
    usage: '/memories',
    category: 'memory',
    execute(_args, ctx) {
      const facts = ctx.getFacts()
      if (facts.length === 0) {
        ctx.showNotification('No memories stored yet. Use /remember <fact> to add one.')
        return
      }
      const lines = facts.map((f, i) => `${i + 1}. ${f.content}`)
      ctx.showNotification(`Your memories (${facts.length}):\n${lines.join('\n')}`)
    },
  },
]

export function getMatchingCommands(prefix: string): SlashCommand[] {
  const lower = prefix.toLowerCase().replace(/^\//, '')
  if (!lower) return commands
  return commands.filter((c) => c.name.startsWith(lower))
}

export function findCommand(name: string): SlashCommand | undefined {
  return commands.find((c) => c.name === name.toLowerCase())
}

export function getCommandsByCategory(): Record<string, SlashCommand[]> {
  const grouped: Record<string, SlashCommand[]> = {}
  for (const cmd of commands) {
    const label =
      cmd.category === 'chat' ? 'Chat & Conversation'
        : cmd.category === 'settings' ? 'Model & Settings'
          : cmd.category === 'memory' ? 'Memory'
            : 'Features & Navigation'
    ;(grouped[label] ??= []).push(cmd)
  }
  return grouped
}

export function getAllCommands(): SlashCommand[] {
  return commands
}
