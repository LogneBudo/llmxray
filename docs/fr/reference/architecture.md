# Architecture

## Structure du projet

```
src/
├── pages/              12 composants de page
├── components/         85+ composants organisés par fonctionnalité
│   ├── agent-graph/    Visualisation du graphe d'exécution de l'agent
│   ├── benchmark/      Exécution et résultats des benchmarks
│   ├── chat/           Interface de chat, flux de tokens, messages
│   ├── common/         Layout, barre latérale, en-tête, composants partagés
│   ├── comparison/     Configurateur de slots, grille, diff, métriques
│   ├── embeddings/     Visualisation vectorielle, indicateur de similarité
│   ├── introspection/  Activations de couches, attention, architecture
│   ├── metrics/        Tableau de bord, graphiques, historique de sessions
│   ├── prompt-anatomy/ Analyse de la structure des prompts
│   ├── rag/            Upload de documents, recherche, ingestion
│   ├── reasoning/      Visionneuse de blocs think
│   ├── settings/       Onglets et formulaires de paramètres
│   ├── storage/        Visualisation de l'utilisation du stockage
│   ├── token-stream/   Visualisation du streaming de tokens
│   ├── tool-calls/     Gestion des appels d'outils
│   ├── tool-canvas/    Canvas visuel, éditeur de nœuds, CodeMirror
│   ├── tool-optimizer/  Optimiseur de réponses, arbre JSON
│   └── training/       Gestion des données d'entraînement IA
├── composables/        7 composables Vue
├── data/               Suites de benchmarks intégrées, catalogue de modèles
├── layouts/            DefaultLayout.vue
├── router/             Définitions des routes
├── services/           36 modules de services
├── stores/             24 stores Pinia
├── types/              21 fichiers de types TypeScript
└── utils/              7 modules utilitaires
```

## Flux de données

```
Action utilisateur
    │
    ▼
Composant Vue (UI)
    │
    ▼
Composable (logique réactive)
    │
    ▼
Store Pinia (état global)
    │
    ▼
Service (logique métier / appels API)
    │
    ▼
API Ollama (via proxy Vite)
```

Les composants utilisent des composables pour la logique réactive réutilisable. Les composables lisent et écrivent dans les stores Pinia. Les stores délèguent aux services pour les appels API et la logique métier. Les services communiquent avec Ollama via le proxy du serveur de développement Vite.

## Architecture de streaming

LLMxRay utilise deux protocoles de streaming selon le endpoint :

### Streaming NDJSON (Chat et Génération)

Utilisé pour `/api/chat` et `/api/generate`. Chaque ligne est un objet JSON complet :

```
{"model":"llama3.2","message":{"role":"assistant","content":"Hello"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":" world"},"done":false}
{"model":"llama3.2","message":{"role":"assistant","content":""},"done":true}
```

Analyse via `fetch()` + `ReadableStream` + `TextDecoder`. Le service `stream-handler` découpe sur les sauts de ligne et parse chaque fragment JSON.

### Streaming SSE (Benchmarks / Logprobs)

Utilisé pour `/v1/chat/completions` (endpoint compatible OpenAI). Chaque événement est préfixé par `data: ` :

```
data: {"choices":[{"delta":{"content":"Hello"},"logprobs":{"content":[{"token":"Hello","logprob":-0.5}]}}]}
data: [DONE]
```

Ce endpoint fournit des **logprobs de tokens réels** que le système de benchmark utilise pour le calcul de confiance.

## Confiance des tokens

Deux approches selon le contexte :

| Contexte | Méthode | Source |
|---|---|---|
| **Chat** | Approximation basée sur la latence | Délai inter-token : plus rapide = plus confiant |
| **Benchmark** | Logprobs réels | Champ logprobs de `/v1/chat/completions` |

La méthode basée sur la latence est clairement étiquetée comme « approximation » dans l'interface.

## Bases de données IndexedDB

| Base de données | Service | Stores |
|---|---|---|
| **conversation-db** | `conversation-db.ts` | Conversations, messages, sessions, tokens |
| **benchmark-db** | `benchmark-db.ts` | Résultats de benchmarks, suites personnalisées |
| **vector-db** | `vector-db.ts` | Documents RAG, chunks embarqués |
| **canvas-ai-db** | `canvas-ai-db.ts` | Paires d'entraînement IA |
| **message-memory-db** | `message-memory-db.ts` | Résumés de conversations |

Toutes les bases de données utilisent l'API IndexedDB native du navigateur avec le clonage structuré pour la sérialisation.

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

## Plugins Vite personnalisés

### vite-plugin-system-info
Interroge le système d'exploitation pour obtenir les informations matérielles au démarrage du serveur de développement :
- **Windows** : commandes PowerShell (`Get-CimInstance`)
- **Linux** : `/proc/cpuinfo`, `/proc/meminfo`, `lspci`
- **macOS** : `sysctl`, `system_profiler`

Expose les données via un module virtuel importé par `system-info-client.ts`.

### vite-plugin-api-probe
Vérifie la disponibilité d'Ollama au moment du build et expose le statut.

## Patterns clés

### Store par domaine
Chaque domaine possède son propre store Pinia. Cela maintient l'état modulaire et évite les stores monolithiques :
- `token-store` pour les tokens en streaming
- `session-store` pour les métadonnées de session
- `conversation-store` pour l'historique de chat persisté
- etc.

### Optimisation shallowRef
Le store de tokens utilise `shallowRef` au lieu de `ref` pour ses tableaux de tokens. Avec des milliers de tokens par session, la réactivité profonde serait trop coûteuse. `shallowRef` ne déclenche les mises à jour que lorsque la référence change, pas lorsque des tokens individuels sont modifiés.

### Registre de capacités des modèles
Les modèles sont classés par capacité (raisonnement, vision, embedding, utilisation d'outils) en utilisant :
1. Les métadonnées de capacité natives d'Ollama (préférées)
2. Un fallback par pattern de nom (ex. `deepseek-r1` → raisonnement, `llava` → vision)

L'interface s'adapte automatiquement en fonction des capacités détectées.

### Chargement paresseux
Les conversations chargent les métadonnées immédiatement (pour la liste des sessions) mais diffèrent le chargement des messages jusqu'à ce qu'une session soit sélectionnée. Cela maintient le chargement initial rapide même avec des centaines de sessions.
