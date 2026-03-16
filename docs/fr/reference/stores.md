# Stores (Pinia)

LLMxRay utilise 24 stores Pinia, organises selon le pattern **store par domaine**. Chaque store gere un seul domaine d'etat.

## Stores principaux

### token-store
**Fichier :** `src/stores/token-store.ts`

Gere les tokens en streaming pour chaque session.

| Etat | Type | Description |
|---|---|---|
| `tokensBySession` | `Map<string, StreamToken[]>` | Tokens indexes par identifiant de session |

**Actions principales :** `pushToken`, `getTokens`, `getTokenCount`, `clearTokens`, `persistTokens`, `loadTokens`

::: tip Performance
Utilise `shallowRef` pour la map de tokens. Avec des milliers de tokens par session, la reactivite profonde serait trop couteuse.
:::

### session-store
**Fichier :** `src/stores/session-store.ts`

Gere le cycle de vie des sessions (creation, execution, finalisation, erreur).

| Etat | Type | Description |
|---|---|---|
| `sessions` | `Map<string, Session>` | Toutes les sessions |
| `activeSessionId` | `string \| null` | Session actuellement selectionnee |

**Computed :** `activeSession`, `recentSessions`
**Actions principales :** `createSession`, `updateSessionStatus`, `appendOutput`, `finalizeSession`, `setSessionError`, `cancelSession`

### conversation-store
**Fichier :** `src/stores/conversation-store.ts`

Conversations de chat persistees avec IndexedDB en arriere-plan.

| Etat | Type | Description |
|---|---|---|
| `conversations` | `Map<string, Conversation>` | Toutes les conversations |
| `hydrated` | `boolean` | Indique si les donnees ont ete chargees depuis IndexedDB |

**Computed :** `activeConversation`, `recentConversations`
**Actions principales :** `hydrate`, `createConversation`, `addMessage`, `finalizeMessage`, `setActiveConversation`, `renameConversation`, `deleteConversation`

### metrics-store
**Fichier :** `src/stores/metrics-store.ts`

Metriques de performance par session et agregees.

| Etat | Type | Description |
|---|---|---|
| `metricsBySession` | `Map<string, SessionMetrics>` | Metriques par session |
| `aggregate` | `AggregateMetrics` | Moyennes inter-sessions |
| `metricsHistory` | `SessionMetrics[]` | Historique des metriques |

**Actions principales :** `recordMetrics`, `recalculateAggregate`, `getMetrics`

## Stores de fonctionnalites

### comparison-store
**Fichier :** `src/stores/comparison-store.ts`

Gere les executions de comparaison avec plusieurs slots d'execution.

| Etat | Type | Description |
|---|---|---|
| `runs` | `Map<string, ComparisonRun>` | Toutes les executions de comparaison |
| `activeRunId` | `string \| null` | Execution en cours |

**Actions principales :** `createRun`, `updateExecution`, `finalizeRun`, `getExecution`

### benchmark-store
**Fichier :** `src/stores/benchmark-store.ts`

Etat d'execution des benchmarks et resultats persistes.

| Etat | Type | Description |
|---|---|---|
| `runState` | `BenchmarkRunState` | Etat d'execution actuel |
| `savedResults` | `BenchmarkResult[]` | Resultats persistes depuis IndexedDB |
| `customSuites` | `BenchmarkSuite[]` | Suites importees par l'utilisateur |

**Computed :** `activeResults`, `isRunning`
**Actions principales :** `startRun`, `resumeRun`, `cancelRun`, `deleteResult`, `importCustomSuite`, `deleteCustomSuite`

### embedding-store
**Fichier :** `src/stores/embedding-store.ts`

Generation d'embeddings et resultats de comparaison.

| Etat | Type | Description |
|---|---|---|
| `results` | `EmbeddingResult[]` | Embeddings generes |
| `loading` | `boolean` | Etat de chargement |

**Computed :** `recentResults`
**Actions principales :** `embed`, `cosineSimilarity`, `comparePair`, `clearResults`, `removeResult`

### rag-store
**Fichier :** `src/stores/rag-store.ts`

Gestion des documents RAG et recherche.

