# Testing

LLMxRay uses **Vitest** for unit tests and **Playwright** for end-to-end tests.

## Test Commands

| Command | Description |
|---|---|
| `npm run test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Run E2E tests (headless Chromium) |
| `npm run test:e2e:headed` | Run E2E tests with visible browser |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:live` | Run E2E tests against live Ollama |
| `npm run test:e2e:live:headed` | Live Ollama tests with visible browser |
| `npm run test:e2e:all` | Run all E2E test projects |

## Unit Tests (Vitest)

### Configuration

**File:** `vitest.config.ts`

```typescript
{
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}
```

- **Environment:** `happy-dom` — A lightweight DOM implementation for testing Vue components
- **Globals:** `true` — Makes `describe`, `it`, `expect` available without imports
- **Test files:** `src/**/*.test.ts` — Co-located with source files

### Writing Unit Tests

Place test files next to the code they test:

```
src/services/
  reasoning-parser.ts
  reasoning-parser.test.ts
```

Example test:

```typescript
import { describe, it, expect } from 'vitest'
import { parseThinkBlocks } from './reasoning-parser'

describe('parseThinkBlocks', () => {
  it('extracts think block content', () => {
    const input = '<think>reasoning here</think>answer'
    const result = parseThinkBlocks(input)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].content).toBe('reasoning here')
  })
})
```

## End-to-End Tests (Playwright)

### Configuration

**File:** `playwright.config.ts`

Two test projects:

#### chromium (default)
- Runs all tests **except** `live-ollama` specs
- Uses a Vite dev server on port 5199
- No Ollama required — tests mock API responses

#### live-ollama
- Runs only `live-ollama.spec.ts`
- Requires a running Ollama instance with models
- Timeout: 120 seconds per test (model loading can be slow)

### Test Directory

```
e2e/
  example.spec.ts        # Basic app tests
  live-ollama.spec.ts    # Tests requiring real Ollama
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('dashboard loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Chat Diagnostics')).toBeVisible()
})
```

### Running Against Live Ollama

The `live-ollama` project tests real model interactions:

```bash
# Make sure Ollama is running with at least one model
ollama serve
ollama pull llama3.2

# Run live tests
npm run test:e2e:live
```

## Before Submitting

Always run both test suites before submitting a PR:

```bash
npm run test          # Unit tests pass
npm run build         # Type-check + build succeeds
npm run test:e2e      # E2E tests pass (no Ollama required)
```
