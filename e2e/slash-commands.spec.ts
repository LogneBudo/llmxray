import { test, expect } from '@playwright/test'
import { mockOllamaApi } from './helpers/ollama-mock'
import { sendSlashCommand, sendMessage } from './helpers/commands'

test.describe('Slash commands', () => {
  test.beforeEach(async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')
  })

  test('typing / shows the slash command dropdown', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/')

    await expect(page.locator('button').filter({ hasText: '/help' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '/clear' })).toBeVisible()
  })

  test('filtering narrows down the command list', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/temp')

    await expect(page.locator('button').filter({ hasText: '/temperature' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '/clear' })).not.toBeVisible()
  })

  test('clicking a command fills it in the input', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/')

    const helpButton = page.locator('button').filter({ hasText: '/help' })
    await helpButton.click()

    await expect(textarea).toHaveValue(/\/help/)
  })

  test('/clear resets conversation', async ({ page }) => {
    // First send a message
    await sendMessage(page, 'Hello')
    await expect(page.getByText('Hello! How can I help you today?')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button[title="Send message"]')).toBeVisible({ timeout: 5_000 })

    // Execute /clear via send button
    await sendSlashCommand(page, '/clear')

    await expect(page.getByText('Conversation cleared.')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText('Start a conversation with a local model')).toBeVisible()
  })

  test('/help shows available commands', async ({ page }) => {
    await sendSlashCommand(page, '/help')
    await expect(page.getByText('Available commands')).toBeVisible({ timeout: 3_000 })
  })

  test('/model with no arg shows available models', async ({ page }) => {
    await sendSlashCommand(page, '/model')
    await expect(page.getByText('Available models')).toBeVisible({ timeout: 3_000 })
  })

  test('/model switches to a valid model', async ({ page }) => {
    await sendSlashCommand(page, '/model mistral:latest')
    await expect(page.getByText('Switched to mistral:latest')).toBeVisible({ timeout: 3_000 })

    const modelSelect = page.locator('select').first()
    await expect(modelSelect).toHaveValue('mistral:latest')
  })

  test('/temperature sets temperature with valid value', async ({ page }) => {
    await sendSlashCommand(page, '/temperature 0.5')
    await expect(page.getByText('Temperature set to 0.5.')).toBeVisible({ timeout: 3_000 })
  })

  test('/temperature rejects invalid value', async ({ page }) => {
    await sendSlashCommand(page, '/temperature 99')
    await expect(page.getByText(/Usage: \/temperature/)).toBeVisible({ timeout: 3_000 })
  })

  test('/system sets system prompt', async ({ page }) => {
    await sendSlashCommand(page, '/system You are a helpful pirate')
    await expect(page.getByText('System prompt updated.')).toBeVisible({ timeout: 3_000 })
  })

  test('unknown command shows error', async ({ page }) => {
    await sendSlashCommand(page, '/nonexistent')
    await expect(page.getByText('Unknown command')).toBeVisible({ timeout: 3_000 })
  })

  test('slash command button opens dropdown', async ({ page }) => {
    const slashButton = page.locator('button[title="Commands"]')
    await slashButton.click()
    await expect(page.locator('button').filter({ hasText: '/help' })).toBeVisible()
  })

  test('dropdown shows category labels', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/')
    await expect(page.getByText('Chat & Conversation').first()).toBeVisible()
    await expect(page.getByText('Model & Settings').first()).toBeVisible()
  })

  test('keyboard navigation works in dropdown', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/')
    await expect(page.locator('button').filter({ hasText: '/help' })).toBeVisible()

    await textarea.press('ArrowDown')
    await textarea.press('Enter')

    const value = await textarea.inputValue()
    expect(value.startsWith('/')).toBe(true)
  })

  test('Escape closes the dropdown', async ({ page }) => {
    const textarea = page.locator('textarea').first()
    await textarea.fill('/')
    await expect(page.locator('button').filter({ hasText: '/help' })).toBeVisible()

    await textarea.press('Escape')
    await expect(page.locator('button').filter({ hasText: '/help' })).not.toBeVisible({ timeout: 2_000 })
  })
})
