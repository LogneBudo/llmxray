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
- A browsable catalog of installed models
- Capability detection badges (thinking, vision, embedding, tool-use)
- Architecture details and parameter counts
- Comparison features for evaluating models side by side

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
