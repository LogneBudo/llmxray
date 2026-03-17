# Stores (Pinia)

LLMxRay utilise 24 stores Pinia, organisés selon le pattern **store par domaine**. Chaque store gère un seul domaine d'état.

## Stores principaux

### token-store
**Fichier :** `src/stores/token-store.ts`

Gère les tokens en streaming pour chaque session.

| État | Type | Description |
|---|---|---|
| `tokensBySession` | `Map<string, StreamToken[]>` | Tokens indexés par identifiant de session |

**Actions principales :** `pushToken`, `getTokens`, `getTokenCount`, `clearTokens`, `persistTokens`, `loadTokens`

::: tip Performance
Utilise `shallowRef` pour la map de tokens. Avec des milliers de tokens par session, la réactivité profonde serait trop coûteuse.
:::

### session-store
**Fichier :** `src/stores/session-store.ts`

Gère le cycle de vie des sessions (création, exécution, finalisation, erreur).

| État | Type | Description |
|---|---|---|
| `sessions` | `Map<string, Session>` | Toutes les sessions |
| `activeSessionId` | `string \| null` | Session actuellement sélectionnée |

**Computed :** `activeSession`, `recentSessions`
**Actions principales :** `createSession`, `updateSessionStatus`, `appendOutput`, `finalizeSession`, `setSessionError`, `cancelSession`

### conversation-store
**Fichier :** `src/stores/conversation-store.ts`

Conversations de chat persistées avec IndexedDB en arrière-plan.

| État | Type | Description |
|---|---|---|
| `conversations` | `Map<string, Conversation>` | Toutes les conversations |
| `hydrated` | `boolean` | Indique si les données ont été chargées depuis IndexedDB |

**Computed :** `activeConversation`, `recentConversations`
**Actions principales :** `hydrate`, `createConversation`, `addMessage`, `finalizeMessage`, `setActiveConversation`, `renameConversation`, `deleteConversation`

### metrics-store
**Fichier :** `src/stores/metrics-store.ts`

Métriques de performance par session et agrégées.

| État | Type | Description |
|---|---|---|
| `metricsBySession` | `Map<string, SessionMetrics>` | Métriques par session |
| `aggregate` | `AggregateMetrics` | Moyennes inter-sessions |
| `metricsHistory` | `SessionMetrics[]` | Historique des métriques |

**Actions principales :** `recordMetrics`, `recalculateAggregate`, `getMetrics`

## Stores de fonctionnalités

### comparison-store
**Fichier :** `src/stores/comparison-store.ts`

Gère les exécutions de comparaison avec plusieurs slots d'exécution.

| État | Type | Description |
|---|---|---|
| `runs` | `Map<string, ComparisonRun>` | Toutes les exécutions de comparaison |
| `activeRunId` | `string \| null` | Exécution en cours |

**Actions principales :** `createRun`, `updateExecution`, `finalizeRun`, `getExecution`

### benchmark-store
**Fichier :** `src/stores/benchmark-store.ts`

État d'exécution des benchmarks et résultats persistés.

| État | Type | Description |
|---|---|---|
| `runState` | `BenchmarkRunState` | État d'exécution actuel |
| `savedResults` | `BenchmarkResult[]` | Résultats persistés depuis IndexedDB |
| `customSuites` | `BenchmarkSuite[]` | Suites importées par l'utilisateur |

**Computed :** `activeResults`, `isRunning`
**Actions principales :** `startRun`, `resumeRun`, `cancelRun`, `deleteResult`, `importCustomSuite`, `deleteCustomSuite`

### embedding-store
**Fichier :** `src/stores/embedding-store.ts`

Génération d'embeddings et résultats de comparaison.

| État | Type | Description |
|---|---|---|
| `results` | `EmbeddingResult[]` | Embeddings générés |
| `loading` | `boolean` | État de chargement |

**Computed :** `recentResults`
**Actions principales :** `embed`, `cosineSimilarity`, `comparePair`, `clearResults`, `removeResult`

### rag-store
**Fichier :** `src/stores/rag-store.ts`

Gestion des documents RAG et recherche.

