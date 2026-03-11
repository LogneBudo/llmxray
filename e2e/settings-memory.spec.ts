import { test, expect } from '@playwright/test'
import { mockOllamaApi } from './helpers/ollama-mock'
import { sendSlashCommand } from './helpers/commands'

/** Opens the chat settings side panel */
async function openSettings(page: import('@playwright/test').Page) {
  // The settings button is in the top bar, not the sidebar
  const topBar = page.locator('.border-b.border-border-default.bg-surface-raised')
  await topBar.locator('button').filter({ hasText: 'Settings' }).click()
  // Wait for the panel header
  await expect(page.locator('.border-l.border-border-default')).toBeVisible()
}

/** Expands the Memory collapsible section in the settings panel */
async function expandMemorySection(page: import('@playwright/test').Page) {
  // The Memory button is deep inside the scrollable settings panel.
  // Scroll the overflow container to the bottom so the button is in view.
  const scrollContainer = page.locator('.border-l.border-border-default .overflow-y-auto')
  await scrollContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight))

  // The Memory toggle button is a full-width collapsible button with ▾ arrow.
  // It's the same structure as the Tools button but with text "Memory".
  const memoryBtn = scrollContainer.locator('button.w-full').filter({ hasText: 'Memory' })
  await memoryBtn.click()
  // Wait for content to appear
  await expect(page.getByText('Sliding Window')).toBeVisible({ timeout: 5_000 })
}

test.describe('Settings panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')
  })

  test('settings panel opens and closes', async ({ page }) => {
    await openSettings(page)

    // Panel header "Chat Settings" visible
    const panelHeader = page.locator('.border-l.border-border-default').getByText('Chat Settings', { exact: true })
    await expect(panelHeader).toBeVisible()

    // Close via the X button in the panel's header row
    const headerRow = page.locator('.border-l.border-border-default .border-b')
    await headerRow.locator('button').click()

    // Panel should disappear
    await expect(page.locator('.border-l.border-border-default')).not.toBeVisible({ timeout: 2_000 })
  })

  test('system prompt textarea is editable', async ({ page }) => {
    await openSettings(page)

    const systemPrompt = page.locator('.border-l textarea')
    await systemPrompt.fill('You are a helpful coding assistant.')
    await expect(systemPrompt).toHaveValue('You are a helpful coding assistant.')
  })

  test('temperature slider adjusts value', async ({ page }) => {
    await openSettings(page)

    const settingsPanel = page.locator('.border-l.border-border-default')
    await expect(settingsPanel.getByText('Temperature')).toBeVisible()
    const tempSlider = settingsPanel.locator('input[type="range"]').first()
    await tempSlider.fill('1.5')

    await expect(settingsPanel.getByText('1.50')).toBeVisible()
  })
})

test.describe('Memory settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')
    await openSettings(page)
  })

  test('memory section is expandable', async ({ page }) => {
    await expandMemorySection(page)
    await expect(page.getByText('Sliding Window')).toBeVisible()
    await expect(page.getByText('Auto-Summarize')).toBeVisible()
    await expect(page.getByText('User Memories')).toBeVisible()
  })

  test('memory has custom toggle buttons', async ({ page }) => {
    await expandMemorySection(page)
    // Toggle buttons are small rounded-full buttons (h-4 w-7)
    const toggles = page.locator('button.rounded-full')
    const count = await toggles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('/remember stores a fact visible in settings', async ({ page }) => {
    await sendSlashCommand(page, '/remember I prefer dark mode')
    await expect(page.getByText('Remembered')).toBeVisible({ timeout: 3_000 })

    // Expand memory section to see the fact
    await expandMemorySection(page)
    await expect(page.getByText('I prefer dark mode', { exact: true })).toBeVisible({ timeout: 3_000 })
  })

  test('/memories shows stored facts', async ({ page }) => {
    // Remember a fact first
    await sendSlashCommand(page, '/remember I use Ollama for local inference')
    await expect(page.getByText('Remembered')).toBeVisible({ timeout: 3_000 })

    // Dismiss notification
    const dismiss = page.locator('button').filter({ hasText: '✕' }).first()
    if (await dismiss.isVisible()) await dismiss.click()

    // Show all memories
    await sendSlashCommand(page, '/memories')
    await expect(page.getByText('I use Ollama for local inference')).toBeVisible({ timeout: 3_000 })
  })

  test('/forget removes a stored fact', async ({ page }) => {
    await sendSlashCommand(page, '/remember Test fact to forget')
    await expect(page.getByText('Remembered')).toBeVisible({ timeout: 3_000 })

    const dismiss = page.locator('button').filter({ hasText: '✕' }).first()
    if (await dismiss.isVisible()) await dismiss.click()

    await sendSlashCommand(page, '/forget Test fact')
    await expect(page.getByText('Forgot fact')).toBeVisible({ timeout: 3_000 })
  })
})

test.describe('Model selector', () => {
  test('shows loaded models in dropdown', async ({ page }) => {
    await mockOllamaApi(page, {
      models: [
        { name: 'llama3:latest', size: 4e9, modified_at: '2024-01-01T00:00:00Z' },
        { name: 'codellama:7b', size: 3e9, modified_at: '2024-01-01T00:00:00Z' },
        { name: 'mistral:latest', size: 4e9, modified_at: '2024-01-01T00:00:00Z' },
      ],
    })
    await page.goto('/')

    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    const options = select.locator('option')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('switching model changes the selection', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    const select = page.locator('select').first()
    await select.selectOption('mistral:latest')
    await expect(select).toHaveValue('mistral:latest')
  })
})

test.describe('Navigation', () => {
  test('/compare navigates to compare page', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    await sendSlashCommand(page, '/compare')
    await expect(page).toHaveURL(/\/compare/, { timeout: 5_000 })
  })

  test('/tools opens settings panel', async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')

    await sendSlashCommand(page, '/tools')
    await expect(page.getByText('Settings panel opened')).toBeVisible({ timeout: 3_000 })
  })
})
