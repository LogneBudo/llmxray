<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>See what your AI is actually doing.</strong></p>
<p align="center">
  Real-time token streaming, quality analysis, performance profiling, and cost tracking<br/>
  for local LLMs. No cloud. No API keys. No cost.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-local-000?logo=ollama&logoColor=white" alt="Ollama" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#screenshots">Screenshots</a> &bull;
  <a href="#who-is-this-for">Who Is This For</a> &bull;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/public/screenshots/demo.gif" alt="LLMxRay demo — real-time token streaming with confidence coloring" width="800" />
</p>

---

## Quick Start

**One command. 30 seconds.**

```bash
npx llmxray
```

Or with Docker:

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

Open **http://localhost:5174** and start chatting. That's it.

> **Prerequisite:** [Ollama](https://ollama.com/download) running locally with at least one model pulled (`ollama pull llama3.2`).

---

## Why LLMxRay?

You run a local LLM. You chat with it. But what actually happened?

- How fast was each token? Which ones was the model confident about?
- Is the response quality degrading over long conversations?
- What would this have cost if you ran it in the cloud?
- Is the model repeating itself? Refusing? Generating gibberish?
- How does temperature 0.3 compare to 0.9 on the *same* prompt?

**LLMxRay answers all of these, visually, in real time, for free.**

---

## Features

### Real-Time Chat with Token Intelligence
Chat with any Ollama model and watch tokens arrive with **confidence coloring** — each token is tinted based on generation speed. Supports markdown, multi-turn conversations, file attachments, vision models, and slash commands.

### Response Quality Gates
Every response is automatically analyzed. Colored badges appear only when something is wrong:
- **Repetition** — excessive repeated phrases (4-gram analysis)
- **Refusal** — "as an AI language model" and 7 other patterns
- **Gibberish** — high non-ASCII ratio
- **Empty** — fewer than 10 words
- **Truncation** — hit the token limit without finishing

### Model Comparison Workbench
Up to **4 slots** with independent model, temperature, and system prompt. Features include side-by-side streaming, word-level diff highlighting, metrics comparison, and one-click presets (Temperature Sweep, Deterministic Pair, Language Compare with Token Tax visualization).

### Performance Analytics
- **Latency percentiles** (P50/P95/P99) for duration and TTFT
- **Error intelligence** — 7-category classifier with timeline
- **Usage heatmap** — 7x24 grid of your active hours
- **Settings impact** — temperature vs tokens/sec scatter plots
- **Cold vs warm start** tracking with model load history

### Cost Dashboard
Token usage per model/day with estimated cloud-equivalent pricing. See what you're *saving* by running locally.

### Surgical Benchmark
Test model knowledge with multi-choice question suites. Uses real logprobs via OpenAI-compatible endpoint for accurate confidence measurement. Build custom suites visually or let AI generate them from a topic.

### Embeddings Lab & RAG Pipeline
Embed text, visualize vectors, measure cosine similarity. Build a local knowledge base from PDFs, DOCX, and CSV — chunked, embedded, and searchable. All stored in IndexedDB. Zero cost.

### Tool Workshop (Visual Canvas)
Drag-and-drop node canvas for building tool definitions. Bidirectional code sync (edit nodes or TypeScript — both update). Probe APIs, auto-generate schemas, test with live execution.

### Fill-in-the-Middle Playground *(new in v0.4.7)*
Code completion for Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder, and StarCoder. Two textareas (prefix / suffix), the model fills the gap. Uses Ollama's `suffix` field on `/api/generate`. Stitched preview shows the result as it would appear in your editor.

### Protocol Observatory *(new in v0.4.7)*
Fire the same prompt through Ollama's three serving protocols — **native** `/api/chat`, **OpenAI-compat** `/v1/chat/completions`, and **Anthropic-compat** `/v1/messages` — in parallel against your local model. Side-by-side streaming, per-protocol metrics, and an envelope-diff tab that shows how each protocol frames finish reasons, token counts, and error envelopes. No cloud, no API keys — all three endpoints are local on `localhost:11434`.

### AI Training Pipeline
Curate training data from your conversations. Tag, review, and export as JSONL for fine-tuning.

### Local AI History Database
Every experiment (benchmarks, comparisons, chats, training pairs) is automatically archived in a queryable IndexedDB database with filters, trends, exports, and retention policies.

### Multilingual
Full translations in English, French, Serbian (Latin + Cyrillic), Chinese, and Arabic. RTL layout support. Community scaffolds for Hebrew and Japanese.

---

## Ollama Compatibility

Tested and verified against **Ollama 0.24.0** (the current latest stable as of May 2026). LLMxRay uses these Ollama endpoints:

| Endpoint | Used for |
|---|---|
| `/api/chat` | Streaming chat (NDJSON, with `tools`, `think`, `format` schema) |
| `/api/generate` | Generation + Fill-in-the-Middle via `suffix` |
| `/api/tags`, `/api/show` | Model list + capability detection (`thinking`, `tools`, `vision`) |
| `/api/embed` | Vector embeddings for RAG |
| `/api/pull`, `/api/delete`, `/api/ps`, `/api/version` | Model management + status |
| `/v1/chat/completions` | OpenAI-compat path used by Surgical Benchmark for real logprobs |
| `/v1/messages` | Anthropic-compat path used by Protocol Observatory |

**Compatible with:** Ollama 0.20 and newer (older versions work for chat/generate but lack `think` and JSON-schema `format`). **Recommended:** Ollama 0.24+ for full feature parity including the Anthropic-compat endpoint (added in 0.23) and the `think: "max"` mode (added in 0.21.3).

---

## Screenshots

<table>
<tr>
<td width="50%">

**Chat with token streaming and confidence**
![Chat](docs/public/screenshots/chat-diagnostics.png)

</td>
<td width="50%">

**Model comparison — side by side**
![Compare](docs/public/screenshots/compare-sidebyside.png)

</td>
</tr>
<tr>
<td width="50%">

**Session deep dive — metrics and timing**
![Session](docs/public/screenshots/session-details.png)

</td>
<td width="50%">

**Benchmark with confidence radar**
![Benchmark](docs/public/screenshots/benchmark.png)

</td>
</tr>
<tr>
<td width="50%">

**Embeddings — cosine similarity**
![Embeddings](docs/public/screenshots/embed-similarity.png)

</td>
<td width="50%">

**System monitor — hardware and Ollama status**
![System](docs/public/screenshots/my-system.png)

</td>
</tr>
</table>

---

## Who Is This For

| You are... | LLMxRay helps you... |
|---|---|
| **Developer** | Debug prompts, profile latency, compare models, inspect tool calls, track costs |
| **Researcher** | Run controlled experiments with consistent settings across models and temperatures |
| **Student / Educator** | Explore model behavior visually — built-in Educators Kit with 9 interactive modules |
| **AI team lead** | Understand quality trends, error patterns, and resource usage across your local fleet |

---

## Install Options

### npx (recommended)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
```

### Docker
```bash
docker run -p 5174:5174 djovaneli/llmxray
docker run -p 5174:5174 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### From source
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3.5 + Composition API |
| Language | TypeScript 5.9 (strict) |
| Build | Vite 7.3 |
| Styling | Tailwind CSS 4.2 |
| State | Pinia 3 (store-per-concern) |
| Charts | Chart.js 4, D3.js 7 |
| Canvas | Vue Flow (visual node editor) |
| Code Editor | CodeMirror 6 |
| Storage | IndexedDB (browser-native) |
| LLM Backend | Ollama (local) |

---

## Architecture

**Streaming** — Reads Ollama NDJSON via `fetch()` + `ReadableStream`. Tokens update the UI reactively through Pinia stores.

**Token confidence** — Approximated from inter-token latency (faster = more confident). Clearly labeled as approximation. Benchmarks use real logprobs via OpenAI-compatible endpoint.

**Store-per-concern** — Each domain has its own Pinia store: tokens, sessions, metrics, reasoning, comparison, embeddings, quality, cost, and more.

**Hardware detection** — Custom Vite plugin queries the OS directly (PowerShell/proc/sysctl) for accurate hardware specs.

---

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Type-check + production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end (Playwright) |

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

**Community translations especially welcome** — scaffold files ready for Hebrew and Japanese.

---

## License

[Apache License 2.0](LICENSE)

## Trademark

**LLMxRay** is a trademark of Ivan Stankovic ([LogneBudo](https://github.com/LogneBudo)). See [TRADEMARK.md](TRADEMARK.md).

---

<p align="center">
  <strong>If LLMxRay helps you understand your AI better, consider giving it a star.</strong><br/>
  It helps others discover the project.
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
