# Types

LLMxRay définit ses interfaces TypeScript dans 21 fichiers de types sous `src/types/`. Cette page couvre les interfaces principales regroupées par domaine.

## Session et chat

**Fichier :** `src/types/session.ts`

```typescript
interface Session {
  id: string
  mode: 'generate' | 'chat'
  model: string
  status: 'idle' | 'streaming' | 'done' | 'error' | 'cancelled'
  prompt?: string
  output: string
  messages: ChatMessage[]
  options: OllamaOptions
  metrics?: SessionMetrics
  createdAt: number
  updatedAt: number
}
```

**Fichier :** `src/types/conversation.ts`

```typescript
interface Conversation {
  id: string
  title: string
  model: string
  messages: ChatMessage[]
  options: OllamaOptions
  createdAt: number
  updatedAt: number
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  attachments?: Attachment[]
  feedback?: 'positive' | 'negative'
  timestamp: number
}
```

## Ollama

**Fichier :** `src/types/ollama.ts`

```typescript
interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  tools?: OllamaToolDefinition[]
  options?: OllamaOptions
  stream?: boolean
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
  images?: string[]
}

interface OllamaOptions {
  temperature?: number
  top_k?: number
  top_p?: number
  num_ctx?: number
  seed?: number
  stop?: string[]
  mirostat?: number
  mirostat_eta?: number
  mirostat_tau?: number
}

interface OllamaToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JSONSchema
  }
}
```

## Token et streaming

**Fichier :** `src/types/token.ts`

```typescript
interface StreamToken {
  index: number
  text: string
  timestamp: number
  confidence: number
  logprob?: number
  interTokenLatencyMs: number
  cumulativeText: string
}
```

**Fichier :** `src/types/reasoning.ts`

```typescript
interface ReasoningStep {
  type: 'thought' | 'observation' | 'action' | 'conclusion' | 'reflection'
  content: string
  tokenIndices: [number, number]
}

interface ReasoningChain {
  sessionId: string
  steps: ReasoningStep[]
  totalSteps: number
  currentDepth: number
}
```

## Métriques

**Fichier :** `src/types/metrics.ts`

```typescript
interface SessionMetrics {
  ttftMs: number
  totalDurationMs: number
  tokensPerSecond: number
  promptTokenCount: number
  completionTokenCount: number
}

interface AggregateMetrics {
  avgTtftMs: number
  avgTps: number
  totalTokensGenerated: number
  modelsUsed: string[]
}
```

## Benchmark

**Fichier :** `src/types/benchmark.ts`

```typescript
interface BenchmarkSuite {
  id: string
  name: string
  description: string
  questions: BenchmarkQuestion[]
  builtIn: boolean
}

interface BenchmarkQuestion {
  question: string
  choices: string[]
  correctAnswer: number
  category?: string
}

interface BenchmarkResult {
  id: string
  modelName: string
  suiteId: string
  accuracy: number
  categories: CategoryResult[]
  questionResults: QuestionResult[]
  startedAt: number
  completedAt: number
}

interface QuestionResult {
  questionIndex: number
  correct: boolean
  modelAnswer: number
  latencyMs: number
  ttftMs: number
  tokenConfidence: number
  logprobs?: number[]
}
```

## RAG

**Fichier :** `src/types/rag.ts`

```typescript
interface RagDocument {
  id: string
  name: string
  format: 'pdf' | 'docx' | 'txt' | 'md' | 'csv'
  status: 'parsing' | 'chunking' | 'embedding' | 'ready' | 'error'
  chunkCount: number
  embeddingModel: string
  createdAt: number
}

interface EmbeddedChunk {
  id: string
  documentId: string
  content: string
  embedding: number[]
  metadata: {
    page?: number
    section?: string
    charStart: number
    charEnd: number
  }
}

interface RagSearchResult {
  chunk: EmbeddedChunk
  score: number
  documentName: string
}
```

## Canvas et outils

**Fichier :** `src/types/tool-canvas.ts`

```typescript
interface CanvasTool {
  id: string
  name: string
  description: string
  parameters: JSONSchema
  implementation: string
  position: { x: number; y: number }
}
```

**Fichier :** `src/types/canvas-ai.ts`

```typescript
interface AiTrainingPair {
  id: string
  userPrompt: string
  response: string
  phase: string
  model: string
  accepted: boolean | null
  tags: string[]
  systemPrompt?: string
  createdAt: number
}

interface AiDraft {
  toolId: string
  intent: string
  draft: string
}

interface AiInsightsResult {
  improvements: string[]
  suggestions: string[]
}
```

## Agent

**Fichier :** `src/types/agent.ts`

```typescript
interface AgentGraph {
  sessionId: string
  nodes: AgentNode[]
  edges: AgentEdge[]
}

interface AgentNode {
  id: string
  type: 'start' | 'plan' | 'tool_call' | 'tool_result' | 'synthesis' | 'end'
  label: string
  data?: Record<string, unknown>
}

interface AgentEdge {
  source: string
  target: string
  label?: string
}
```
