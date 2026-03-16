# Composables

LLMxRay has 7 Vue composables in `src/composables/`. Composables encapsulate reusable reactive logic following Vue 3 conventions.

## useOllamaStream

**File:** `src/composables/useOllamaStream.ts`

Wraps `startGeneration` and `startChat` with reactive streaming state management.

**Returns:**
- `isStreaming` — Whether a stream is currently active
- `error` — Any error that occurred
- `startChat(model, messages, options)` — Initiates a chat stream
- `startGeneration(model, prompt, options)` — Initiates a single-prompt generation
- `cancel()` — Cancels the active stream

**Usage:**
```typescript
const { isStreaming, error, startChat, cancel } = useOllamaStream()

await startChat('llama3.2', messages, { temperature: 0.7 })
```

## useMetrics

**File:** `src/composables/useMetrics.ts`

Reactive access to session metrics and aggregate statistics.

**Returns:**
- `metrics` — Current session metrics (TTFT, tokens/sec, etc.)
- `aggregate` — Cross-session aggregate metrics
- `history` — Historical metrics for charting

## useTokenConfidence

**File:** `src/composables/useTokenConfidence.ts`

Calculates token confidence from logprobs (when available) or falls back to latency-based approximation.

**Returns:**
- `getConfidence(token)` — Returns a 0-1 confidence score
- `getColor(confidence)` — Maps confidence to a CSS color

## useAgentGraph

**File:** `src/composables/useAgentGraph.ts`

Manages agent execution graph visualization and manipulation.

**Returns:**
- `graph` — Reactive agent graph state
- `nodes` — Computed node list
- `edges` — Computed edge list
- `addNode(node)` — Adds a node to the graph
- `addEdge(edge)` — Adds an edge between nodes

## useToolCanvas

**File:** `src/composables/useToolCanvas.ts`

Tool canvas state management including drag-and-drop, node positioning, and selection.

**Returns:**
- `tools` — Reactive tool list
- `selectedTool` — Currently selected tool
- `addTool(tool)` — Adds a tool node to the canvas
- `updateTool(id, changes)` — Updates tool properties
- `removeTool(id)` — Removes a tool from the canvas

## useMarkdown

**File:** `src/composables/useMarkdown.ts`

Markdown rendering using `marked` with syntax highlighting for code blocks.

**Returns:**
- `render(text)` — Renders markdown string to HTML
- `renderInline(text)` — Renders inline markdown (no block elements)

## useFileAttachment

**File:** `src/composables/useFileAttachment.ts`

File upload handling with format detection and size validation.

**Returns:**
- `attachments` — Reactive list of attached files
- `addFile(file)` — Processes and adds a file
- `removeFile(index)` — Removes an attachment
- `clear()` — Clears all attachments
