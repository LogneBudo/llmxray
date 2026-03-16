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

LLMxRay automatically detects what each model can do:

| Capability | How it's detected | UI effect |
|---|---|---|
| **Thinking** | Model name patterns (e.g., `deepseek-r1`) or Ollama capabilities | Enables reasoning tab in Chat Diagnostics |
| **Vision** | Ollama capabilities or model family | Enables image attachment in chat |
| **Embedding** | Ollama capabilities or model family | Appears in Embeddings and Knowledge Base model selectors |
| **Tool use** | Ollama capabilities | Enables tool calling in chat |

Models that support only embeddings are automatically filtered out of chat model selectors.

## Model Catalog

The catalog provides a curated view of available models with comparison tables, helping you choose the right model for your use case.

## Tips

- **Quantization trade-off** — Lower quantization (Q4) uses less RAM but slightly reduces quality. Q8 and F16 are higher quality but need more memory.
- **Pull more models** from the terminal: `ollama pull <model-name>`
- The capability detection adapts the entire UI — you don't need to configure anything manually.
