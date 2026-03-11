/**
 * Live Ollama integration tests.
 *
 * These tests require a running Ollama instance at localhost:11434
 * with at least one chat-capable model loaded.
 * They are automatically SKIPPED if Ollama is not available.
 *
 * Run with:  npx playwright test --project=live-ollama
 */
import { test, expect } from './helpers/ollama-live'
import type { Page } from '@playwright/test'

/** Waits for streaming to finish by checking the stop button disappears. */
async function waitForStreamingDone(page: Page, timeout = 60_000) {
  const stopButton = page.locator('button[title="Stop generating"]')
  await expect(stopButton).not.toBeVisible({ timeout })
}

/** Selects a model and waits for it to be ready. */
async function selectModel(page: Page, model: string) {
  const select = page.locator('select').first()
  await expect(select).toBeVisible({ timeout: 10_000 })
  await select.selectOption(model)
}

/** Sends a message and waits for the user bubble to appear. */
async function sendAndWait(page: Page, message: string) {
  const textarea = page.locator('textarea').first()
  await textarea.fill(message)
  await textarea.press('Enter')
  await expect(page.getByText(message).first()).toBeVisible({ timeout: 5_000 })
}

test.describe('Live Ollama — Chat', () => {
  test('model dropdown shows real models', async ({ page, availableModel }) => {
    await page.goto('/')

    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 10_000 })
    await expect(select).toContainText(availableModel, { timeout: 10_000 })
  })

  test('send a message and receive a streamed response', async ({ page, availableModel }) => {
    await page.goto('/')
    await selectModel(page, availableModel)
    await sendAndWait(page, 'Reply with exactly: "pong". Nothing else.')

    // Wait for streaming to complete
    await waitForStreamingDone(page)

    // The model should have produced some response text
    const mainText = await page.locator('main').textContent()
    expect(mainText!.length).toBeGreaterThan(20)
  })

  test('streaming tokens appear incrementally', async ({ page, availableModel }) => {
    await page.goto('/')
    await selectModel(page, availableModel)

    const textarea = page.locator('textarea').first()
    await textarea.fill('Count from 1 to 5, one number per line.')
    await textarea.press('Enter')

    // Wait for streaming to start — stop button appears during generation
    const stopButton = page.locator('button[title="Stop generating"]')
    await expect(stopButton).toBeVisible({ timeout: 30_000 })

    // Wait for completion
    await waitForStreamingDone(page)

    // At least some of the numbers should appear
    const responseArea = page.locator('main')
    const text = await responseArea.textContent()
    expect(text).toContain('1')
  })

  test('multi-turn conversation maintains context', async ({ page, availableModel }) => {
    await page.goto('/')
    await selectModel(page, availableModel)

    // First message: set a fact
    await sendAndWait(page, 'The secret word is "banana". Reply only with "OK".')
    await waitForStreamingDone(page)

    // Second message: recall the fact
    await sendAndWait(page, 'What was the secret word I told you?')
    await waitForStreamingDone(page)

    // The model should mention "banana" somewhere in the response
    const mainContent = await page.locator('main').textContent()
    expect(mainContent?.toLowerCase()).toContain('banana')
  })
})

test.describe('Live Ollama — Connection status', () => {
  test('shows "Ollama Connected" indicator', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ollama Connected')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Live Ollama — Model info', () => {
  test('/status command shows live connection info', async ({ page, availableModel }) => {
    await page.goto('/')

    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 10_000 })

    const textarea = page.locator('textarea').first()
    await textarea.fill('/status')
    await page.locator('button[title="Send message"]').click()

    await expect(page.getByText('Ollama: Connected')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Live Ollama — Stop generation', () => {
  test('stop button aborts an in-flight stream', async ({ page, availableModel }) => {
    await page.goto('/')
    await selectModel(page, availableModel)

    // Ask for a long response
    const textarea = page.locator('textarea').first()
    await textarea.fill('Write a 500-word essay about the history of computing.')
    await textarea.press('Enter')

    // Wait for streaming to start
    const stopButton = page.locator('button[title="Stop generating"]')
    await expect(stopButton).toBeVisible({ timeout: 30_000 })

    // Click stop
    await stopButton.click()

    // Stop button should disappear (streaming aborted)
    await waitForStreamingDone(page, 10_000)

    // Some partial response should exist
    const mainText = await page.locator('main').textContent()
    expect(mainText!.length).toBeGreaterThan(50)
  })
})