| Etat | Type | Description |
|---|---|---|
| `documents` | `RagDocument[]` | Documents uploades |
| `searchResults` | `RagSearchResult[]` | Derniers resultats de recherche |
| `enabledDocumentIds` | `Set<string>` | Documents actifs pour la recherche |

**Computed :** `readyDocuments`, `enabledDocuments`
**Actions principales :** `loadDocuments`, `addDocument`, `removeDocument`, `toggleDocument`, `search`, `getContextForQuery`

### training-store
**Fichier :** `src/stores/training-store.ts`

Curation des donnees d'entrainement IA.

| Etat | Type | Description |
|---|---|---|
| `pairs` | `AiTrainingPair[]` | Toutes les paires d'entrainement |
| `filters` | `TrainingFilters` | Etat des filtres actifs |
| `selectedIds` | `Set<string>` | Paires selectionnees pour les operations groupees |

**Computed :** `filteredPairs`, `stats`
**Actions principales :** `loadPairs`, `updateResponse`, `toggleAccepted`, `deletePairs`, `bulkSetAccepted`, `bulkAddTag`, `exportSelected`

### canvas-ai-store
**Fichier :** `src/stores/canvas-ai-store.ts`

Etat de l'assistant IA du canvas (brouillons, analyses, suggestions).

| Etat | Type | Description |
|---|---|---|
| `drafts` | `Map<string, AiDraft>` | Brouillons d'outils generes par l'IA |
| `insights` | `AiInsightsResult \| null` | Dernieres suggestions d'amelioration |
| `canvasAiModel` | `string` | Modele IA selectionne |

**Actions principales :** `setDraft`, `clearDraft`, `setInsights`, `clearInsights`, `setIntent`, `startRequest`, `cancelRequest`

## Stores d'infrastructure

### model-store
**Fichier :** `src/stores/model-store.ts`

Gestion des modeles Ollama et detection des capacites.

| Etat | Type | Description |
|---|---|---|
| `models` | `OllamaModel[]` | Modeles installes |
| `modelInfoCache` | `Map<string, ModelInfo>` | Details des modeles mis en cache |

**Computed :** `modelNames`, `chatModelNames`, `embeddingModelNames`
**Actions principales :** `fetchModels`, `fetchModelInfo`, `deleteModel`, `isThinkingModel`, `isVisionModel`, `supportsTools`

### reasoning-store
**Fichier :** `src/stores/reasoning-store.ts`

Etat de la chaine de raisonnement pour les modeles pensants.

**Actions principales :** `addStep`, `getChain`, `getSteps`, `clearChain`, `setThinking`, `getThinking`

### toolcall-store
**Fichier :** `src/stores/toolcall-store.ts`

Suivi des appels d'outils par session.

**Actions principales :** `addToolCall`, `updateToolCall`, `getToolCalls`, `getPendingCalls`

### tool-workshop-store / tool-definition-store
**Fichiers :** `src/stores/tool-workshop-store.ts`, `src/stores/tool-definition-store.ts`

Etat du canvas d'outils et persistance des schemas d'outils.

### agent-store
**Fichier :** `src/stores/agent-store.ts`

Etat du graphe de l'agent par session.

**Actions principales :** `initGraph`, `addNode`, `addEdge`, `getGraph`

### prompt-store
**Fichier :** `src/stores/prompt-store.ts`

Analyse de l'anatomie des prompts par session.

### introspection-store
**Fichier :** `src/stores/introspection-store.ts`

Donnees d'architecture du modele et de patterns d'attention.

## Stores d'interface

### theme-store
**Fichier :** `src/stores/theme-store.ts`

Gestion du theme sombre/clair/systeme.

**Actions principales :** `setMode`, `applyTheme`

### storage-store
**Fichier :** `src/stores/storage-store.ts`

Suivi de l'utilisation du stockage IndexedDB.

**Actions principales :** `refresh`, `refreshIfStale`, `getDatabaseById`

### memory-store
**Fichier :** `src/stores/memory-store.ts`

Memoire conversationnelle et faits.

### google-auth-store
**Fichier :** `src/stores/google-auth-store.ts`

Gestion de l'etat OAuth2 Google.

**Actions principales :** `updateClientId`, `connect`, `handleOAuthCallback`, `disconnect`, `getToken`
