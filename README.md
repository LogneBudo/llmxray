<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Local LLM Observatory</strong></p>
<p align="center">
  See what your AI is <em>actually</em> doing &mdash; token by token, layer by layer.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3.5" />
  <img src="https://img.shields.io/badge/vite-7.3-646cff?logo=vite&logoColor=white" alt="Vite 7.3" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/tailwind-4.2-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind 4.2" />
  <img src="https://img.shields.io/badge/ollama-local-000?logo=ollama&logoColor=white" alt="Ollama" />
</p>

---

## What is LLMxRay?

LLMxRay is a **free, local-first** dashboard that connects to [Ollama](https://ollama.com) running on your machine. It lets you chat with any model you've downloaded and then **inspect everything that happened behind the scenes**: how fast each token arrived, what the model might have been "thinking", how different settings change the output, and much more.

**No cloud. No API keys. No cost.** Everything runs on your hardware.

### Who is this for?

| You are... | LLMxRay helps you... |
|---|---|
| **Curious beginner** | See AI responses form in real-time and learn what "temperature" or "tokens" actually mean |
| **Student / educator** | Explore model behavior visually &mdash; great for AI/ML coursework and demos |
| **Developer** | Debug prompts, compare models, profile latency, inspect tool calls |
| **Researcher** | Run controlled experiments: same prompt, different settings, side-by-side results |

---

## Features at a Glance

### Chat with Real-Time Token Streaming
Start a conversation with any Ollama model. Watch tokens appear one by one with **confidence coloring** &mdash; each token is tinted based on how quickly the model produced it (faster = more confident). Supports markdown rendering, multi-turn conversation, file attachments, and slash commands.

### Session Deep Dive
Click any past session to explore six tabs of detail:

- **Stream** &mdash; Every token with timing data, plus a metrics dashboard (time-to-first-token, tokens/sec, latency chart)
- **Reasoning** &mdash; If you're running a reasoning model like DeepSeek-R1, the `<think>` blocks are parsed and displayed step-by-step
- **Introspection** &mdash; Visualizations of layer activations, attention heatmaps, and model architecture (illustrative)
- **Tools** &mdash; Timeline of any tool calls the model made, with parameters and results
- **Agent** &mdash; State-flow graph showing how an agent-style prompt progressed
- **Prompt** &mdash; Anatomy breakdown of your prompt: sections, token counts, structure

### Compare Models (and Settings)
The comparison workbench goes beyond "Model A vs Model B". Create up to **4 slots**, each with its own model, temperature, system prompt, and sampling parameters. Compare the *same* model at different temperatures to see how creativity changes. Features include:

- **Grid view** &mdash; Side-by-side streaming results with per-slot settings pills
- **Diff view** &mdash; Word-level highlighting of what changed between two outputs
- **Metrics bar** &mdash; Visual comparison of TTFT, tokens/sec, and total tokens
- **Quick presets** &mdash; "Temperature Sweep" (3 temps) and "Deterministic Pair" (same seed) one-click setups
- Embedding models are automatically filtered out &mdash; only chat-capable models appear

### Embeddings Lab
Embed any text and visualize the resulting vector. Compare two texts with a **cosine similarity meter** to see how semantically close they are. A hands-on way to understand what embeddings actually represent.

### RAG Pipeline
Build a local knowledge base from your documents:

1. **Upload** PDFs, Word docs (.docx), or CSVs
2. **Chunk & embed** automatically using your chosen embedding model
3. **Search** with natural language &mdash; results ranked by semantic similarity

Everything is stored in **IndexedDB** (your browser's built-in database). Zero cost, zero setup, zero external services.

### Tool Workshop (Visual Canvas)
Build, edit, and test tool definitions on an interactive **node-based canvas** powered by Vue Flow:

- **Drag-and-drop nodes** &mdash; Each tool is a visual node showing name, description, parameters, and implementation body
- **Inline code editing** &mdash; Full CodeMirror 6 editors with TypeScript syntax highlighting directly on each node
- **Bidirectional code sync** &mdash; Open the Code Panel to see all tools as combined TypeScript source. Edit code, nodes update. Edit nodes, code updates. Powered by a Recast AST parser
- **Schema viewer** &mdash; Auto-generated OpenAI-compatible JSON schemas with one-click copy
- **Probe & Pick** &mdash; Point at any API URL, inspect the response JSON tree, and auto-generate fetch code + parameter mappings
- **OpenAPI discovery** &mdash; Auto-detect and parse OpenAPI/Swagger specs to pick endpoints visually
- **Live execution overlays** &mdash; During chat, tool nodes pulse when the model calls them and show results inline
- **Templates** &mdash; Start from 15+ built-in templates (web fetch, calculator, Google Calendar/Gmail, regex tester, and more)
- **Persistent layout** &mdash; Node positions, mappings, and probe configs survive across sessions

### Tool Call Optimizer
When the model calls a tool during chat, an **"Optimize this Tool"** button appears on the result. Click it to open the Response Optimizer Drawer:

- Visualize the API response as an interactive JSON tree
- Select only the fields the model actually needs
- Auto-generate optimized fetch code with field extraction
- One click to create a new optimized tool in the Workshop

### Model Browser
See every model installed in Ollama with details like parameter count, quantization level, family, and format. Includes architecture diagrams showing the model's structure.

### System Monitor
Real hardware specs (not browser estimates) &mdash; CPU model, total RAM with live usage, GPU with driver version, storage. Plus live Ollama status: running models, memory allocation, inference settings.

### Settings
Configure your Ollama connection URL with a live connection tester. Set default **temperature** and **context length** with visual scales and educational tooltips that explain what each setting does in plain language.

---

## Quick Start

### Prerequisites

1. **Node.js 18+** &mdash; [Download](https://nodejs.org)
2. **Ollama** running locally &mdash; [Download](https://ollama.com/download)
3. At least one model pulled:
   ```bash
   ollama pull llama3.2
   ```

### Install and Run

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. That's it.

> LLMxRay's dev server automatically proxies API calls to Ollama at `localhost:11434`. If Ollama is running on a different port or machine, change it in **Settings**.

### Build for Production

```bash
npm run build    # Output in dist/
npm run preview  # Preview the build locally
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3.5 + Composition API (`<script setup>`) |
| Language | TypeScript 5.9 (strict) |
| Build | Vite 7.3 |
| Styling | Tailwind CSS 4.2 (custom dark theme) |
| State | Pinia 3 (one store per concern) |
| Routing | Vue Router 5 |
| Charts | Chart.js 4 + vue-chartjs, D3.js 7 |
| Canvas | Vue Flow 1.x (node-based visual editor) |
| Code Editor | CodeMirror 6 (TypeScript + JSON highlighting) |
| AST Parser | Recast + @babel/parser (bidirectional code sync) |
| Markdown | marked |
| Diffing | diff (word-level) |
| Documents | pdfjs-dist (lazy), mammoth (DOCX), papaparse (CSV) |
| Storage | IndexedDB (browser-native, zero-cost) |
| IDs | nanoid |
| LLM Backend | Ollama (local, via `/api` proxy) |

---

## Architecture Highlights

**Streaming** &mdash; LLMxRay reads Ollama's NDJSON response streams via `fetch()` + `ReadableStream`. Tokens arrive one by one and update the UI reactively through Pinia stores.

**Token confidence** &mdash; Ollama doesn't expose logprobs, so confidence is approximated from inter-token latency. Faster tokens = higher confidence. This is labeled clearly in the UI as an approximation.

**Introspection data** &mdash; Layer activations and attention heatmaps are synthetic (illustrative). They demonstrate what these visualizations *would* look like with real data. Clearly labeled as "Illustrative" in the UI.

**Store-per-concern** &mdash; Each domain has its own Pinia store: tokens, sessions, metrics, reasoning, comparison, embeddings, RAG, models, and more. This keeps state management modular and testable.

**Hardware detection** &mdash; The System page uses a custom Vite plugin (`vite-plugin-system-info.ts`) that queries the OS directly via PowerShell (Windows), `/proc` + `lspci` (Linux), or `sysctl` (macOS) for accurate hardware specs.

---

## Development

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:e2e:headed` | E2E with visible browser |
| `npm run test:e2e:live` | E2E against live Ollama |

### Project Structure

```
src/
  pages/            8 page components (Dashboard, Compare, RAG, etc.)
  components/       50+ components organized by feature
    chat/           Chat UI, token stream, attachments
    comparison/     Slot configurator, grid, diff view, metrics bar
    metrics/        Dashboard, charts, session history
    reasoning/      Think-block viewer
    introspection/  Layer activations, attention, architecture
    rag/            Document upload, search, ingest
    embeddings/     Vector viz, similarity meter
    tool-canvas/    Visual canvas, node editor, CodeMirror wrapper
    tool-optimizer/ Response optimizer drawer, JSON tree
    tool-calls/     Tool call timeline, definitions
    agent-graph/    Agent state flow
    common/         Layout, sidebar, shared components
  stores/           Pinia stores (one per concern)
  services/         Ollama client, streaming, generation, RAG, AST parser, probe
  types/            TypeScript interfaces
  utils/            Formatting, color scales, slot labels
  composables/      Vue composables (markdown, etc.)
  router/           Route definitions
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Disconnected" in Settings | Make sure Ollama is running: `ollama serve` |
| No models in dropdowns | Pull a model first: `ollama pull llama3.2` |
| System page shows "Restart dev server" | Stop and restart `npm run dev` (the hardware plugin loads at startup) |
| Slow first response | Normal &mdash; Ollama loads the model into memory on first use |
| High RAM/VRAM usage | Use smaller quantized models (Q4) or reduce context length in Settings |

---

## License

Licensed under the [Apache License 2.0](LICENSE). You are free to use, modify, and distribute this software under the terms of the license.

## Trademark

**LLMxRay** is a trademark of Ivan Stankovic ([LogneBudo](https://github.com/LogneBudo)). See [TRADEMARK.md](TRADEMARK.md) for usage guidelines.

---

<p align="center">
  Built with curiosity by <a href="https://github.com/LogneBudo">LogneBudo</a>
</p>
