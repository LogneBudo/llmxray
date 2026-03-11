import { defineConfig } from '@playwright/test'

const E2E_PORT = 5199

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${E2E_PORT}`,
    port: E2E_PORT,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /live-ollama/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'live-ollama',
      testMatch: /live-ollama\.spec\.ts/,
      timeout: 120_000,
      expect: { timeout: 60_000 },
      use: {
        browserName: 'chromium',
        video: 'retain-on-failure',
      },
    },
  ],
})
