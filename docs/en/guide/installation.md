# Installation

## Prerequisites

1. **Ollama** running locally — [Download](https://ollama.com/download)
2. At least one model pulled:

```bash
ollama pull llama3.2
```

::: tip Recommended first model
`llama3.2` is a good starting point: fast, capable, small enough for most hardware. For reasoning features, also try `deepseek-r1`. For the Tool calls page, a model that supports tools, such as `qwen2.5` or `gemma4`.
:::

## One command

With Node.js 18 or newer:

```bash
npx llmxray
```

Open **http://localhost:5174**. The app, and the observe port on 11435 for the Live page, start together.

## Docker

```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
```

On Linux the container cannot reach Ollama through `host.docker.internal`; pass the daemon's address:

```bash
docker run -p 5174:5174 -p 11435:11435 -e OLLAMA_URL=http://172.17.0.1:11434 djovaneli/llmxray
```

Leave the `11435` mapping out if you do not need the Live page.

## Options

| Flag | Default | What it does |
|---|---|---|
| `--port <n>` | `5174` | The app's port (env `PORT`) |
| `--ollama-url <url>` | `http://localhost:11434` | Where Ollama is (env `OLLAMA_URL`) |
| `--observe-port <n>` | `11435` | The Live page's observe port (env `OBSERVE_PORT`) |
| `--no-observe` | | Do not open the observe port (env `OBSERVE=0`) |
| `--host <address>` | `127.0.0.1` | Interface to listen on (env `HOST`); `0.0.0.0` opens both ports to other machines on your network |

Both ports answer only this machine by default, because the Live log holds whatever your tools sent.

## Verify the connection

The top-right corner of the header shows a green dot and "Ollama connected" when the daemon is reachable, red when it is not. If it is red, check that `ollama serve` is running and that `--ollama-url` points at it. The URL can also be changed under **Settings > General**.

## From source

For development, or to change the code:

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies `/api/*` and `/v1/*` to Ollama and opens the same observe port.

```bash
npm run build    # type-check and production build into dist/
npm start        # the shipped server, as npx llmxray runs it
```

## Pulling more models

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1       # reasoning model with <think> blocks
ollama pull qwen2.5           # tool calling
ollama pull nomic-embed-text  # embeddings, for Knowledge Base and Embeddings
ollama pull llava             # vision, for image attachments in chat
```

LLMxRay reads each model's capabilities (thinking, vision, embedding, tools) from Ollama and adapts the pages accordingly.