| État | Type | Description |
|---|---|---|
| `documents` | `RagDocument[]` | Documents uploadés |
| `searchResults` | `RagSearchResult[]` | Derniers résultats de recherche |
| `enabledDocumentIds` | `Set<string>` | Documents actifs pour la recherche |

**Computed :** `readyDocuments`, `enabledDocuments`
**Actions principales :** `loadDocuments`, `addDocument`, `removeDocument`, `toggleDocument`, `search`, `getContextForQuery`

### training-store
**Fichier :** `src/stores/training-store.ts`

Curation des données d'entraînement IA.

| État | Type | Description |
|---|---|---|
| `pairs` | `AiTrainingPair[]` | Toutes les paires d'entraînement |
| `filters` | `TrainingFilters` | État des filtres actifs |
| `selectedIds` | `Set<string>` | Paires sélectionnées pour les opérations groupées |

**Computed :** `filteredPairs`, `stats`
**Actions principales :** `loadPairs`, `updateResponse`, `toggleAccepted`, `deletePairs`, `bulkSetAccepted`, `bulkAddTag`, `exportSelected`

### canvas-ai-store
**Fichier :** `src/stores/canvas-ai-store.ts`

État de l'assistant IA du canvas (brouillons, analyses, suggestions).

| État | Type | Description |
|---|---|---|
| `drafts` | `Map<string, AiDraft>` | Brouillons d'outils générés par l'IA |
| `insights` | `AiInsightsResult \| null` | Dernières suggestions d'amélioration |
| `canvasAiModel` | `string` | Modèle IA sélectionné |

**Actions principales :** `setDraft`, `clearDraft`, `setInsights`, `clearInsights`, `setIntent`, `startRequest`, `cancelRequest`

## Stores d'infrastructure

### model-store
**Fichier :** `src/stores/model-store.ts`

Gestion des modèles Ollama et détection des capacités.

| État | Type | Description |
|---|---|---|
| `models` | `OllamaModel[]` | Modèles installés |
| `modelInfoCache` | `Map<string, ModelInfo>` | Détails des modèles mis en cache |

**Computed :** `modelNames`, `chatModelNames`, `embeddingModelNames`
**Actions principales :** `fetchModels`, `fetchModelInfo`, `deleteModel`, `isThinkingModel`, `isVisionModel`, `supportsTools`

### reasoning-store
**Fichier :** `src/stores/reasoning-store.ts`

État de la chaîne de raisonnement pour les modèles pensants.

**Actions principales :** `addStep`, `getChain`, `getSteps`, `clearChain`, `setThinking`, `getThinking`

### toolcall-store
**Fichier :** `src/stores/toolcall-store.ts`

Suivi des appels d'outils par session.

**Actions principales :** `addToolCall`, `updateToolCall`, `getToolCalls`, `getPendingCalls`

### tool-workshop-store / tool-definition-store
**Fichiers :** `src/stores/tool-workshop-store.ts`, `src/stores/tool-definition-store.ts`

État du canvas d'outils et persistance des schémas d'outils.

### agent-store
**Fichier :** `src/stores/agent-store.ts`

État du graphe de l'agent par session.

**Actions principales :** `initGraph`, `addNode`, `addEdge`, `getGraph`

### prompt-store
**Fichier :** `src/stores/prompt-store.ts`

Analyse de l'anatomie des prompts par session.

### introspection-store
**Fichier :** `src/stores/introspection-store.ts`

Données d'architecture du modèle et de patterns d'attention.

## Stores d'interface

### theme-store
**Fichier :** `src/stores/theme-store.ts`

Gestion du thème sombre/clair/système.

**Actions principales :** `setMode`, `applyTheme`

### storage-store
**Fichier :** `src/stores/storage-store.ts`

Suivi de l'utilisation du stockage IndexedDB.

**Actions principales :** `refresh`, `refreshIfStale`, `getDatabaseById`

### memory-store
**Fichier :** `src/stores/memory-store.ts`

Mémoire conversationnelle et faits.

### google-auth-store
**Fichier :** `src/stores/google-auth-store.ts`

Gestion de l'état OAuth2 Google.

**Actions principales :** `updateClientId`, `connect`, `handleOAuthCallback`, `disconnect`, `getToken`
