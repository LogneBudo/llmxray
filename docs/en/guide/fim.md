# Fill-in-the-Middle Playground

The **FIM Playground** is a small, focused page for testing **code-completion-style** generation. You provide a **prefix** (code before the cursor) and a **suffix** (code after the cursor), and the model fills the gap in between.

**Sidebar item:** Code Completion (under Tool Workshop)
**Route:** `/fim`
**Added in:** v0.4.7 (May 2026)

## What is fill-in-the-middle?

Most chat APIs only support left-to-right generation: you give a prompt, the model continues from where you left off. **FIM** is different — the model sees what comes *after* the gap as well, and writes content that fits naturally between the two anchors.

This is what powers tools like GitHub Copilot's mid-line suggestions and Cursor's "tab completion." Several Ollama-served models support it natively:

- **Qwen2.5-Coder** (all sizes)
- **CodeLlama** (the `-code` variants)
- **Codestral**
- **DeepSeek-Coder**
- **StarCoder**

Ollama exposes FIM through a `suffix` field on the `/api/generate` endpoint. LLMxRay surfaces this in the FIM Playground page.

## Using the page

1. Pick a model from the dropdown — coding-capable models are listed first under "Coding models (FIM-capable)".
2. Type your **prefix** (the code that comes before the cursor) in the left textarea.
3. Type your **suffix** (the code that comes after the cursor) in the right textarea.
4. Click **Generate**.

The model streams the missing middle in real time. After generation completes you also see a **Stitched preview** — the prefix, the generated middle (highlighted in accent color), and the suffix rendered as one continuous block, so you can read the whole result as it would appear in your editor.

## Metrics

When generation finishes, four metric cards appear below the output:

- **Total duration** — wall-clock time from request to the final token
- **Model load** — how long Ollama spent loading the model into memory (0 ms for warm starts)
- **Generated tokens** — count of tokens the model produced for the middle
- **Speed** — tokens per second

## If the model doesn't support FIM

If you pick a non-coding model, the page warns you up front. If you try anyway, Ollama returns a clear error: *"<model> does not support insert"*. The page surfaces this in the output area without crashing.

## Behind the scenes

The page calls `/api/generate` with the new `suffix` field that Ollama exposes:

```json
{
  "model": "qwen2.5-coder:7b",
  "prompt": "def fibonacci(n):\n    if n <= 1:\n        return n\n    ",
  "suffix": "\n\nprint(fibonacci(10))"
}
```

The streamed NDJSON response is parsed the same way as a regular chat — one JSON object per line, accumulating `response` deltas until `done: true`.

## See also

- [Chat Diagnostics](./chat-diagnostics) for general chat
- [Tool Workshop](./tool-workshop) for building agentic tools
