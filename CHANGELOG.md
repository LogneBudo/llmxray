# Changelog

All notable changes to LLMxRay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-08-15

### Fixed

- **Benchmark and Protocol Observatory token counts read zero on Ollama 0.32.6+.** That release
  aligned `/v1/chat/completions` with OpenAI's wire format, where the final `usage` totals are only
  emitted when the request sends `stream_options.include_usage`. LLMxRay now sends it, and reads
  the totals from the trailing chunk — which carries an **empty `choices` array**, so the read had
  to move ahead of the per-choice guard. Restores `tokenCount` and `tokensPerSecond` in the
  Surgical Benchmark, and the OpenAI lane's token count in the Protocol Observatory.

### Added

- **Reasoning effort levels.** The thinking control in Chat Diagnostics now offers Off, On,
  Low, Medium, High and Max, mapping to Ollama's `think` parameter. On sends `true` and lets the
  model pick its own effort; the named levels request an explicit reasoning budget.
- **Embedding dimensions.** The Embeddings Lab can request a narrower output vector via Ollama's
  `dimensions` parameter (Matryoshka truncation), with the model's native width shown as the
  placeholder. Blank leaves the model's native width untouched.

### Changed

- **Capabilities now come from the model listing.** Ollama 0.32 reports each model's
  `capabilities`, `context_length` and `embedding_length` in `/api/tags`. LLMxRay uses that as the
  primary source, so capability icons and model filtering are correct as soon as the list loads
  rather than after a per-model `/api/show` round-trip. `/api/show` still runs in the background
  to enrich parameters, template, license and architecture metadata.
- A reported capability set is treated as authoritative: when the daemon lists a model's
  capabilities and omits `thinking`, that is believed rather than overridden by a name guess.
  Name patterns now apply only to models that report nothing at all.
- **`embedding` is a first-class capability.** Chat and embedding model selectors split on what
  Ollama reports, falling back to family and name heuristics only on older daemons. The Embeddings
  page no longer carries its own duplicate name-pattern filter.
- Capability name-pattern fallbacks extended: `qwen3.x`, `muse-glimmer`, `glm-*`, `kimi-k*`
  (reasoning) and `gemma3` (vision).
- `/api/show` requests send the documented `model` field, keeping `name` as an alias for older
  daemons.
- Docs: the Models guide (EN/FR) documents listing-sourced capability detection, the reasoning
  effort levels, and embedding dimensions. READMEs (EN/FR/ZH/AR/SR) updated for Ollama 0.32.x.

### Fixed (i18n)

- The thinking control's strings were missing entirely from the Chinese and Arabic catalogs;
  both are now complete, alongside the new effort-level and embedding-dimension strings in all
  six locales.

### Notes

- Tested against Ollama 0.32.9. Unit tests 190 → 203, covering the usage-chunk shape, the
  capability resolution paths, and the request bodies that carry the fix.

## [0.4.9] — 2026-07-02

### Changed

- Verified compatibility with **Ollama 0.31.x** (current latest). No API changes were required:
  LLMxRay already reads model capabilities live from `/api/show`, surfaces API error `detail`
  (incl. the new "message exceeds context window" error from Ollama 0.30.9), and pins no minimum
  Ollama version — so new releases and models work out of the box.
- Extended the capability name-pattern **fallbacks** (used only when a model doesn't self-report
  via `/api/show`) to recognize newer families:
  - Reasoning/thinking: `gpt-oss`, `magistral`, `nemotron`.
  - Vision: `moondream`, `mllama` (Llama vision).
- Docs: the Models guide (EN/FR) now documents live `/api/show` capability detection and the
  refreshed fallback families.

### Notes

- Maintenance release tracking the recent Ollama cadence; no UI changes.

## [0.4.8] — 2026-05-26

### Added

- Localized README files cross-linked by a language switcher at the top of each:
  - `README.fr.md` (Français)
  - `README.zh-CN.md` (简体中文)
  - `README.ar.md` (العربية, wrapped in `<div dir="rtl">` for GitHub RTL render)
  - `README.sr.md` (Srpski, Latin script)
- Chinese and Arabic translations for the two namespaces added in v0.4.7:
  - `src/locales/zh/fim.json` + `src/locales/ar/fim.json`
  - `src/locales/zh/protocols.json` + `src/locales/ar/protocols.json`
  - Wired into `src/locales/{zh,ar}/index.ts` so the new strings are no longer English-fallback for Chinese and Arabic users.

### Notes

