# Models

The Models page is a browser for all models installed in your local Ollama instance, with detailed metadata and capability detection.

**Sidebar item:** Models
**Route:** `/settings?tab=models`

## Interface Overview

The Models page (accessed via the Settings > Models tab) displays a card or list for each installed model with key information at a glance.

## Model Details

Each model card shows:

| Field | Description |
|---|---|
| **Name** | Model identifier (e.g., `llama3.2:latest`) |
| **Parameter count** | Number of parameters (e.g., 3B, 7B, 70B) |
| **Quantization** | Compression level (e.g., Q4_0, Q8_0, F16) |
| **Family** | Model family (e.g., llama, mistral, gemma) |
| **Format** | Model format (e.g., gguf) |

## Architecture Diagrams

Click on a model to see an architecture diagram showing the model's internal structure — layer count, attention heads, embedding dimensions, and more. This is parsed from Ollama's model metadata.

## Capability Detection

LLMxRay automatically detects what each model can do. Capabilities are read **live from Ollama**, so newly released models work without any update on LLMxRay's side. When a model doesn't self-report, LLMxRay falls back to name patterns.

Since **Ollama 0.32**, the model listing (`/api/tags`) reports each model's capabilities, context length and embedding width directly. LLMxRay uses that as the primary source, so capability icons and model filtering are correct the moment the list loads, rather than after a per-model `/api/show` round-trip. `/api/show` still runs in the background to enrich the cache with parameters, template and architecture metadata.

| Capability | How it's detected | UI effect |
|---|---|---|
| **Thinking** | Ollama `capabilities`, else name patterns (`deepseek-r1`, `qwq`, `gpt-oss`, `magistral`, `nemotron`, `qwen3.x`, `muse-glimmer`, `glm-*`, `kimi-k*`, …) | Enables reasoning tab in Chat Diagnostics |
| **Vision** | Ollama `capabilities`, else name patterns (`llava`, `*-vl`, `moondream`, `gemma3`, Llama-vision, …) | Enables image attachment in chat |
| **Embedding** | Ollama `capabilities`, else model family or name | Appears in Embeddings and Knowledge Base model selectors |
| **Tool use** | Ollama `capabilities` | Enables tool calling in chat |

Because capabilities come straight from Ollama, LLMxRay tracks new model families automatically. A reported capability set is treated as authoritative — if the daemon lists a model's capabilities and *doesn't* include `thinking`, LLMxRay believes it rather than guessing from the name. The name patterns apply only when a model reports nothing at all.

Models that support only embeddings are automatically filtered out of chat model selectors.

## Reasoning Effort

For thinking-capable models, Chat Diagnostics exposes Ollama's `think` parameter:

| Setting | Sent as | Meaning |
|---|---|---|
| **Off** | *(omitted)* | No internal reasoning |
| **On** | `true` | Thinking enabled; the model picks its own effort |
| **Low / Medium / High** | `"low"` / `"medium"` / `"high"` | Explicit reasoning budget |
| **Max** | `"max"` | Largest reasoning budget |

Models that don't implement graded effort simply treat any level as "thinking on".

## Embedding Dimensions

The Embeddings page can request a narrower output vector via Ollama's `dimensions` parameter (Matryoshka truncation). Leave the field blank for the model's native width — shown as the placeholder, read from the model listing. Models not trained for Matryoshka truncation return their native width regardless.

## Model Catalog

The catalog provides a curated view of available models with comparison tables, helping you choose the right model for your use case.

## Tips

- **Quantization trade-off** — Lower quantization (Q4) uses less RAM but slightly reduces quality. Q8 and F16 are higher quality but need more memory.
- **Pull more models** from the terminal: `ollama pull <model-name>`
- The capability detection adapts the entire UI — you don't need to configure anything manually.
