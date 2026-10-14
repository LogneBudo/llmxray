import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import path from 'node:path'

/** Where README media is written. */
export const OUT = process.env.SHOTS_DIR ?? path.resolve('docs/public/screenshots')

/** Models the captures use. Chosen for recognisable names and reasonable speed. */
export const MODELS = {
  chat: process.env.SHOT_MODEL_CHAT ?? 'gemma4:latest',
  /** The demo video wants visible streaming from the first second, so no hidden thinking phase. */
  video: process.env.SHOT_MODEL_VIDEO ?? 'llama3.1:8b',
  compare: process.env.SHOT_MODEL_COMPARE ?? 'gemma4:latest',
  benchmark: process.env.SHOT_MODEL_BENCH ?? 'qwen2.5:7b',
  fast: process.env.SHOT_MODEL_FAST ?? 'qwen2.5:3b',
  fim: process.env.SHOT_MODEL_FIM ?? 'qwen2.5-coder:1.5b',
  embed: process.env.SHOT_MODEL_EMBED ?? 'nomic-embed-text:latest',
}

export const VIEWPORT = { width: 1440, height: 900 }

export async function shot(page: Page, name: string) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
}

/** Client-side navigation through the sidebar, so in-memory stores survive. */
export async function nav(page: Page, href: string) {
  await page.locator(`aside a[href="${href}"]`).first().click()
  await page.waitForURL(`**${href}`)
  await page.waitForTimeout(300)
}

/** Picks a model in the chat page's custom dropdown. */
export async function pickChatModel(page: Page, model: string) {
  const trigger = page.locator('button', { hasText: /:/ }).first()
  await trigger.click()
  await page.locator('button', { hasText: model }).last().dispatchEvent('mousedown')
  await page.keyboard.press('Escape')
}

export async function sendChat(page: Page, text: string) {
  const textarea = page.locator('textarea').first()
  await textarea.fill(text)
  await textarea.press('Enter')
  await expect(page.locator('button[title="Stop generating"]')).toBeVisible({ timeout: 60_000 })
}

export async function waitChatDone(page: Page) {
  await expect(page.locator('button[title="Send message"]')).toBeVisible({ timeout: 240_000 })
}


/** Scrolls every scrollable container to its end, so the newest content is in view. */
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight
    }
  })
  await page.waitForTimeout(300)
}
