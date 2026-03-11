import type { Page } from '@playwright/test'

/**
 * Sends a slash command by filling the textarea and clicking the send button.
 * Avoids pressing Enter which gets intercepted by the slash command dropdown.
 */
export async function sendSlashCommand(page: Page, command: string) {
  const textarea = page.locator('textarea').first()
  await textarea.fill(command)
  // Click send button to bypass dropdown interception on Enter
  await page.locator('button[title="Send message"]').click()
}

/**
 * Sends a regular chat message by pressing Enter.
 */
export async function sendMessage(page: Page, message: string) {
  const textarea = page.locator('textarea').first()
  await textarea.fill(message)
  await textarea.press('Enter')
}
