# Changelog

All notable changes to LLMxRay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
