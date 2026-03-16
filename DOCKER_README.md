# LLMxRay

**Local LLM Observatory** — See what your AI is actually doing, token by token, layer by layer.

No cloud. No API keys. No cost. Everything runs on your hardware.

## Quick Start

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

Open **http://localhost:5174** in your browser. Make sure [Ollama](https://ollama.com) is running on your machine.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama instance URL |
| `PORT` | `5174` | Port to serve on |

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

## Features

- Real-time token streaming with confidence coloring
- Model comparison (up to 4 slots side by side)
- Surgical Benchmark with real logprobs
- RAG pipeline with local document search
- Visual Tool Workshop with bidirectional code sync
- System monitor with hardware detection
- Dark and light mode

## Links

- **Website**: [lognebudo.github.io/llmxray](https://lognebudo.github.io/llmxray/)
- **Documentation**: [lognebudo.github.io/llmxray/docs/en/](https://lognebudo.github.io/llmxray/docs/en/)
- **GitHub**: [github.com/LogneBudo/llmxray](https://github.com/LogneBudo/llmxray)
- **npm**: [npmjs.com/package/llmxray](https://www.npmjs.com/package/llmxray)

## License

Apache 2.0 — Copyright 2026 Ivan Stankovic ([LogneBudo](https://github.com/LogneBudo))
