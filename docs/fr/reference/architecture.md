# Architecture

## Structure du projet

```
src/
├── pages/              12 composants de page
├── components/         85+ composants organises par fonctionnalite
│   ├── agent-graph/    Visualisation du graphe d'execution de l'agent
│   ├── benchmark/      Execution et resultats des benchmarks
│   ├── chat/           Interface de chat, flux de tokens, messages
│   ├── common/         Layout, barre laterale, en-tete, composants partages
│   ├── comparison/     Configurateur de slots, grille, diff, metriques
│   ├── embeddings/     Visualisation vectorielle, indicateur de similarite
│   ├── introspection/  Activations de couches, attention, architecture
│   ├── metrics/        Tableau de bord, graphiques, historique de sessions
│   ├── prompt-anatomy/ Analyse de la structure des prompts
│   ├── rag/            Upload de documents, recherche, ingestion
│   ├── reasoning/      Visionneuse de blocs think
│   ├── settings/       Onglets et formulaires de parametres
│   ├── storage/        Visualisation de l'utilisation du stockage
│   ├── token-stream/   Visualisation du streaming de tokens
│   ├── tool-calls/     Gestion des appels d'outils
│   ├── tool-canvas/    Canvas visuel, editeur de noeuds, CodeMirror
│   ├── tool-optimizer/  Optimiseur de reponses, arbre JSON
│   └── training/       Gestion des donnees d'entrainement IA
├── composables/        7 composables Vue
├── data/               Suites de benchmarks integrees, catalogue de modeles
├── layouts/            DefaultLayout.vue
├── router/             Definitions des routes
├── services/           36 modules de services
├── stores/             24 stores Pinia
├── types/              21 fichiers de types TypeScript
└── utils/              7 modules utilitaires
```

## Flux de donnees

```
Action utilisateur
    │
    ▼
Composant Vue (UI)
    │
    ▼
Composable (logique reactive)
    │
    ▼
Store Pinia (etat global)
    │
    ▼
Service (logique metier / appels API)
    │
    ▼
API Ollama (via proxy Vite)
```

Les composants utilisent des composables pour la logique reactive reutilisable. Les composables lisent et ecrivent dans les stores Pinia. Les stores delegent aux services pour les appels API et la logique metier. Les services communiquent avec Ollama via le proxy du serveur de developpement Vite.

## Architecture de streaming

LLMxRay utilise deux protocoles de streaming selon le endpoint :

### Streaming NDJSON (Chat et Generation)

Utilise pour `/api/chat` et `/api/generate`. Chaque ligne est un objet JSON complet :

```
{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":" world"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}
```

Analyse via `fetch()` + `ReadableStream` + `TextDecoder`. Le service `stream-handler` decoupe sur les sauts de ligne et parse chaque fragment JSON.

### Streaming SSE (Benchmarks / Logprobs)

Utilise pour `/v1/chat/completions` (endpoint compatible OpenAI). Chaque evenement est prefixe par `data: ` :

```
data: {"choices":[{"delta":{"content":"Hello"},"logprobs":{"content":[{"token":"Hello","logprob":-0.5}]}}]}
data: [DONE]
```

Ce endpoint fournit des **logprobs de tokens reels** que le systeme de benchmark utilise pour le calcul de confiance.

## Confiance des tokens

Deux approches selon le contexte :

| Contexte | Methode | Source |
|---|---|---|
| **Chat** | Approximation basee sur la latence | Delai inter-token : plus rapide = plus confiant |
| **Benchmark** | Logprobs reels | Champ logprobs de `/v1/chat/completions` |

La methode basee sur la latence est clairement etiquetee comme "approximation" dans l'interface.

## Bases de donnees IndexedDB

| Base de donnees | Service | Stores |
|---|---|---|
| **conversation-db** | `conversation-db.ts` | Conversations, messages, sessions, tokens |
| **benchmark-db** | `benchmark-db.ts` | Resultats de benchmarks, suites personnalisees |
| **vector-db** | `vector-db.ts` | Documents RAG, chunks embarques |
| **canvas-ai-db** | `canvas-ai-db.ts` | Paires d'entrainement IA |
| **message-memory-db** | `message-memory-db.ts` | Resumes de conversations |

Toutes les bases de donnees utilisent l'API IndexedDB native du navigateur avec le clonage structure pour la serialisation.

## Configuration du proxy Vite

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

## Plugins Vite personnalises

### vite-plugin-system-info
Interroge le systeme d'exploitation pour obtenir les informations materielles au demarrage du serveur de developpement :
- **Windows** : commandes PowerShell (`Get-CimInstance`)
- **Linux** : `/proc/cpuinfo`, `/proc/meminfo`, `lspci`
- **macOS** : `sysctl`, `system_profiler`

Expose les donnees via un module virtuel importe par `system-info-client.ts`.

### vite-plugin-api-probe
Verifie la disponibilite d'Ollama au moment du build et expose le statut.

## Patterns cles

### Store par domaine
Chaque domaine possede son propre store Pinia. Cela maintient l'etat modulaire et evite les stores monolithiques :
- `token-store` pour les tokens en streaming
- `session-store` pour les metadonnees de session
- `conversation-store` pour l'historique de chat persiste
- etc.

### Optimisation shallowRef
Le store de tokens utilise `shallowRef` au lieu de `ref` pour ses tableaux de tokens. Avec des milliers de tokens par session, la reactivite profonde serait trop couteuse. `shallowRef` ne declenche les mises a jour que lorsque la reference change, pas lorsque des tokens individuels sont modifies.

### Registre de capacites des modeles
Les modeles sont classes par capacite (raisonnement, vision, embedding, utilisation d'outils) en utilisant :
1. Les metadonnees de capacite natives d'Ollama (preferees)
2. Un fallback par pattern de nom (ex. `deepseek-r1` → raisonnement, `llava` → vision)

L'interface s'adapte automatiquement en fonction des capacites detectees.

### Chargement paresseux
Les conversations chargent les metadonnees immediatement (pour la liste des sessions) mais different le chargement des messages jusqu'a ce qu'une session soit selectionnee. Cela maintient le chargement initial rapide meme avec des centaines de sessions.
