# Settings

The Settings page lets you configure your Ollama connection, default model parameters, and application preferences.

**Sidebar item:** Settings
**Route:** `/settings`

## Connection

### Ollama URL
Set the URL where Ollama is running. Default: `http://localhost:11434`.

### Connection Test
Click **Test Connection** to verify that LLMxRay can reach Ollama. The result shows:
- **Connected** (green) — Ollama is reachable and responding
- **Disconnected** (red) — Check that `ollama serve` is running

::: tip Remote Ollama
If Ollama runs on another machine, enter its IP and port (e.g., `http://192.168.1.100:11434`). Make sure the Vite proxy is updated in `vite.config.ts` or that CORS is configured on the remote Ollama instance.
:::

## Default Parameters

### Temperature
Controls randomness in model outputs. Displayed with a **visual scale** and **educational tooltip**:

| Value | Effect |
|---|---|
| **0** | Deterministic — always picks the most likely token |
| **0.7** | Balanced — default for most use cases |
| **1.0+** | Creative — more varied, sometimes surprising output |

### Context Length
Sets the maximum number of tokens the model considers. Higher values allow longer conversations but use more memory.

Both parameters include visual scales and plain-language explanations of what each setting does.

## Model Catalog

The Models tab (also accessible as a sidebar item) provides:
- A browsable catalog of installed models, each with its **runner** badge (`llamacpp`, `mlx`, or `ggml` for a model pulled before Ollama 0.40)
- Capability detection badges (thinking, vision, embedding, tool-use, audio, decision)
- Architecture details and parameter counts
- A download catalog by category, including **Decision** models (nimble, tev1, clef-flash, clef) for the Decision Lab
- **Backups kept from model upgrades** — Ollama 0.40.2 upgrades models in the background and keeps the original copy on disk. When any exist, this section lists them with their size and removes one on request. It is absent when the daemon has none.

See the [Models](./models) chapter for full details.

## Theme

Toggle between:
- **Dark mode** — Default, optimized for extended use
- **Light mode** — High-contrast alternative
- **System** — Follows your OS preference

The theme toggle is also available in the header bar.

## Google OAuth2

For Tool Workshop templates that interact with Google services (Calendar, Gmail), you can configure OAuth2:
1. Enter your **Client ID** from the Google Cloud Console
2. Click **Connect** to authorize
3. Once connected, Google-powered tools can access your account

::: warning Privacy
OAuth tokens are stored locally in your browser. LLMxRay never sends your credentials to any external server.
:::

## Tips

- **Start with defaults** — The default temperature (0.7) and context length work well for most models.
- **Lower context length** if you're running low on RAM/VRAM.
- The connection tester is the fastest way to diagnose "no models" issues.
