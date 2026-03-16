# Installation

## Prerequisites

1. **Node.js 18+** — [Download](https://nodejs.org)
2. **Ollama** running locally — [Download](https://ollama.com/download)
3. At least one model pulled:

```bash
ollama pull llama3.2
```

::: tip Recommended first model
`llama3.2` is a great starting point — fast, capable, and small enough to run on most hardware. For reasoning features, also try `deepseek-r1`.
:::

## Install and Run

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. That's it.

## How the Proxy Works

LLMxRay's dev server automatically proxies API calls to Ollama:

| URL prefix | Proxied to |
|---|---|
| `/api/*` | `http://localhost:11434/api/*` |
| `/v1/*` | `http://localhost:11434/v1/*` |

If Ollama is running on a different port or machine, change the URL in **Settings > Connection**.

## Build for Production

```bash
npm run build    # Type-check + production build → dist/
npm run preview  # Preview the build locally
```

The `dist/` folder contains a static site you can serve from any web server.

## Verify Connection

After starting the app, look at the top-right corner of the header:

- **Green indicator** + "Connected" — Ollama is reachable
- **Red indicator** + "Disconnected" — Check that `ollama serve` is running

You can also go to **Settings** and click the connection test button.

## Pulling More Models

```bash
# Chat models
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1       # Reasoning model with <think> blocks

# Embedding models (for Knowledge Base and Embeddings Lab)
ollama pull nomic-embed-text
ollama pull all-minilm

# Vision models (for image attachments in chat)
ollama pull llava
```

LLMxRay automatically detects model capabilities (thinking, vision, embedding, tool-use) and adapts the UI accordingly.
