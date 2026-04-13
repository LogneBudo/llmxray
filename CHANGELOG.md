# Changelog

All notable changes to LLMxRay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
