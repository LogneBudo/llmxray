# Changelog

All notable changes to LLMxRay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-03-16

### Added

- AI Training page with data curation, tagging, bulk operations, and export for fine-tuning (`1f511e5`)
- Canvas AI insights and model selector improvements (`1f511e5`)
- Tabbed Settings with model catalog, embeddings model comparison, and sidebar alignment (`31f8d54`)
- Persistent chat sessions with IndexedDB backing, storage usage visuals, embeddings UX improvements, feedback system, and Knowledge Base integration (`21306bc`)
- UI polish pass: violet rebrand, dark/light mode toggle, animated indicators, and UX improvements across the app (`562c609`)
- Vision model support with automatic detection, image paste/upload, and lightbox viewer (`c44e613`)
- Surgical Benchmark with real logprobs via OpenAI-compatible endpoint, model capability registry, and tool canvas enhancements (`5b36fe7`)
- Visual Tool Canvas with Recast AST bidirectional sync, CodeMirror 6 code highlighting, and response optimizer drawer (`5ff2c12`)
- Tool Workshop with Google OAuth2 integration and multi-round tool calling loop (max 5 rounds) (`57d20d7`)
- Slot-based model comparison with per-slot settings, diff view (word-level), and metrics bar (`18ab66f`)
- Markdown rendering for chat messages with syntax-highlighted code blocks (`ce25292`)
- Educational tooltips and visual parameter scales in Settings (`83bd7cf`)
- My System page with accurate hardware detection via custom Vite plugin (Windows/Linux/macOS) (`b3322c0`)
- Testing infrastructure: Vitest for unit tests, Playwright for E2E with live-ollama project (`08e6f26`)
- Slash commands, file attachments, and tool definition UI (`7711e34`)
- Initial release: real-time chat with token streaming, confidence coloring, session history, introspection visualizations, and prompt anatomy analysis (`4829cc1`)
- Comprehensive README with feature overview, quick start guide, and architecture documentation (`5ea0ec2`)
- Apache 2.0 license, NOTICE file, and trademark notice (`4dcb1b0`, `6510bc4`)

### Fixed

- Benchmark resume DataCloneError when resuming interrupted benchmark runs (`1d070b4`)
- Agent graph visualization for tool calls and reasoning parser re-entry bug (`b51a943`)
- Comparison slots reappearing after clear or navigation (`bdca273`)
- Native thinking field handling and session persistence issues (`08e6f26`)

### Changed

- Improved explanatory text for synthetic introspection visualizations to better communicate illustrative nature (`89c1c26`)
- Surfaced untapped Ollama data: real logprobs in chat, context truncation warning, expanded model metadata display (`1dd720d`)
- Added rich hover tooltips to comparison preset buttons (`0bd1fca`)
- Expanded benchmark suites with additional questions (`1d070b4`)
