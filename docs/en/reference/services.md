# Services

LLMxRay has 36 service modules in `src/services/`. Services encapsulate business logic, API communication, and data processing.

## API Layer

| Service | File | Responsibility |
|---|---|---|
| **OllamaClient** | `ollama-client.ts` | HTTP client for all Ollama endpoints: `/api/tags`, `/api/show`, `/api/chat`, `/api/generate`, `/api/embed`, `/v1/chat/completions` |
| **Chat Service** | `chat-service.ts` | Multi-turn chat with tool calling loop (max 5 rounds), agent graph recording |
| **Generate Service** | `generate-service.ts` | Single prompt generation with streaming, prompt analysis, metrics |
| **Model Service** | `model-service.ts` | Model listing, architecture parsing, capability detection |

## Streaming

| Service | File | Responsibility |
|---|---|---|
| **Stream Handler** | `stream-handler.ts` | NDJSON and SSE parsing, token extraction, reasoning detection, tool call processing |
| **Reasoning Parser** | `reasoning-parser.ts` | Parses `<think>` blocks from DeepSeek-R1, pattern-based reasoning detection fallback |
| **Metrics Calculator** | `metrics-calculator.ts` | Computes TTFT, tokens-per-second, throughput from streaming chunks |

## Storage (IndexedDB)

| Service | File | Responsibility |
|---|---|---|
| **Conversation DB** | `conversation-db.ts` | CRUD for conversations, messages, sessions, tokens with lazy-loading |
| **Benchmark DB** | `benchmark-db.ts` | Persistence for benchmark results and custom suites |
| **Vector DB** | `vector-db.ts` | RAG chunk storage and similarity search |
| **Canvas AI DB** | `canvas-ai-db.ts` | Training pair storage |
| **Message Memory DB** | `message-memory-db.ts` | Conversation summaries and memory |
| **Storage Estimator** | `storage-estimator.ts` | Estimates IndexedDB and origin storage usage |

## Document Processing

| Service | File | Responsibility |
|---|---|---|
| **Document Parser** | `document-parser.ts` | Format detection and text extraction (PDF via pdfjs, DOCX via mammoth) |
| **Document Chunker** | `document-chunker.ts` | Semantic chunking with configurable size/overlap and metadata |
| **RAG Pipeline** | `rag-pipeline.ts` | End-to-end ingestion (parse → chunk → embed → store) and search |

## Tool System

| Service | File | Responsibility |
|---|---|---|
| **Tool Executor** | `tool-executor.ts` | Executes tool calls, validates parameters |
| **Tool Canvas Adapter** | `tool-canvas-adapter.ts` | Converts canvas tool definitions to Ollama format |
| **AST Parser** | `ast-parser.ts` | Recast-based code analysis for bidirectional sync |
| **OpenAPI Parser** | `openapi-parser.ts` | Parses OpenAPI/Swagger specs into tool definitions |
| **Code to Blocks** | `code-to-blocks.ts` | Converts TypeScript code into executable blocks |
| **Path to Code** | `path-to-code.ts` | Extracts code from JSON paths |
| **Optimize Tool Code** | `optimize-tool-code.ts` | AI-assisted code optimization |
| **Probe** | `probe.ts` | API endpoint probing and response inspection |
| **Slash Command Registry** | `slash-command-registry.ts` | Registers and dispatches slash commands |

## AI & Analysis

| Service | File | Responsibility |
|---|---|---|
| **Canvas AI** | `canvas-ai.ts` | AI-powered tool drafting and improvement suggestions |
| **Introspection Service** | `introspection-service.ts` | Generates illustrative layer/attention data from model architecture |
| **Prompt Analyzer** | `prompt-analyzer.ts` | Identifies prompt sections (system, user, context, tools, examples) |
| **Context Manager** | `context-manager.ts` | Builds context from RAG documents, memory, and conversation history |
| **Benchmark Runner** | `benchmark-runner.ts` | Orchestrates benchmark execution with progress tracking |

## External

| Service | File | Responsibility |
|---|---|---|
| **Google Auth** | `google-auth.ts` | OAuth2 flow with token refresh for Google API access |
| **Feedback Service** | `feedback-service.ts` | Collects and submits user feedback via GitHub Issues |
| **System Info Client** | `system-info-client.ts` | Reads hardware information from the Vite plugin virtual module |
