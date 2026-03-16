# Stores (Pinia)

LLMxRay uses 24 Pinia stores, organized by the **store-per-concern** pattern. Each store manages a single domain of state.

## Core Stores

### token-store
**File:** `src/stores/token-store.ts`

Manages streaming tokens for each session.

| State | Type | Description |
|---|---|---|
| `tokensBySession` | `Map<string, StreamToken[]>` | Tokens indexed by session ID |

**Key actions:** `pushToken`, `getTokens`, `getTokenCount`, `clearTokens`, `persistTokens`, `loadTokens`

::: tip Performance
Uses `shallowRef` for the token map. With thousands of tokens per session, deep reactivity would be too expensive.
:::

### session-store
**File:** `src/stores/session-store.ts`

Manages session lifecycle (create, run, finalize, error).

| State | Type | Description |
|---|---|---|
| `sessions` | `Map<string, Session>` | All sessions |
| `activeSessionId` | `string \| null` | Currently selected session |

**Computed:** `activeSession`, `recentSessions`
**Key actions:** `createSession`, `updateSessionStatus`, `appendOutput`, `finalizeSession`, `setSessionError`, `cancelSession`

### conversation-store
**File:** `src/stores/conversation-store.ts`

Persisted chat conversations with IndexedDB backing.

| State | Type | Description |
|---|---|---|
| `conversations` | `Map<string, Conversation>` | All conversations |
| `hydrated` | `boolean` | Whether data has been loaded from IndexedDB |

**Computed:** `activeConversation`, `recentConversations`
**Key actions:** `hydrate`, `createConversation`, `addMessage`, `finalizeMessage`, `setActiveConversation`, `renameConversation`, `deleteConversation`

### metrics-store
**File:** `src/stores/metrics-store.ts`

Performance metrics per session and aggregate.

| State | Type | Description |
|---|---|---|
| `metricsBySession` | `Map<string, SessionMetrics>` | Per-session metrics |
| `aggregate` | `AggregateMetrics` | Cross-session averages |
| `metricsHistory` | `SessionMetrics[]` | Historical metrics |

**Key actions:** `recordMetrics`, `recalculateAggregate`, `getMetrics`

## Feature Stores

### comparison-store
**File:** `src/stores/comparison-store.ts`

Manages comparison runs with multiple execution slots.

| State | Type | Description |
|---|---|---|
| `runs` | `Map<string, ComparisonRun>` | All comparison runs |
| `activeRunId` | `string \| null` | Current run |

**Key actions:** `createRun`, `updateExecution`, `finalizeRun`, `getExecution`

### benchmark-store
**File:** `src/stores/benchmark-store.ts`

Benchmark execution state and persisted results.

| State | Type | Description |
|---|---|---|
| `runState` | `BenchmarkRunState` | Current execution state |
| `savedResults` | `BenchmarkResult[]` | Persisted results from IndexedDB |
| `customSuites` | `BenchmarkSuite[]` | User-imported suites |

**Computed:** `activeResults`, `isRunning`
**Key actions:** `startRun`, `resumeRun`, `cancelRun`, `deleteResult`, `importCustomSuite`, `deleteCustomSuite`

### embedding-store
**File:** `src/stores/embedding-store.ts`

Embedding generation and comparison results.

| State | Type | Description |
|---|---|---|
| `results` | `EmbeddingResult[]` | Generated embeddings |
| `loading` | `boolean` | Loading state |

**Computed:** `recentResults`
**Key actions:** `embed`, `cosineSimilarity`, `comparePair`, `clearResults`, `removeResult`

### rag-store
**File:** `src/stores/rag-store.ts`

RAG document management and search.

| State | Type | Description |
|---|---|---|
| `documents` | `RagDocument[]` | Uploaded documents |
| `searchResults` | `RagSearchResult[]` | Latest search results |
| `enabledDocumentIds` | `Set<string>` | Active documents for search |

**Computed:** `readyDocuments`, `enabledDocuments`
**Key actions:** `loadDocuments`, `addDocument`, `removeDocument`, `toggleDocument`, `search`, `getContextForQuery`

### training-store
**File:** `src/stores/training-store.ts`

AI training data curation.

| State | Type | Description |
|---|---|---|
| `pairs` | `AiTrainingPair[]` | All training pairs |
| `filters` | `TrainingFilters` | Active filter state |
| `selectedIds` | `Set<string>` | Selected pairs for bulk ops |

**Computed:** `filteredPairs`, `stats`
**Key actions:** `loadPairs`, `updateResponse`, `toggleAccepted`, `deletePairs`, `bulkSetAccepted`, `bulkAddTag`, `exportSelected`

### canvas-ai-store
**File:** `src/stores/canvas-ai-store.ts`

Canvas AI assistant state (drafts, insights, suggestions).

| State | Type | Description |
|---|---|---|
| `drafts` | `Map<string, AiDraft>` | AI-generated tool drafts |
| `insights` | `AiInsightsResult \| null` | Latest improvement suggestions |
| `canvasAiModel` | `string` | Selected AI model |

**Key actions:** `setDraft`, `clearDraft`, `setInsights`, `clearInsights`, `setIntent`, `startRequest`, `cancelRequest`

## Infrastructure Stores

### model-store
**File:** `src/stores/model-store.ts`

Ollama model management and capability detection.

| State | Type | Description |
|---|---|---|
| `models` | `OllamaModel[]` | Installed models |
| `modelInfoCache` | `Map<string, ModelInfo>` | Cached model details |

**Computed:** `modelNames`, `chatModelNames`, `embeddingModelNames`
**Key actions:** `fetchModels`, `fetchModelInfo`, `deleteModel`, `isThinkingModel`, `isVisionModel`, `supportsTools`

### reasoning-store
**File:** `src/stores/reasoning-store.ts`

Reasoning chain state for thinking models.

**Key actions:** `addStep`, `getChain`, `getSteps`, `clearChain`, `setThinking`, `getThinking`

### toolcall-store
**File:** `src/stores/toolcall-store.ts`

Tool call tracking per session.

**Key actions:** `addToolCall`, `updateToolCall`, `getToolCalls`, `getPendingCalls`

### tool-workshop-store / tool-definition-store
**Files:** `src/stores/tool-workshop-store.ts`, `src/stores/tool-definition-store.ts`

Tool canvas state and tool schema persistence.

### agent-store
**File:** `src/stores/agent-store.ts`

Agent graph state per session.

**Key actions:** `initGraph`, `addNode`, `addEdge`, `getGraph`

### prompt-store
**File:** `src/stores/prompt-store.ts`

Prompt anatomy analysis per session.

### introspection-store
**File:** `src/stores/introspection-store.ts`

Model architecture and attention pattern data.

## UI Stores

### theme-store
**File:** `src/stores/theme-store.ts`

Dark/light/system theme management.

**Key actions:** `setMode`, `applyTheme`

### storage-store
**File:** `src/stores/storage-store.ts`

IndexedDB storage usage tracking.

**Key actions:** `refresh`, `refreshIfStale`, `getDatabaseById`

### memory-store
**File:** `src/stores/memory-store.ts`

Conversation memory and facts.

### google-auth-store
**File:** `src/stores/google-auth-store.ts`

Google OAuth2 state management.

**Key actions:** `updateClientId`, `connect`, `handleOAuthCallback`, `disconnect`, `getToken`