- With this release, `zh` and `ar` reach 18/18 namespace coverage — fully on par with `en`, `fr`, `sr`, and `sr-Cyrl`.
- No new features, no API changes, no UI changes beyond locale strings.
- `package-lock.json` realigned from 0.4.3 (had drifted since v0.4.4).

## [0.4.7] — 2026-05-24

### Added

- **Fill-in-the-Middle Playground** (`/fim`) — new page for testing code completion with prefix + suffix textareas. Uses Ollama's `suffix` field on `/api/generate`. Coding-model detection groups FIM-capable models (Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder, StarCoder) first in the picker and warns when a non-coding model is selected. Stitched preview shows the result as it would appear in an editor.
- **Protocol Observatory** (`/protocols`) — new page that fires the same prompt through Ollama's three serving protocols in parallel: native `/api/chat` (NDJSON), OpenAI-compat `/v1/chat/completions` (SSE), and Anthropic-compat `/v1/messages` (SSE with `event:` tags). Per-protocol metrics, envelope inspector, and an Envelope Diff tab comparing wire-format differences. All local — no cloud, no API keys.
- **Thinking control** in Chat Settings (Off / On / Max) — toggles Ollama's `think` parameter, visible only when the active model has the `thinking` capability. `Max` corresponds to `think: "max"` (added in Ollama 0.21.3).
- **Response format control** in Chat Settings (Free-form / Valid JSON / JSON Schema strict) — exposes Ollama's `format` parameter now accepting a JSON Schema object. Live schema validation in textarea.
- Wire-level types: `OllamaChatRequest` / `OllamaGenerateRequest` gained `think?: boolean | 'max'`, widened `format?: 'json' | Record<string, unknown>`, and `suffix?: string` on generate.
- New `src/services/anthropic-client.ts` and `src/types/anthropic.ts` — Anthropic Messages API client and SSE event-tagged parser. Targets local `/v1/messages` (no cloud).
- Two new feature cards on the public website home page (EN + FR): "Fill-in-the-Middle Playground" and "Protocol Observatory".
- New VitePress pages: `docs/{en,fr}/guide/fim.md` and `docs/{en,fr}/guide/protocols.md`. Guide sidebars updated 10 → 12 items.
- README "Ollama Compatibility" section enumerating every endpoint LLMxRay uses, with version-floor and version-recommended guidance.

### Changed

- `streamChatOpenAI` now passes `reasoning_effort` and `response_format` through to the OpenAI-compat endpoint.
- README "Multilingual" line now explicitly mentions Serbian alongside English, French, Chinese, and Arabic.

### Compatibility

- Tested and verified against Ollama 0.24.0. Works with Ollama 0.20+ for chat/generate; full feature parity requires 0.24+ (Anthropic-compat endpoint added in 0.23, `think: "max"` added in 0.21.3).

### Process

- Self-hosted GitHub Actions release workflow disabled (renamed `.github/workflows/release.yml` → `release.yml.disabled`). All releases are now fully manual.
- Pre-flight 7-surface audit (package.json, commits, local tags, origin tags, GitHub Releases, npm, Docker) added to the release dance — caught a tags/Releases drift accumulated during v0.4.4–v0.4.6 which was reconciled before cutting v0.4.7.

## [0.4.6] — 2026-04-13

### Added

- Slash command palette is now fully internationalized:
  - All 29 command descriptions are translated via `dashboard.slashCommands.descriptions.*`
  - All 50+ runtime notification messages from command `execute()` callbacks are translated via `dashboard.slashCommands.notifications.*`
  - The previously-missing `memory` category label is now translated
  - Full translations added for English, French, and Serbian (both Latin and Cyrillic)
