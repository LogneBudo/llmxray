# Architecture

## Project Structure

```
src/
├── pages/              12 page components
├── components/         85+ components organized by feature
│   ├── agent-graph/    Agent execution graph visualization
│   ├── benchmark/      Benchmark running and results
│   ├── chat/           Chat UI, token stream, messages
│   ├── common/         Layout, sidebar, header, shared components
│   ├── comparison/     Slot configurator, grid, diff, metrics
│   ├── embeddings/     Vector viz, similarity meter
│   ├── introspection/  Layer activations, attention, architecture
│   ├── metrics/        Dashboard, charts, session history
│   ├── prompt-anatomy/ Prompt structure analysis
│   ├── rag/            Document upload, search, ingest
│   ├── reasoning/      Think-block viewer
│   ├── settings/       Settings tabs and forms
│   ├── storage/        Storage usage visualization
│   ├── token-stream/   Token streaming visualization
│   ├── tool-calls/     Tool call management
│   ├── tool-canvas/    Visual canvas, node editor, CodeMirror
│   ├── tool-optimizer/  Response optimizer, JSON tree
│   └── training/       AI training data management
├── composables/        7 Vue composables
├── data/               Built-in benchmark suites, model catalog
├── layouts/            DefaultLayout.vue
├── router/             Route definitions
├── services/           36 service modules
├── stores/             24 Pinia stores
├── types/              21 TypeScript type files
└── utils/              7 utility modules
```

## Data Flow

```
User Action
    │
    ▼
Vue Component (UI)
    │
    ▼
Composable (reactive logic)
    │
    ▼
Pinia Store (global state)
    │
    ▼
Service (business logic / API calls)
    │
    ▼
Ollama API (via Vite proxy)
```

Components use composables for reusable reactive logic. Composables read from and write to Pinia stores. Stores delegate to services for API calls and business logic. Services communicate with Ollama through the Vite dev server proxy.

## Streaming Architecture

LLMxRay uses two streaming protocols depending on the endpoint:

### NDJSON Streaming (Chat & Generate)

Used for `/api/chat` and `/api/generate`. Each line is a complete JSON object:

```
{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":" world"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}
```

Parsed via `fetch()` + `ReadableStream` + `TextDecoder`. The `stream-handler` service splits on newlines and parses each JSON chunk.

### SSE Streaming (Benchmarks / Logprobs)

Used for `/v1/chat/completions` (OpenAI-compatible endpoint). Each event is prefixed with `data: `:

```
data: {"choices":[{"delta":{"content":"Hello"},"logprobs":{"content":[{"token":"Hello","logprob":-0.5}]}}]}
data: [DONE]
```

This endpoint provides **real token logprobs** which the benchmark system uses for confidence scoring.

## Token Confidence

Two approaches depending on context:

| Context | Method | Source |
|---|---|---|
| **Chat** | Latency-based approximation | Inter-token delay: faster = more confident |
| **Benchmark** | Real logprobs | `/v1/chat/completions` logprobs field |

The latency-based method is clearly labeled as "approximation" in the UI.

## IndexedDB Databases

| Database | Service | Stores |
|---|---|---|
| **conversation-db** | `conversation-db.ts` | Conversations, messages, sessions, tokens |
| **benchmark-db** | `benchmark-db.ts` | Benchmark results, custom suites |
| **vector-db** | `vector-db.ts` | RAG documents, embedded chunks |
| **canvas-ai-db** | `canvas-ai-db.ts` | AI training pairs |
| **message-memory-db** | `message-memory-db.ts` | Conversation summaries |

All databases use the browser's native IndexedDB API with structured clone for serialization.

## Vite Proxy Configuration

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:11434',
      changeOrigin: true,
    },
    '/v1': {
      target: 'http://localhost:11434',
      changeOrigin: true,
    },
  },
}
```

## Custom Vite Plugins

### vite-plugin-system-info
Queries the OS for hardware information at dev server startup:
- **Windows**: PowerShell commands (`Get-CimInstance`)
- **Linux**: `/proc/cpuinfo`, `/proc/meminfo`, `lspci`
- **macOS**: `sysctl`, `system_profiler`

Exposes data via a virtual module imported by `system-info-client.ts`.

### vite-plugin-api-probe
Probes Ollama availability at build time and exposes status.

## Key Patterns

### Store-per-Concern
Each domain has its own Pinia store. This keeps state modular and avoids monolithic stores:
- `token-store` for streaming tokens
- `session-store` for session metadata
- `conversation-store` for persisted chat history
- etc.

### shallowRef Optimization
The token store uses `shallowRef` instead of `ref` for its token arrays. With thousands of tokens per session, deep reactivity would be prohibitively expensive. `shallowRef` only triggers updates when the reference changes, not when individual tokens are modified.

### Model Capability Registry
Models are classified by capability (thinking, vision, embedding, tool-use) using:
1. Ollama's native capability metadata (preferred)
2. Name-pattern fallback (e.g., `deepseek-r1` → thinking, `llava` → vision)

The UI adapts automatically based on detected capabilities.

### Lazy Loading
Conversations load metadata eagerly (for the session list) but defer message loading until a session is selected. This keeps the initial load fast even with hundreds of sessions.
