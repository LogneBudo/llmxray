# Introduction

**LLMxRay** is a free, local-first dashboard that connects to [Ollama](https://ollama.com) running on your machine. It lets you chat with any model you've downloaded and then inspect everything that happened behind the scenes: how fast each token arrived, what the model might have been "thinking", how different settings change the output, and much more.

**No cloud. No API keys. No cost.** Everything runs on your hardware.

## Who is this for?

| You are... | LLMxRay helps you... |
|---|---|
| **Curious beginner** | See AI responses form in real time and learn what "temperature" or "tokens" actually mean |
| **Student / educator** | Explore model behavior visually — great for AI/ML coursework and demos |
| **Developer** | Debug prompts, compare models, profile latency, inspect tool calls |
| **Researcher** | Run controlled experiments: same prompt, different settings, side-by-side results |

## Navigating the App

LLMxRay has a sidebar with 10 navigation items, each representing a major feature. This guide has one chapter per item, in the exact order they appear in the sidebar:

1. **[Chat Diagnostics](./chat-diagnostics)** — The main chat interface with streaming and session analysis
2. **[Compare](./compare)** — Side-by-side model and settings comparison
3. **[Embeddings](./embeddings)** — Text embedding visualization and similarity
4. **[Knowledge Base](./knowledge-base)** — Document upload, chunking, and RAG search
5. **[Tool Workshop](./tool-workshop)** — Visual tool builder with code sync
6. **[AI Training](./ai-training)** — Training data curation and export
7. **[Models](./models)** — Model browser and capability detection
8. **[Benchmark](./benchmark)** — Standardized model evaluation with logprobs
9. **[My System](./system)** — Hardware detection and Ollama status
10. **[Settings](./settings)** — Connection, parameters, and preferences

## Other Elements

- **Header bar** — Shows the current page title, a theme toggle (dark/light), and Ollama connection status (green = connected, red = disconnected).
- **Feedback button** — At the bottom of the sidebar. Opens an overlay to submit feedback directly.

## Next Steps

If you haven't installed LLMxRay yet, head to the [Installation](./installation) page. Otherwise, pick any chapter from the sidebar to start exploring.
