# Integration API

LLMxRay communique avec Ollama via un proxy du serveur de developpement Vite. Cette page documente tous les endpoints utilises, leurs formats de requete/reponse et les protocoles de streaming.

## Configuration du proxy

Le serveur de developpement Vite redirige deux prefixes d'URL vers Ollama :

| URL frontend | URL Ollama |
|---|---|
| `http://localhost:5173/api/*` | `http://localhost:11434/api/*` |
| `http://localhost:5173/v1/*` | `http://localhost:11434/v1/*` |

Cela evite les problemes de CORS pendant le developpement. En production, configurez votre serveur web pour rediriger les memes chemins.

## Endpoints

### GET /api/tags

Liste tous les modeles installes.

**Reponse :**
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

**Utilise par :** `model-store.ts` → `fetchModels()`

### POST /api/show

Obtient les informations detaillees d'un modele specifique.

**Requete :**
```json
{ "name": "llama3.2:latest" }
```

**Utilise par :** `model-store.ts` → `fetchModelInfo()`

### POST /api/chat (streaming)

Chat multi-tour avec streaming NDJSON.

**Requete :**
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

**Reponse (NDJSON) :** Chaque ligne est un objet JSON :
```json
{"model":"llama3.2","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":"!"},"done":true,"total_duration":1234567890}
```

**Utilise par :** `chat-service.ts` → `startChat()`

### POST /api/generate (streaming)

Generation a partir d'un prompt unique avec streaming NDJSON.

**Requete :**
```json
{
  "model": "llama3.2",
  "prompt": "Write a haiku about code",
  "options": { "temperature": 0.7 },
  "stream": true
}
```

**Utilise par :** `generate-service.ts` → `startGeneration()`

### POST /api/embed

Genere des embeddings pour du texte.

**Requete :**
```json
{
  "model": "nomic-embed-text",
  "input": "The quick brown fox"
}
```

**Reponse :**
```json
{
  "model": "nomic-embed-text",
  "embeddings": [[0.123, -0.456, 0.789, ...]]
}
```

**Utilise par :** `embedding-store.ts` → `embed()`, `rag-pipeline.ts`

### POST /v1/chat/completions (streaming SSE)

Endpoint compatible OpenAI avec support des **logprobs**. Utilise exclusivement par le systeme de benchmark.

**Requete :**
```json
{
  "model": "llama3.2",
  "messages": [{ "role": "user", "content": "..." }],
  "stream": true,
  "logprobs": true,
  "top_logprobs": 5
}
```

**Reponse (SSE) :**
```
data: {"choices":[{"delta":{"content":"A"},"logprobs":{"content":[{"token":"A","logprob":-0.5,"top_logprobs":[...]}]}}]}

data: [DONE]
```

**Utilise par :** `benchmark-runner.ts`

## Protocoles de streaming

### NDJSON (Newline-Delimited JSON)

Utilise par `/api/chat` et `/api/generate`. Chaque ligne contient un objet JSON complet suivi d'un saut de ligne.

**Approche d'analyse :**
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
  buffer = lines.pop()! // conserver la ligne incomplete
  for (const line of lines) {
    if (line.trim()) {
      const chunk = JSON.parse(line)
      // traiter le fragment
    }
  }
}
```

### SSE (Server-Sent Events)

Utilise par `/v1/chat/completions`. Chaque ligne d'evenement est prefixee par `data: `. Le flux se termine par `data: [DONE]`.

**Approche d'analyse :** Similaire a NDJSON mais retire le prefixe `data: ` avant l'analyse JSON.

## Confiance des tokens

| Contexte | Methode | Source de donnees |
|---|---|---|
| Chat | Approximation basee sur la latence | Calculee a partir du delai inter-token |
| Benchmark | Logprobs reels | Champ logprobs de `/v1/chat/completions` |

La methode basee sur la latence suppose que la generation plus rapide de tokens correspond a une confiance plus elevee du modele — le modele produit les tokens « evidents » plus rapidement que les tokens incertains. Il s'agit d'une approximation, etiquetee comme telle dans l'interface.

Les logprobs reels du endpoint compatible OpenAI fournissent des scores de confiance mathematiquement precis (probabilite = e^logprob).
