# Contributing to LLMxRay

Thank you for your interest in contributing to LLMxRay! This document explains how to get started.

## Philosophy

LLMxRay is a **free, local-first** tool for understanding what happens inside local LLMs. Contributions should align with these principles:

- **Local-first** — No cloud dependencies, no external API keys required
- **Zero cost** — Everything must work without paid services
- **Educational** — Help users understand AI, not just use it
- **Transparent** — Show the user what's happening, don't hide complexity

## Development Setup

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Ollama** running locally — [Download](https://ollama.com/download)
- At least one model pulled: `ollama pull llama3.2`

### Getting Started

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

The app runs at http://localhost:5173 with automatic proxying to Ollama at localhost:11434.

## Code Style

- **Vue 3 Composition API** with `<script setup lang="ts">` — no Options API
- **TypeScript** in strict mode — all new code must be fully typed
- **Tailwind CSS 4.2** for styling — avoid custom CSS unless necessary
- **Pinia 3** for state management — one store per concern
- **`shallowRef`** for high-frequency reactive data (e.g., token arrays)

### File Organization

- Components go in `src/components/<feature>/`
- Stores go in `src/stores/`
- Services go in `src/services/`
- Types go in `src/types/`
- Composables go in `src/composables/`

### Naming Conventions

- Components: `PascalCase.vue`
- Stores: `<domain>-store.ts` (e.g., `token-store.ts`)
- Services: `<domain>-service.ts` or `<name>.ts`
- Types: `<domain>.ts`
- Composables: `use<Name>.ts`

## Commit Messages

Follow the existing commit message style:

- **New feature:** `Add <feature description>`
- **Bug fix:** `Fix <bug description>`
- **Improvement:** `Improve <what was improved>`
- **Refactor:** `Refactor <what was refactored>`

Keep messages concise but descriptive. Reference the area of the app affected.

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `master` with a descriptive name (e.g., `add-export-csv`, `fix-benchmark-resume`)
3. **Make your changes** following the code style above
4. **Test your changes:**
   ```bash
   npm run test          # Unit tests pass
   npm run build         # Type-check + production build succeeds
   npm run test:e2e      # E2E tests pass (no Ollama required)
   ```
5. **Submit a PR** to `master` with a clear description of what changed and why

## Testing

### Unit Tests (Vitest)

```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

Place test files next to the code they test: `my-service.test.ts` alongside `my-service.ts`.

### End-to-End Tests (Playwright)

```bash
npm run test:e2e          # Headless (no Ollama needed)
npm run test:e2e:headed   # With visible browser
npm run test:e2e:live     # Against live Ollama (requires running instance)
```

### Documentation

```bash
cd docs
npm install
npm run dev               # Preview docs locally
```

## Reporting Issues

Use our structured issue templates:

- **[Bug Report](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Something isn't working as expected
- **[Feature Request](https://github.com/LogneBudo/llmxray/issues/new?template=feature-request.yml)** — Suggest a new feature or improvement
- **[Benchmark Submission](https://github.com/LogneBudo/llmxray/issues/new?template=benchmark-submission.yml)** — Share your benchmark results
- **[Showcase Submission](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml)** — Share an interesting finding

For general questions, use [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions).

## Community Contributions

Beyond code, you can contribute:

- **Benchmark suites** — Add custom test suites in `community-benchmarks/`. See [SCHEMA.md](community-benchmarks/SCHEMA.md) for the format.
- **Tool templates** — Add Tool Workshop templates in `community-tools/`. See [SCHEMA.md](community-tools/SCHEMA.md) for the format.
- **Showcase findings** — Submit interesting discoveries via the [Showcase issue template](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml).

## Discussions

Join the conversation on [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions):

- **Model Insights** — Share interesting model behaviors
- **Benchmark Results** — Post and compare benchmark runs
- **Tool Recipes** — Share Tool Workshop configurations
- **Help** — Get help with installation and usage
- **Feature Ideas** — Discuss ideas before filing issues

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
