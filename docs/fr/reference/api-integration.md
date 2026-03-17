# Intégration API

LLMxRay communique avec Ollama via un proxy du serveur de développement Vite. Cette page documente tous les endpoints utilisés, leurs formats de requête/réponse et les protocoles de streaming.

## Configuration du proxy

Le serveur de développement Vite redirige deux préfixes d'URL vers Ollama :

| URL frontend | URL Ollama |
|---|---|
| `http://localhost:5173/api/*` | `http://localhost:11434/api/*` |
| `http://localhost:5173/v1/*` | `http://localhost:11434/v1/*` |

Cela évite les problèmes de CORS pendant le développement. En production, configurez votre serveur web pour rediriger les mêmes chemins.

## Endpoints

### GET /api/tags

Liste tous les modèles installés.

**Réponse :**
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

**Utilisé par :** `model-store.ts` → `fetchModels()`

### POST /api/show

Obtient les informations détaillées d'un modèle spécifique.

**Requête :**
```json
{ "name": "llama3.2:latest" }
```

**Utilisé par :** `model-store.ts` → `fetchModelInfo()`

### POST /api/chat (streaming)

Chat multi-tour avec streaming NDJSON.

**Requête :**
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

**Réponse (NDJSON) :** Chaque ligne est un objet JSON :
```json
{"model":"llama3.2","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":"!"},"done":true,"total_duration":1234567890}
```

**Utilisé par :** `chat-service.ts` → `startChat()`

### POST /api/generate (streaming)

Génération à partir d'un prompt unique avec streaming NDJSON.

**Requête :**
```json
{
  "model": "llama3.2",
  "prompt": "Write a haiku about code",
  "options": { "temperature": 0.7 },
  "stream": true
}
```

**Utilisé par :** `generate-service.ts` → `startGeneration()`

### POST /api/embed

Génère des embeddings pour du texte.

**Requête :**
```json
{
  "model": "nomic-embed-text",
  "input": "The quick brown fox"
}
```

**Réponse :**
```json
{
  "model": "nomic-embed-text",
  "embeddings": [[0.123, -0.456, 0.789, ...]]
}
```

**Utilisé par :** `embedding-store.ts` → `embed()`, `rag-pipeline.ts`

### POST /v1/chat/completions (streaming SSE)

Endpoint compatible OpenAI avec support des **logprobs**. Utilisé exclusivement par le système de benchmark.

**Requête :**
```json
{
  "model": "llama3.2",
  "messages": [{ "role": "user", "content": "..." }],
  "stream": true,
  "logprobs": true,
  "top_logprobs": 5
}
```

**Réponse (SSE) :**
```
data: {"choices":[{"delta":{"content":"A"},"logprobs":{"content":[{"token":"A","logprob":-0.5,"top_logprobs":[...]}]}}]}

data: [DONE]
```

**Utilisé par :** `benchmark-runner.ts`

## Protocoles de streaming

### NDJSON (Newline-Delimited JSON)

Utilisé par `/api/chat` et `/api/generate`. Chaque ligne contient un objet JSON complet suivi d'un saut de ligne.

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
  buffer = lines.pop()! // conserver la ligne incomplète
  for (const line of lines) {
    if (line.trim()) {
      const chunk = JSON.parse(line)
      // traiter le fragment
    }
  }
}
```

### SSE (Server-Sent Events)

Utilisé par `/v1/chat/completions`. Chaque ligne d'événement est préfixée par `data: `. Le flux se termine par `data: [DONE]`.

**Approche d'analyse :** Similaire à NDJSON mais retire le préfixe `data: ` avant l'analyse JSON.

## Confiance des tokens

| Contexte | Méthode | Source de données |
|---|---|---|
| Chat | Approximation basée sur la latence | Calculée à partir du délai inter-token |
| Benchmark | Logprobs réels | Champ logprobs de `/v1/chat/completions` |

La méthode basée sur la latence suppose que la génération plus rapide de tokens correspond à une confiance plus élevée du modèle — le modèle produit les tokens « évidents » plus rapidement que les tokens incertains. Il s'agit d'une approximation, étiquetée comme telle dans l'interface.

Les logprobs réels du endpoint compatible OpenAI fournissent des scores de confiance mathématiquement précis (probabilité = e^logprob).
