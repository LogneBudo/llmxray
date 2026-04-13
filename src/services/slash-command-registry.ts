import type { SlashCommand } from '@/types/slash-command'
import { formatTps, formatNumber } from '@/utils/format'

const N = 'dashboard.slashCommands.notifications'

const commands: SlashCommand[] = [
  // ── Chat & Conversation ──────────────────────────────────────────
  {
    name: 'help',
    descriptionKey: 'dashboard.slashCommands.descriptions.help',
    description: 'Show all available commands',
    usage: '/help',
    category: 'chat',
    execute(_args, ctx) {
      const grouped = getCommandsByCategory(ctx.t)
      const lines: string[] = [ctx.t(`${N}.helpHeader`)]
      for (const [category, cmds] of Object.entries(grouped)) {
        lines.push(`**${category}**`)
        for (const c of cmds) {
          const desc = c.descriptionKey ? ctx.t(c.descriptionKey) : c.description
          lines.push(`  ${c.usage}  —  ${desc}`)
        }
        lines.push('')
      }
      ctx.showNotification(lines.join('\n'))
    },
  },
  {
    name: 'clear',
    descriptionKey: 'dashboard.slashCommands.descriptions.clear',
    description: 'Clear current conversation',
    usage: '/clear',
    category: 'chat',
    execute(_args, ctx) {
      ctx.clearConversation()
      ctx.showNotification(ctx.t(`${N}.conversationCleared`))
    },
  },
  {
    name: 'new',
    descriptionKey: 'dashboard.slashCommands.descriptions.new',
    description: 'Start a new chat session',
    usage: '/new',
    category: 'chat',
    execute(_args, ctx) {
      ctx.newChat()
      ctx.showNotification(ctx.t(`${N}.newChatStarted`))
    },
  },
  {
    name: 'summarize',
    descriptionKey: 'dashboard.slashCommands.descriptions.summarize',
    description: 'Ask the model to summarize the conversation',
    usage: '/summarize',
    category: 'chat',
    execute(_args, ctx) {
      if (ctx.messages.length === 0) {
        ctx.showNotification(ctx.t(`${N}.nothingToSummarize`))
        return
      }
      ctx.sendAsUser('Please summarize our conversation so far in a concise way.')
    },
  },
  {
    name: 'save',
    descriptionKey: 'dashboard.slashCommands.descriptions.save',
    description: 'Export conversation as JSON or text',
    usage: '/save [json|text]',
    category: 'chat',
    execute(args, ctx) {
      const format = args.trim() === 'text' ? 'text' : 'json'
      ctx.exportConversation(format)
      ctx.showNotification(ctx.t(`${N}.conversationExported`, { format }))
    },
  },
  {
    name: 'copy',
    descriptionKey: 'dashboard.slashCommands.descriptions.copy',
    description: 'Copy last assistant response to clipboard',
    usage: '/copy',
    category: 'chat',
    execute(_args, ctx) {
      ctx.copyLastResponse()
    },
  },
  {
    name: 'history',
    descriptionKey: 'dashboard.slashCommands.descriptions.history',
    description: 'Show recent conversations',
    usage: '/history',
    category: 'chat',
    execute(_args, ctx) {
      ctx.showNotification(ctx.t(`${N}.historyHint`))
    },
  },

  // ── Model & Settings ─────────────────────────────────────────────
  {
    name: 'model',
    descriptionKey: 'dashboard.slashCommands.descriptions.model',
    description: 'Switch model or list available models',
    usage: '/model [name]',
    category: 'settings',
    execute(args, ctx) {
      const name = args.trim()
      if (!name) {
        const list = ctx.availableModels.join(', ')
        ctx.showNotification(ctx.t(`${N}.availableModels`, { list, current: ctx.currentModel }))
        return
      }
      const match = ctx.availableModels.find(
        (m) => m === name || m.startsWith(name),
      )
      if (match) {
        ctx.switchModel(match)
        ctx.showNotification(ctx.t(`${N}.switchedTo`, { model: match }))
      } else {
        ctx.showNotification(ctx.t(`${N}.modelNotFound`, { name, list: ctx.availableModels.join(', ') }))
      }
    },
  },
  {
    name: 'system',
    descriptionKey: 'dashboard.slashCommands.descriptions.system',
    description: 'Set the system prompt',
    usage: '/system <prompt>',
    category: 'settings',
    execute(args, ctx) {
      const prompt = args.trim()
      if (!prompt) {
        const current = ctx.chatSettings.value.systemPrompt || ctx.t(`${N}.none`)
        ctx.showNotification(ctx.t(`${N}.currentSystemPrompt`, { prompt: current }))
        return
      }
      ctx.setSystemPrompt(prompt)
      ctx.showNotification(ctx.t(`${N}.systemPromptUpdated`))
    },
  },
  {
    name: 'temperature',
    descriptionKey: 'dashboard.slashCommands.descriptions.temperature',
    description: 'Set temperature (0-2)',
    usage: '/temperature <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 0 || val > 2) {
        ctx.showNotification(ctx.t(`${N}.tempUsage`, { current: ctx.chatSettings.value.options.temperature ?? 0.7 }))
        return
      }
      ctx.setOption('temperature', val)
      ctx.showNotification(ctx.t(`${N}.temperatureSet`, { value: val }))
    },
  },
  {
    name: 'top_p',
    descriptionKey: 'dashboard.slashCommands.descriptions.top_p',
    description: 'Set top-p / nucleus sampling (0-1)',
    usage: '/top_p <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 0 || val > 1) {
        ctx.showNotification(ctx.t(`${N}.topPUsage`, { current: ctx.chatSettings.value.options.top_p ?? 0.9 }))
        return
      }
      ctx.setOption('top_p', val)
      ctx.showNotification(ctx.t(`${N}.topPSet`, { value: val }))
    },
  },
  {
    name: 'top_k',
    descriptionKey: 'dashboard.slashCommands.descriptions.top_k',
    description: 'Set top-k sampling (1-100)',
    usage: '/top_k <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (isNaN(val) || val < 1 || val > 100) {
        ctx.showNotification(ctx.t(`${N}.topKUsage`, { current: ctx.chatSettings.value.options.top_k ?? 40 }))
        return
      }
      ctx.setOption('top_k', val)
      ctx.showNotification(ctx.t(`${N}.topKSet`, { value: val }))
    },
  },
  {
    name: 'context',
    descriptionKey: 'dashboard.slashCommands.descriptions.context',
    description: 'Set context window size',
    usage: '/context <size>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      const valid = [2048, 4096, 8192, 16384, 32768, 65536, 131072]
      if (isNaN(val) || !valid.includes(val)) {
        ctx.showNotification(ctx.t(`${N}.contextUsage`, {
          current: formatNumber(ctx.chatSettings.value.options.num_ctx ?? 4096),
          sizes: valid.join(', '),
        }))
        return
      }
      ctx.setOption('num_ctx', val)
      ctx.showNotification(ctx.t(`${N}.contextSet`, { value: formatNumber(val) }))
    },
  },
  {
    name: 'repeat_penalty',
    descriptionKey: 'dashboard.slashCommands.descriptions.repeat_penalty',
    description: 'Set repeat penalty (1.0-2.0)',
    usage: '/repeat_penalty <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseFloat(args.trim())
      if (isNaN(val) || val < 1.0 || val > 2.0) {
        ctx.showNotification(ctx.t(`${N}.repeatPenaltyUsage`, { current: ctx.chatSettings.value.options.repeat_penalty ?? 1.1 }))
        return
      }
      ctx.setOption('repeat_penalty', val)
      ctx.showNotification(ctx.t(`${N}.repeatPenaltySet`, { value: val }))
    },
  },
  {
    name: 'seed',
    descriptionKey: 'dashboard.slashCommands.descriptions.seed',
    description: 'Set seed for reproducibility (-1 for random)',
    usage: '/seed <value>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (isNaN(val)) {
        ctx.showNotification(ctx.t(`${N}.seedUsage`, { current: ctx.chatSettings.value.options.seed ?? -1 }))
        return
      }
      ctx.setOption('seed', val === -1 ? undefined : val)
      ctx.showNotification(val === -1 ? ctx.t(`${N}.seedRandom`) : ctx.t(`${N}.seedSet`, { value: val }))
    },
  },
  {
    name: 'stop',
    descriptionKey: 'dashboard.slashCommands.descriptions.stop',
    description: 'Set stop sequences (comma-separated)',
    usage: '/stop <sequences>',
    category: 'settings',
    execute(args, ctx) {
      const raw = args.trim()
      if (!raw) {
        const current = ctx.chatSettings.value.options.stop?.join(', ') || ctx.t(`${N}.none`)
        ctx.showNotification(ctx.t(`${N}.stopCurrent`, { sequences: current }))
        return
      }
      const stops = raw.split(',').map((s) => s.trim()).filter(Boolean)
      ctx.setOption('stop', stops.length > 0 ? stops : undefined)
      ctx.showNotification(ctx.t(`${N}.stopSet`, { sequences: stops.join(', ') }))
    },
  },
  {
    name: 'mirostat',
    descriptionKey: 'dashboard.slashCommands.descriptions.mirostat',
    description: 'Set mirostat mode (0=off, 1=v1, 2=v2)',
    usage: '/mirostat <0|1|2>',
    category: 'settings',
    execute(args, ctx) {
      const val = parseInt(args.trim(), 10)
      if (![0, 1, 2].includes(val)) {
        ctx.showNotification(ctx.t(`${N}.mirostatUsage`, { current: ctx.chatSettings.value.options.mirostat ?? 0 }))
        return
      }
      ctx.setOption('mirostat', val)
      ctx.showNotification(val === 0 ? ctx.t(`${N}.mirostatDisabled`) : ctx.t(`${N}.mirostatEnabled`, { version: val }))
    },
  },
  {
    name: 'format',
    descriptionKey: 'dashboard.slashCommands.descriptions.format',
    description: 'Toggle JSON output format',
    usage: '/format [json]',
    category: 'settings',
    execute(args, ctx) {
      const enable = args.trim().toLowerCase() === 'json'
      ctx.setJsonFormat(enable)
      ctx.showNotification(enable ? ctx.t(`${N}.jsonFormatEnabled`) : ctx.t(`${N}.jsonFormatDisabled`))
    },
  },
  {
    name: 'reset',
    descriptionKey: 'dashboard.slashCommands.descriptions.reset',
    description: 'Reset all settings to defaults',
    usage: '/reset',
    category: 'settings',
    execute(_args, ctx) {
      ctx.resetSettings()
      ctx.showNotification(ctx.t(`${N}.settingsReset`))
    },
  },

  // ── Features & Navigation ────────────────────────────────────────
  {
    name: 'rag',
    descriptionKey: 'dashboard.slashCommands.descriptions.rag',
    description: 'Toggle RAG context on/off',
    usage: '/rag',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.toggleRag()
      ctx.showNotification(ctx.ragEnabled ? ctx.t(`${N}.ragDisabled`) : ctx.t(`${N}.ragEnabled`))
    },
  },
  {
    name: 'tools',
    descriptionKey: 'dashboard.slashCommands.descriptions.tools',
    description: 'Open tools settings panel',
    usage: '/tools',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.openSettings()
      ctx.showNotification(ctx.t(`${N}.settingsPanelOpened`))
    },
  },
  {
    name: 'status',
    descriptionKey: 'dashboard.slashCommands.descriptions.status',
    description: 'Show Ollama connection status and model info',
    usage: '/status',
    category: 'navigation',
    async execute(_args, ctx) {
      const info = await ctx.getOllamaStatus()
      const statusLabel = info.connected ? ctx.t(`${N}.ollamaConnected`) : ctx.t(`${N}.ollamaDisconnected`)
      ctx.showNotification(ctx.t(`${N}.ollamaStatus`, { status: statusLabel, model: info.model || ctx.t(`${N}.none`) }))
    },
  },
  {
    name: 'tokens',
    descriptionKey: 'dashboard.slashCommands.descriptions.tokens',
    description: 'Show token count for current session',
    usage: '/tokens',
    category: 'navigation',
    execute(_args, ctx) {
      const counts = ctx.getSessionTokenCount()
      if (!counts) {
        ctx.showNotification(ctx.t(`${N}.noActiveSession`))
        return
      }
      ctx.showNotification(ctx.t(`${N}.tokenCounts`, {
        prompt: formatNumber(counts.prompt),
        completion: formatNumber(counts.completion),
        total: formatNumber(counts.prompt + counts.completion),
      }))
    },
  },
  {
    name: 'speed',
    descriptionKey: 'dashboard.slashCommands.descriptions.speed',
    description: 'Show average generation speed across sessions',
    usage: '/speed',
    category: 'navigation',
    execute(_args, ctx) {
      const avg = ctx.getAverageSpeed()
      if (avg === null) {
        ctx.showNotification(ctx.t(`${N}.noSessionsRecorded`))
        return
      }
      ctx.showNotification(ctx.t(`${N}.averageSpeed`, { speed: formatTps(avg) }))
    },
  },
  {
    name: 'compare',
    descriptionKey: 'dashboard.slashCommands.descriptions.compare',
    description: 'Navigate to the Compare page',
    usage: '/compare',
    category: 'navigation',
    execute(_args, ctx) {
      ctx.navigate('/compare')
    },
  },
  {
    name: 'session',
    descriptionKey: 'dashboard.slashCommands.descriptions.session',
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
    descriptionKey: 'dashboard.slashCommands.descriptions.remember',
    description: 'Remember a fact about you across conversations',
    usage: '/remember <fact>',
    category: 'memory',
    execute(args, ctx) {
      const fact = args.trim()
      if (!fact) {
        ctx.showNotification(ctx.t(`${N}.rememberUsage`))
        return
      }
      ctx.addFact(fact)
      ctx.showNotification(ctx.t(`${N}.remembered`, { fact }))
    },
  },
  {
    name: 'forget',
    descriptionKey: 'dashboard.slashCommands.descriptions.forget',
    description: 'Forget a previously remembered fact',
    usage: '/forget <search>',
    category: 'memory',
    execute(args, ctx) {
      const search = args.trim()
      if (!search) {
        ctx.showNotification(ctx.t(`${N}.forgetUsage`))
        return
      }
      const removed = ctx.removeFact(search)
      if (removed) {
        ctx.showNotification(ctx.t(`${N}.forgot`, { search }))
      } else {
        ctx.showNotification(ctx.t(`${N}.factNotFound`, { search }))
      }
    },
  },
  {
    name: 'memories',
    descriptionKey: 'dashboard.slashCommands.descriptions.memories',
    description: 'Show all remembered facts',
    usage: '/memories',
    category: 'memory',
    execute(_args, ctx) {
      const facts = ctx.getFacts()
      if (facts.length === 0) {
        ctx.showNotification(ctx.t(`${N}.noMemories`))
        return
      }
      const lines = facts.map((f, i) => `${i + 1}. ${f.content}`)
      ctx.showNotification(ctx.t(`${N}.yourMemories`, { count: facts.length, list: lines.join('\n') }))
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

/**
 * Group commands by category. When `t` is provided, category labels are
 * localized; otherwise the English fallback labels are used (e.g. for tests
 * or contexts without an i18n binding).
 */
export function getCommandsByCategory(
  t?: (key: string) => string,
): Record<string, SlashCommand[]> {
  const grouped: Record<string, SlashCommand[]> = {}
  for (const cmd of commands) {
    let label: string
    if (t) {
      label =
        cmd.category === 'chat' ? t('dashboard.slashCommands.chatConversation')
          : cmd.category === 'settings' ? t('dashboard.slashCommands.modelSettings')
            : cmd.category === 'memory' ? t('dashboard.slashCommands.memory')
              : t('dashboard.slashCommands.featuresNavigation')
    } else {
      label =
        cmd.category === 'chat' ? 'Chat & Conversation'
          : cmd.category === 'settings' ? 'Model & Settings'
            : cmd.category === 'memory' ? 'Memory'
              : 'Features & Navigation'
    }
    ;(grouped[label] ??= []).push(cmd)
  }
  return grouped
}

export function getAllCommands(): SlashCommand[] {
  return commands
}
