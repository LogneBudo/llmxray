#!/usr/bin/env node

import { startMcpServer } from '../server/mcp.mjs'

const args = process.argv.slice(2)

function getFlag(name) {
  const index = args.indexOf(name)
  if (index === -1 || index + 1 >= args.length) return undefined
  return args[index + 1]
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  LLMxRay MCP server — LLMxRay as tools for agents (stdio)

  Usage:
    npx -p llmxray llmxray-mcp [options]

  Options:
    --server-url <url>     Running LLMxRay server (default: http://localhost:5174, env: LLMXRAY_URL)
    --ollama-url <url>     Ollama instance (default: http://localhost:11434, env: OLLAMA_URL)
    -h, --help             Show this help message

  Tools: diagnose_my_turns, read_my_last_turn, list_my_turns, compare_my_turns, estimate_my_prompt, list_local_models, read_llmxray_status.
  Route your Ollama client through http://localhost:11435 so LLMxRay sees its turns.
`)
  process.exit(0)
}

startMcpServer({
  serverUrl: getFlag('--server-url') || process.env.LLMXRAY_URL || 'http://localhost:5174',
  ollamaUrl: getFlag('--ollama-url') || process.env.OLLAMA_URL || 'http://localhost:11434',
}).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
