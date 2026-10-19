import { expect, type Page } from '@playwright/test'

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
 * Sends a regular chat message by pressing Enter, once sending is possible: a model is
 * selected and no attached file is still being read. Enter before that keeps the text.
 */
export async function sendMessage(page: Page, message: string) {
  const textarea = page.locator('textarea').first()
  await textarea.fill(message)
  await expect(page.locator('button[title="Send message"]')).toBeEnabled({ timeout: 10_000 })
  await textarea.press('Enter')
}

/** The chat's model picker: a button that opens a listbox of models. */
export function modelPicker(page: Page) {
  return page.getByRole('button', { name: /^Select a model/ })
}

/** Picks a model from the chat's model picker. */
export async function chooseModel(page: Page, name: string) {
  await modelPicker(page).click()
  await page.getByRole('option', { name }).click()
}

/** The chat settings side panel, once it is open. */
export function settingsPanel(page: Page) {
  return page.getByRole('complementary', { name: 'Chat Settings' })
}