- `SlashCommandContext` now carries a `t` function so command callbacks can produce localized notifications. The `getCommandsByCategory` helper accepts an optional `t` argument and falls back to English labels when called without one (e.g. from tests).
- New `descriptionKey` field on `SlashCommand` — vue-i18n key used by UI surfaces (the registry's literal `description` field is kept as an English fallback used by `/help`).

### Notes

- Arabic and Chinese slash command strings fall back to English (vue-i18n's intended behavior for missing keys). Native translations can be added in a future patch.
- Help text placeholder syntax changed from `<value>` to `[value]` across all locales — vue-i18n's parser was treating `<…>` as inline HTML and refusing to compile the messages.

## [0.4.5] — 2026-04-13

### Fixed

- Serbian translations: `dashboard.json`, `comparison.json`, and `embeddings.json` had been shipped in v0.4.4 with mostly-untranslated English content because the LLM-based translation pipeline silently echoed source text on those three files. Replaced with full native Serbian translations (~165 strings across the three files).
- Critical fix in `embeddings.json`: the literal CLI command `ollama pull nomic-embed-text` was previously translated to Serbian (`olama povuci nomic-ugnjezdi-tekst`), which would silently fail when copy-pasted into a terminal. Restored to literal command.
- Chat input placeholder: `"Send a message... (Shift+Enter for new line)"` is now properly translated to `"Pošalji poruku... (Shift+Enter za novi red)"` (and Cyrillic equivalent).

### Changed

- `scripts/transliterate-sr.py` significantly improved:
  - Word-boundary preserve regex: Serbian-inflected forms like `tokena` (genitive of `token`) now fully transliterate to `токена` instead of producing mixed-script `tokenа`.
  - Escape sequence preservation: `\n`, `\t`, etc. are no longer broken by the transliterator (would have corrupted JSON stop sequences).
  - Length-descending alternation order: multi-word patterns like `ollama pull` correctly match before their single-word prefixes.
  - Expanded preserve list: sampling parameters (`Top-P`, `Top-K`, `Mirostat`, `Seed`, `TTFT`, `V1-V4`), ML technical terms (`Nucleus`, `sampling`, `Human`, `Assistant`, `System`, `num_predict`, `num_ctx`, `max_tokens`), Ollama CLI tokens (`ollama`, `ollama pull`, `nomic-embed-text`).

## [0.4.4] — 2026-04-13

### Added

- Serbian language support in two scripts: Latin/latinica (`sr`) and Cyrillic/ћирилица (`sr-Cyrl`) — full UI translation across all 15 locale sections
- Language dropdown in the header redesigned as a proper menu (was a single cycling button) with real SVG flag icons via `flag-icons`
- Settings → General → Language picker redesigned as a button grid with flags
- `scripts/transliterate-sr.py` — deterministic Serbian Latin → Cyrillic transliterator that preserves brand names, English loanwords, and `{name}` template placeholders. Re-run after editing any `sr/*.json` file to keep `sr-Cyrl/` in sync.

### Changed

- `flag` field in `AVAILABLE_LOCALES` now uses ISO 3166-1 alpha-2 country codes (e.g. `'gb'`, `'rs'`) instead of emoji strings — required for proper flag rendering on platforms without flag emoji glyphs (notably Windows Chrome)
- Browser language detection now defaults to Serbian Cyrillic (`sr-Cyrl`) when the browser locale is `sr`, and Serbian Latin (`sr`) when it is `sr-Latn`

### Fixed

- `tsconfig.json` `baseUrl` deprecation warning — removed `baseUrl: "."` since modern TypeScript resolves `paths` relative to the tsconfig location automatically

### Security

- `npm audit fix` reduced known vulnerabilities from 9 to 3; the remaining 3 are all in the `vitepress → vite → esbuild` dev-only chain (no runtime impact)

## [0.4.3] — 2026-04-05

### Added

- 106 unit tests covering all core services: quality analyzer, error classifier, metrics calculator, token counter, prompt analyzer, reasoning parser
- CI test gate in release workflow — service tests must pass before npm publish and Docker build

### Fixed

- Removed cross-project reference from README

## [0.4.2] — 2026-03-21

### Added

- Analytics Dashboard — per-turn quality score (0-5), requests over time, model distribution doughnut, active hours heatmap (7x24), settings impact scatter, error timeline
- Performance Analytics — P50/P95/P99 latency over time, TTFT percentile chart, inter-token latency histogram, cold vs warm start indicators, load duration trend
- Error Intelligence — 7-category error classifier (connection, timeout, model_not_found, context_exceeded, oom, tool_error, cancelled), error rate by model stacked bar chart

## [0.4.1] — 2026-03-21

### Added

- Response Quality Gates — repetition detection (4-gram), refusal detection (8 patterns), gibberish detection, empty response detection, truncation warning, quality badges (red/yellow/green) per response
- Cost & Usage Dashboard — token usage per model/day, estimated cost display with model pricing, daily cost trend chart

## [0.4.0] — 2026-03-18

### Added

- Local AI History Database — unified queryable archive of all experiments (benchmarks, comparisons, chats, training pairs, sessions)
- History tab in Settings with filters (type, model, language, date, tags), trend charts, export (JSON/CSV), retention policies
- Powered by Dexie.js over IndexedDB — permanent, browser-native, no cloud

## [0.3.5] — 2026-03-18

### Added

- Website: Full Feature Coverage — Surgical Benchmark section (3 cards with screenshots), AI Training Pipeline (4-step animated flow), System at a Glance diagnostics
- Updated sitemap with lastmod dates
- All sections bilingual (EN + FR)

## [0.3.4] — 2026-03-18

### Added

- Benchmark Suite Builder — visual question editor (2-6 choices, category, difficulty), AI-assisted generation from topic, edit existing suites, JSON export
- Benchmark Builder guide (EN + FR)

## [0.3.3] — 2026-03-18

### Fixed

- Re-tagged from v0.3.2.2 for npm semver compatibility (npm requires 3-part versions)

## [0.3.2] — 2026-03-18

### Added

- Language Compare — per-slot prompts with language tags, inline language detection, translate-to-X with streaming, cancel support, Token Tax visualization, RTL-aware textareas
- Module 9: What Words Cost — Educators Kit module on tokenization bias (EN + FR + 6 SVGs)
- Language Compare guide and Diagnostics Token Tax section on website

## [0.3.1] — 2026-03-18

### Added

- RTL Layout Support — 119 directional CSS classes replaced with logical properties across 35 files, automatic `dir="rtl"`, directional icon flipping
- New Locales — Chinese (zh), Arabic (ar) fully translated; Hebrew (he), Japanese (ja) scaffold ready for community
- CJK Readiness — Noto Sans SC/JP/KR font stack, CJK line-breaking CSS, character-based token counting

## [0.2.0] — 2026-03-17

### Added

- npm package: run `npx llmxray` to serve LLMxRay with built-in Ollama proxy
- CLI flags: `--port` and `--ollama-url` for configuration
- Environment variable support: `PORT` and `OLLAMA_URL`
- Docker support: `docker run -p 5174:5174 lognebudo/llmxray`
- docker-compose.example.yml showing LLMxRay alongside Ollama
- Production Express server for static file serving and API proxying
- System info and API probe endpoints now work in production (not just dev)

### Fixed

- Settings page Ollama URL now actually applies to the HTTP client
- Benchmark streaming no longer hardcodes `/v1` path

## [0.1.2] — 2026-03-16

### Added

- VitePress documentation site with violet theme, local search, and EN/FR i18n
- User Guide: 10 chapters (one per navigation item) + introduction + installation
- Developer Reference: architecture, stores, services, composables, types, API integration, testing
- Full French translation of all 19 content pages
- Screenshots reused from website project (chat, compare, embeddings, KB, benchmark, system)
- CONTRIBUTING.md with development setup, code style, and PR process
- CHANGELOG.md covering all releases since initial commit

## [0.1.1] — 2026-03-16

### Added

- AI Training page with data curation, tagging, bulk operations, and export for fine-tuning
- Canvas AI insights and model selector improvements
- Tabbed Settings with model catalog, embeddings model comparison, and sidebar alignment
- Persistent chat sessions with IndexedDB backing, storage usage visuals, embeddings UX improvements, feedback system, and Knowledge Base integration
- UI polish pass: violet rebrand, dark/light mode toggle, animated indicators, and UX improvements across the app

### Changed

- Surfaced untapped Ollama data: real logprobs in chat, context truncation warning, expanded model metadata display
- Improved explanatory text for synthetic introspection visualizations

### Fixed

- Agent graph visualization for tool calls and reasoning parser re-entry bug

## [0.1.0] — 2026-03-14

### Added

- Initial release: real-time chat with token streaming, confidence coloring, session history, introspection visualizations, and prompt anatomy analysis
- Slot-based model comparison with per-slot settings, diff view (word-level), and metrics bar
- Surgical Benchmark with real logprobs via OpenAI-compatible endpoint and model capability registry
- Visual Tool Canvas with Recast AST bidirectional sync, CodeMirror 6 code highlighting, and response optimizer drawer
- Tool Workshop with Google OAuth2 integration and multi-round tool calling loop (max 5 rounds)
- Vision model support with automatic detection, image paste/upload, and lightbox viewer
- Embeddings Lab with cosine similarity meter and embedding-capable model auto-detection
- RAG pipeline: document upload (PDF, DOCX, CSV, TXT, MD), chunking, embedding, and semantic search
- My System page with accurate hardware detection via custom Vite plugin (Windows/Linux/macOS)
- Markdown rendering for chat messages with syntax-highlighted code blocks
- Educational tooltips and visual parameter scales in Settings
- Slash commands, file attachments, and tool definition UI
- Testing infrastructure: Vitest for unit tests, Playwright for E2E with live-ollama project
- Comprehensive README with feature overview, quick start guide, and architecture documentation
- Apache 2.0 license, NOTICE file, and trademark notice

### Fixed

- Benchmark resume DataCloneError when resuming interrupted benchmark runs
- Comparison slots reappearing after clear or navigation
- Native thinking field handling and session persistence issues
