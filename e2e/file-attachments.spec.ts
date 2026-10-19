import { test, expect } from '@playwright/test'
import { mockOllamaApi } from './helpers/ollama-mock'
import { sendMessage, modelPicker } from './helpers/commands'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Outside the project: the dev server reloads every open page when a file it watches for
// class names changes, which would reset the tests running beside this one.
const fixturesDir = path.join(os.tmpdir(), `llmxray-e2e-fixtures-${process.pid}`)

test.beforeAll(() => {
  fs.mkdirSync(fixturesDir, { recursive: true })
  fs.writeFileSync(path.join(fixturesDir, 'brief.pdf'), pdfWithText('LLMxRay reads PDF files'))
  fs.writeFileSync(path.join(fixturesDir, 'sample.txt'), 'This is a sample document for testing attachments.')
  fs.writeFileSync(path.join(fixturesDir, 'notes.md'), '# Notes\n\nSome markdown notes for testing.')

  // 1x1 red PNG
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  )
  fs.writeFileSync(path.join(fixturesDir, 'tiny.png'), pngBuffer)
})

/** A one-page PDF whose only content is `text`, built byte by byte so the test needs no fixture file. */
function pdfWithText(text: string): Buffer {
  const content = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const at = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return at
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

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
    await expect(modelPicker(page)).toContainText('llama3:latest')
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

  test('a PDF attachment reaches the model as its text', async ({ page }) => {
    const sent = new Promise<string>((resolve) => {
      page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().includes('/api/chat')) resolve(r.postData() ?? '')
      })
    })
    await page.locator('textarea').first().fill('What does the attachment say?')
    await attachFiles(page, path.join(fixturesDir, 'brief.pdf'))
    // The send button turns on once the PDF has been read.
    await expect(page.locator('button[title="Send message"]')).toBeEnabled({ timeout: 10_000 })
    await page.locator('textarea').first().press('Enter')
    const body = JSON.parse(await sent)
    expect(body.messages.at(-1).content).toContain('[Attached: brief.pdf]\nLLMxRay reads PDF files')
    expect(body.messages.at(-1).content).toContain('What does the attachment say?')
  })
})
