# LLMxRay

**If LLMxRay helps you understand your AI better, [consider giving it a star on GitHub](https://github.com/LogneBudo/llmxray).**

**Local LLM Observatory** — See what your AI is actually doing, token by token, layer by layer.

No cloud. No API keys. No cost. Everything runs on your hardware.

![LLMxRay: a chat turn streaming token by token, each token coloured by confidence, then the session metrics](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/demo.gif)

## Quick Start

```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
```

Open **http://localhost:5174** in your browser. Make sure [Ollama](https://ollama.com) is running on your machine.

The second port is the **Live** page's observe port: point any other tool (VS Code Copilot, Open WebUI, Continue, n8n, your own scripts) at `http://localhost:11435` instead of Ollama and its traffic shows up on the Live page. Leave the mapping out if you do not need it. A published port is reachable from other machines on your network, so the Live page can run full-screen on a second screen while the agents work; bind it to `127.0.0.1:5174:5174` if you do not want that.

An agent that sends its calls through 11435 can also ask LLMxRay what went wrong with them: the image ships `llmxray-mcp`, a read-only MCP server (`docker exec -i <container> node bin/mcp.mjs`, or `npx -y -p llmxray llmxray-mcp` on the host with `LLMXRAY_URL` pointing at this container). See "For agents" in the main README.

![Live: turns from two clients, how much of each prompt came from the cache, and where it broke](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama instance URL |
| `PORT` | `5174` | Port to serve on |
| `OBSERVE_PORT` | `11435` | Port other tools point at to appear on the Live page |
| `OBSERVE` | `1` | Set to `0` to not open the observe port |

### Custom Ollama URL

```bash
docker run -p 5174:5174 -e OLLAMA_URL=http://192.168.1.50:11434 djovaneli/llmxray
```

### Custom port

```bash
docker run -p 3000:3000 -e PORT=3000 djovaneli/llmxray
```

## Docker Compose

### Standalone (Ollama running on your host)

```yaml
services:
  llmxray:
    image: djovaneli/llmxray
    ports:
      - "5174:5174"
      - "11435:11435"
    environment:
      - OLLAMA_URL=http://host.docker.internal:11434
```

### With Ollama as a sibling container

```yaml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

  llmxray:
    image: djovaneli/llmxray
    ports:
      - "5174:5174"
      - "11435:11435"
    environment:
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - ollama

volumes:
  ollama-data:
```

## Linux Note

On Linux, `host.docker.internal` may not resolve by default. Either:
- Use the Docker Compose example above with Ollama as a sibling container
- Add `--add-host=host.docker.internal:host-gateway` to your `docker run` command

## What you get

- **Prompt X-ray**: each turn's prompt drawn to scale, showing what was already cached, what was read again, and what Ollama silently cut when the prompt outgrew the context, system prompt included
- **Shared box**: why Ollama is slow right now and which tool did it, in seconds, with the setting to change (a `keep_alive: 0` that unloads the model after every run, a 128K context on 4K prompts)
- **GPU map**: what is in video memory, model by model, and which pulled models would fit
- **Tool calls**: thirteen request shapes agents send, scored per model on what the daemon returned
- **Live**: what your other tools send to Ollama, turn by turn, and where their prompts break the cache
- **Chat** rendered as Markdown while it streams, every token coloured by confidence
- **Cache Lab**: find the value that defeats the prompt cache and measure the fix on your own daemon
- **Compare**: up to four slots side by side, with a word-level diff
- **Surgical Benchmark** on real token logprobs
- **Decision Lab** for Ollama's decision models, probabilities drawn as bars
- **Protocol Observatory**: native, OpenAI-compatible and Anthropic-compatible paths side by side, reasoning included
- **Knowledge Base** and embeddings, all in the browser's IndexedDB
- **Code Completion**, **Tool Workshop**, costs, analytics, system monitor
- Five languages, dark and light mode

![Cache Lab: the timestamp that breaks the cache, and the measured difference](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

## Links

- **Website**: [lognebudo.github.io/llmxray](https://lognebudo.github.io/llmxray/)
- **Documentation**: [lognebudo.github.io/llmxray/docs/en/](https://lognebudo.github.io/llmxray/docs/en/)
- **GitHub**: [github.com/LogneBudo/llmxray](https://github.com/LogneBudo/llmxray)
- **npm**: [npmjs.com/package/llmxray](https://www.npmjs.com/package/llmxray)

## License

Apache 2.0 — Copyright 2026 Ivan Stankovic ([LogneBudo](https://github.com/LogneBudo))
