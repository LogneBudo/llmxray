# Protocol Observatory

The **Protocol Observatory** fires the same prompt through **three different serving protocols** against your local Ollama daemon, in parallel, and shows you exactly how each one frames the same conversation.

**Sidebar item:** Protocol Observatory (under Code Completion)
**Route:** `/protocols`
**Added in:** v0.4.7 (May 2026)

## What's the point?

Ollama doesn't speak just one protocol. It actually exposes the same local model through three different wire formats:

| Endpoint | Format | Stream framing |
|---|---|---|
| `/api/chat` | Ollama-native | NDJSON (one JSON per line) |
| `/v1/chat/completions` | OpenAI-compatible | SSE (`data: …`) |
| `/v1/messages` | Anthropic-compatible | SSE with `event:` tags |

Different ecosystems talk to LLMs through different protocols. If you're building integrations, debugging a client library, or just curious about how the same model behaves under different framings, this page makes the differences visible — **all against the same local model, with no cloud, no API keys, and no signup.**

## Using the page

1. Pick a model from the dropdown.
2. Type a prompt (a default is provided).
3. Adjust max tokens if needed.
4. Click **Run all 3 protocols**.

Three columns stream their responses in parallel. Each column shows:

- The **protocol name** and endpoint path
- A live **status badge** (idle → streaming → completed)
- The **streaming response text**
- A **metrics grid**: TTFT, total ms, tokens, tokens/sec, finish reason
- An expandable **Inspect envelope** panel showing the raw first and final chunks/events

## The Envelope Diff tab

Once all three runs complete, a tabbed lower section appears. Switch to **Envelope diff** to see a side-by-side comparison of how each protocol frames its responses:

| Aspect | Native | OpenAI-compat | Anthropic-compat |
|---|---|---|---|
| Stream framing | NDJSON | SSE | SSE with `event:` tags |
| Finish-reason carrier | `done` + `done_reason` | `choices[].finish_reason` | `message_stop` event |
| Token-count carrier | `eval_count` + `prompt_eval_count` | `usage.{prompt,completion,total}_tokens` | `usage.{input,output}_tokens` |
| Error envelope | `{"error": "string"}` | `{"error": {"message", "type", "code"}}` | `{"type": "error", "error": {...}, "request_id"}` |

The "this run" rows fill in with the actual values observed during your run — so you can see, for example, that the native protocol returned `done_reason: "stop"` while the Anthropic protocol called the same outcome `stop_reason: "end_turn"`.

## Why three protocols?

This isn't theoretical — many real tools rely on these compatibility layers:

- **OpenAI-compat** is how IDE plugins, Cursor, Continue.dev, and most Python libraries that expect "the OpenAI API" talk to local models.
- **Anthropic-compat** is how tools like Claude Code, Claude Cowork, and OpenClaw talk to Ollama (added in Ollama v0.23 / January 2026).
- **Native** is what gives you the richest metrics — including timings, evaluation counts, and the `done_reason` field.

If a third-party tool acts strangely against your local Ollama, the Protocol Observatory lets you see what the wire actually looks like through that protocol's lens.

## See also

- [Chat Diagnostics](./chat-diagnostics) for single-protocol deep analysis
- [Compare](./compare) for comparing different *models* against the same prompt (the Protocol Observatory keeps the model constant and varies the protocol)
