# API Integration

LLMxRay communicates with Ollama through a Vite dev server proxy. This page documents all endpoints used, their request/response formats, and the streaming protocols.

## Proxy Configuration

The Vite dev server proxies two URL prefixes to Ollama:

| Frontend URL | Ollama URL |
|---|---|
| `http://localhost:5173/api/*` | `http://localhost:11434/api/*` |
| `http://localhost:5173/v1/*` | `http://localhost:11434/v1/*` |

This avoids CORS issues during development. In production, configure your web server to proxy the same paths.

## Endpoints

### GET /api/tags

Lists all installed models.

**Response:**
```json
{
  "models": [
    {
      "name": "llama3.2:latest",
      "model": "llama3.2:latest",
      "size": 2019393189,
      "digest": "abc123...",
      "details": {
        "parent_model": "",
        "format": "gguf",
        "family": "llama",
        "families": ["llama"],
        "parameter_size": "3.2B",
        "quantization_level": "Q4_0"
      }
    }
  ]
}
```

**Used by:** `model-store.ts` → `fetchModels()`

### POST /api/show

Gets detailed information about a specific model.

**Request:**
```json
{ "name": "llama3.2:latest" }
```

**Used by:** `model-store.ts` → `fetchModelInfo()`

### POST /api/chat (streaming)

Multi-turn chat with NDJSON streaming.

**Request:**
```json
{
  "model": "llama3.2",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "tools": [],
  "options": { "temperature": 0.7 },
  "stream": true
}
```

**Response (NDJSON):** Each line is a JSON object:
```json
{"model":"llama3.2","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":"!"},"done":true,"total_duration":1234567890}
```

**Used by:** `chat-service.ts` → `startChat()`

### POST /api/generate (streaming)

Single-prompt generation with NDJSON streaming.

**Request:**
```json
{
  "model": "llama3.2",
  "prompt": "Write a haiku about code",
  "options": { "temperature": 0.7 },
  "stream": true
}
```

**Used by:** `generate-service.ts` → `startGeneration()`

### POST /api/embed

Generates embeddings for text.

**Request:**
```json
{
  "model": "nomic-embed-text",
  "input": "The quick brown fox"
}
```

**Response:**
```json
{
  "model": "nomic-embed-text",
  "embeddings": [[0.123, -0.456, 0.789, ...]]
}
```

**Used by:** `embedding-store.ts` → `embed()`, `rag-pipeline.ts`

### POST /v1/chat/completions (SSE streaming)

OpenAI-compatible endpoint with **logprobs** support. Used exclusively by the benchmark system.

**Request:**
```json
{
  "model": "llama3.2",
  "messages": [{ "role": "user", "content": "..." }],
  "stream": true,
  "logprobs": true,
  "top_logprobs": 5
}
```

**Response (SSE):**
```
data: {"choices":[{"delta":{"content":"A"},"logprobs":{"content":[{"token":"A","logprob":-0.5,"top_logprobs":[...]}]}}]}

data: [DONE]
```

**Used by:** `benchmark-runner.ts`

## Streaming Protocols

### NDJSON (Newline-Delimited JSON)

Used by `/api/chat` and `/api/generate`. Each line contains a complete JSON object followed by a newline character.

**Parsing approach:**
```typescript
const response = await fetch('/api/chat', { method: 'POST', body })
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop()! // keep incomplete line
  for (const line of lines) {
    if (line.trim()) {
      const chunk = JSON.parse(line)
      // process chunk
    }
  }
}
```

### SSE (Server-Sent Events)

Used by `/v1/chat/completions`. Each event line is prefixed with `data: `. The stream ends with `data: [DONE]`.

**Parsing approach:** Similar to NDJSON but strips the `data: ` prefix before JSON parsing.

## Token Confidence

| Context | Method | Data source |
|---|---|---|
| Chat | Latency-based approximation | Calculated from inter-token delay |
| Benchmark | Real logprobs | `/v1/chat/completions` logprobs field |

The latency-based method assumes that faster token generation correlates with higher model confidence — the model produces "obvious" next tokens faster than uncertain ones. This is an approximation and is labeled as such in the UI.

Real logprobs from the OpenAI-compatible endpoint give mathematically precise confidence scores (probability = e^logprob).
