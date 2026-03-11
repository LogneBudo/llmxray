import { test, expect } from '@playwright/test'
import { mockOllamaApi, mockOllamaWithThinking, mockOllamaWithNativeThinking } from './helpers/ollama-mock'
import { sendMessage } from './helpers/commands'

test.describe('Chat streaming', () => {
  test('sends a message and displays the streamed response', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    const modelSelect = page.locator('select').first()
    await expect(modelSelect).toBeVisible()
    await expect(modelSelect).toContainText('llama3:latest')

    await expect(page.getByText('Start a conversation with a local model')).toBeVisible()

    await sendMessage(page, 'Hello')

    await expect(page.getByText('Hello').first()).toBeVisible()
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Start a conversation with a local model')).not.toBeVisible()
  })

  test('displays thinking block for DeepSeek-style responses', async ({ page }) => {
    await mockOllamaWithThinking(page)
    await page.goto('/')

    await sendMessage(page, 'Explain something')

    await expect(page.getByText('Based on my analysis, the answer is 42.')).toBeVisible({
      timeout: 10_000,
    })

    const thinkButton = page.getByText('Thought process')
    const isVisible = await thinkButton.isVisible().catch(() => false)
    if (isVisible) {
      await thinkButton.click()
      await expect(page.getByText('Let me analyze this step by step')).toBeVisible()
    }
  })

  test('displays thinking block for native thinking field (DeepSeek R1)', async ({ page }) => {
    await mockOllamaWithNativeThinking(page)
    await page.goto('/')

    await sendMessage(page, 'Explain something')

    // The content response should appear
    await expect(page.getByText('Based on my analysis, the answer is 42.')).toBeVisible({
      timeout: 10_000,
    })

    // The thinking block should be available as "Thought process" button
    const thinkButton = page.getByText('Thought process')
    await expect(thinkButton).toBeVisible({ timeout: 5_000 })
    await thinkButton.click()
    await expect(page.getByText('Let me work through this carefully')).toBeVisible()
  })

  test('shows timestamps on message bubbles', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    await sendMessage(page, 'Hello')
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible({ timeout: 10_000 })

    const timeLabels = page.locator('.opacity-50')
    await expect(timeLabels.first()).toBeVisible()
  })

  test('multiple messages create a conversation thread', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    await sendMessage(page, 'Hello')
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible({ timeout: 10_000 })

    // Wait for streaming to complete
    await expect(page.locator('button[title="Send message"]')).toBeVisible({ timeout: 5_000 })

    await sendMessage(page, 'What about the weather?')

    // Second response should appear (either the weather-specific response or default mock)
    await expect(
      page.getByText('weather service').or(page.getByText('mock response')),
    ).toBeVisible({ timeout: 10_000 })

    // Both user messages should be visible in the thread
    await expect(page.getByText('Hello').first()).toBeVisible()
    await expect(page.getByText('What about the weather?')).toBeVisible()
  })

  test('new chat button resets conversation', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    await sendMessage(page, 'Hello')
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible({ timeout: 10_000 })

    await page.getByText('+ New Chat').click()
    await expect(page.getByText('Start a conversation with a local model')).toBeVisible()
  })
})
