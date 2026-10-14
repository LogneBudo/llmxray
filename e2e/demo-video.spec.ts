/**
 * Demo video for the README GIF: one chat turn streaming with confidence colour.
 * Part of the "screenshots" Playwright project; scripts/readme-media.mjs turns
 * the resulting demo.webm into demo.gif.
 */
import { test, expect } from './helpers/ollama-live'
import path from 'node:path'
import { MODELS, OUT, VIEWPORT, pickChatModel, waitChatDone } from './helpers/readme-media'

test.use({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  video: { mode: 'on', size: VIEWPORT },
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript((locale) => {
    localStorage.setItem('llmxray-theme', 'dark')
    localStorage.setItem('llmxray-locale', locale)
  }, process.env.SHOT_LOCALE ?? 'en')
})

test('record a chat turn', async ({ page }) => {
  test.setTimeout(600_000)
  // Load the model before recording, so the video shows streaming and not a cold start.
  await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELS.video, prompt: 'hi', stream: false, options: { num_predict: 1 } }),
  })
  await page.goto('/')
  await expect(page.getByText('Ollama connected')).toBeVisible({ timeout: 20_000 })
  await pickChatModel(page, MODELS.video)
  await page.waitForTimeout(1200)
  const textarea = page.locator('textarea').first()
  await textarea.pressSequentially('In about 250 words, what actually happens when I send a prompt to a local model?', { delay: 35 })
  await page.waitForTimeout(600)
  await textarea.press('Enter')
  await waitChatDone(page)
  await page.waitForTimeout(1500)
  const toggle = page.locator('button', { hasText: /sessions · Avg/ }).first()
  if (await toggle.isVisible()) await toggle.click()
  await page.waitForTimeout(2500)
  const video = page.video()
  await page.close()
  if (video) await video.saveAs(path.join(OUT, 'demo.webm'))
})
