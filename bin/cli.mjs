#!/usr/bin/env node

import { startServer, closeOnSignal } from '../server/index.mjs'

const args = process.argv.slice(2)

function getFlag(name) {
  const index = args.indexOf(name)
  if (index === -1 || index + 1 >= args.length) return undefined
  return args[index + 1]
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  LLMxRay — Local LLM Observatory

  Usage:
    npx llmxray [options]

  Options:
    --port <number>        Port to serve on (default: 5174, env: PORT)
    --ollama-url <url>     Ollama instance URL (default: http://localhost:11434, env: OLLAMA_URL)
    --observe-port <n>     Port other tools point at to appear on the Live page
                           (default: 11435, env: OBSERVE_PORT)
    --no-observe           Do not open the observe port (env: OBSERVE=0)
    --host <address>       Interface to listen on (default: 127.0.0.1, env: HOST);
                           0.0.0.0 opens both ports to other machines on your network
    -h, --help             Show this help message

  Examples:
    npx llmxray
    npx llmxray --port 3000
    npx llmxray --ollama-url http://192.168.1.50:11434
    npx llmxray --observe-port 11500
    OLLAMA_URL=http://myserver:11434 npx llmxray
`)
  process.exit(0)
}

startServer({
  port: getFlag('--port'),
  ollamaUrl: getFlag('--ollama-url'),
  observePort: getFlag('--observe-port'),
  observe: !args.includes('--no-observe'),
  host: getFlag('--host'),
}).then((running) => closeOnSignal(running)).catch((e) => {
  console.error(`Error: ${e.message}`)
  process.exit(1)
})
