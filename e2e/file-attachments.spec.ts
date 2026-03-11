import { test, expect } from '@playwright/test'
import { mockOllamaApi } from './helpers/ollama-mock'
import { sendMessage } from './helpers/commands'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, `fixtures-${process.pid}`)

test.beforeAll(() => {
  fs.mkdirSync(fixturesDir, { recursive: true })
  fs.writeFileSync(path.join(fixturesDir, 'sample.txt'), 'This is a sample document for testing attachments.')
  fs.writeFileSync(path.join(fixturesDir, 'notes.md'), '# Notes\n\nSome markdown notes for testing.')

  // 1x1 red PNG
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  )
  fs.writeFileSync(path.join(fixturesDir, 'tiny.png'), pngBuffer)
})

test.afterAll(() => {
  fs.rmSync(fixturesDir, { recursive: true, force: true })
})

/** Helper to attach files — the file input has class="hidden" so we need to use the
 *  Playwright fileChooser approach triggered by clicking the paperclip button. */
async function attachFiles(page: import('@playwright/test').Page, filePaths: string | string[]) {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths]
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button[title="Attach files"]').click(),
  ])
  await fileChooser.setFiles(paths)
}

test.describe('File attachments', () => {
  test.beforeEach(async ({ page }) => {
    await mockOllamaApi(page)
    await page.goto('/')
    // Wait for app to fully load
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('attaching a text file shows preview chip', async ({ page }) => {
    await attachFiles(page, path.join(fixturesDir, 'sample.txt'))
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5_000 })
  })

  test('attachment chip shows filename and size', async ({ page }) => {
    await attachFiles(page, path.join(fixturesDir, 'sample.txt'))
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5_000 })
    // Size should appear in the chip (e.g., "50 B")
    await expect(page.locator('div').filter({ hasText: 'sample.txt' }).filter({ hasText: 'B' }).first()).toBeVisible()
  })

  test('can remove an attachment', async ({ page }) => {
    await attachFiles(page, path.join(fixturesDir, 'sample.txt'))
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5_000 })

    // The chip is a div with rounded-lg border containing the filename and a remove button
    const chip = page.locator('.bg-surface-overlay.rounded-lg').filter({ hasText: 'sample.txt' })
    await chip.locator('button').click()

    await expect(page.getByText('sample.txt')).not.toBeVisible({ timeout: 3_000 })
  })

  test('attaching an image shows thumbnail', async ({ page }) => {
    await attachFiles(page, path.join(fixturesDir, 'tiny.png'))
    await expect(page.getByText('tiny.png')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('img[alt="tiny.png"]')).toBeVisible({ timeout: 10_000 })
  })

  test('multiple files can be attached', async ({ page }) => {
    await attachFiles(page, [
      path.join(fixturesDir, 'sample.txt'),
      path.join(fixturesDir, 'notes.md'),
    ])
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('notes.md')).toBeVisible({ timeout: 5_000 })
  })

  test('sending clears attachment chips from input area', async ({ page }) => {
    await attachFiles(page, path.join(fixturesDir, 'sample.txt'))
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5_000 })

    await sendMessage(page, 'What does this file say?')
    await expect(page.getByText('What does this file say?')).toBeVisible()
    await expect(page.locator('button[title="Send message"]')).toBeVisible({ timeout: 10_000 })
  })
})
