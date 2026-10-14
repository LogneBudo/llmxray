/**
 * README media capture.
 *
 * Produces every screenshot README.md references, plus the demo video the GIF is
 * cut from, at one viewport and one theme, against the real Ollama daemon.
 *
 * Run with:  npm run screenshots        (wraps this and the GIF conversion)
 *       or:  npx playwright test --project=screenshots
 *
 * Needs: Ollama at localhost:11434 with the models named in MODELS below.
 * Output: docs/public/screenshots/*.png and demo.webm (SHOTS_DIR to override).
 */
import { test, expect } from './helpers/ollama-live'
import type { Page } from '@playwright/test'
import { MODELS, OUT, VIEWPORT, nav, pickChatModel, scrollToBottom, sendChat, shot, waitChatDone } from './helpers/readme-media'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OBSERVE = `http://localhost:${process.env.OBSERVE_PORT || 11435}`

test.use({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: 'dark',
})

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }))

test.beforeEach(async ({ page }) => {
  await page.addInitScript((locale) => {
    localStorage.setItem('llmxray-theme', 'dark')
    localStorage.setItem('llmxray-locale', locale)
  }, process.env.SHOT_LOCALE ?? 'en')
})

// ---------------------------------------------------------------------------
// Journey: chat → session → compare → analytics → costs → system → chat panel.
// These pages read in-memory stores, so it is one page, navigated in-app.
// ---------------------------------------------------------------------------
test('journey: chat, session, compare, analytics, costs', async ({ page }) => {
  test.setTimeout(900_000)
  await page.goto('/')
  await expect(page.getByText('Ollama connected')).toBeVisible({ timeout: 20_000 })
  await pickChatModel(page, MODELS.chat)

  // Turn 1: a question with a short markdown answer.
  await sendChat(page, 'Explain in four short bullet points what a KV cache is and why a changing timestamp at the top of a system prompt defeats it.')
  // Shoot while the reply is still streaming: the painted spans exist only then,
  // and at ~190 tok/s the window is short, so wait for a few lines then shoot at once.
  await page.waitForFunction(
    () => document.querySelectorAll('span[data-tok]').length > 60 && document.body.innerText.length > 0,
    undefined,
    { timeout: 60_000 },
  )
  await page.screenshot({ path: path.join(OUT, 'chat-streaming.png') })
  await waitChatDone(page)

  // Turn 2 so Analytics has a multi-turn quality trend.
  await sendChat(page, 'Now the same thing in two sentences, for someone who has never heard of a token.')
  await waitChatDone(page)

  // Bottom metrics panel: expand it.
  const panelToggle = page.locator('button', { hasText: /sessions · Avg/ }).first()
  if (await panelToggle.isVisible()) await panelToggle.click()
  await page.waitForTimeout(400)
  await scrollToBottom(page)
  await shot(page, 'chat')

  // Session deep dive.
  await page.locator('button', { hasText: 'View session details' }).first().click()
  await page.waitForURL('**/session/**')
  await expect(page.locator('main')).toContainText(/Stream/)
  await page.waitForTimeout(800)
  await shot(page, 'session')

  // Compare: temperature sweep on one model.
  await nav(page, '/compare')
  await page.locator('button', { hasText: 'Temperature Sweep' }).click()
  const slotSelects = page.locator('select')
  const n = await slotSelects.count()
  for (let i = 0; i < n; i++) {
    const opts = await slotSelects.nth(i).locator('option').allTextContents()
    if (opts.some((o) => o.includes(MODELS.compare))) await slotSelects.nth(i).selectOption(MODELS.compare)
  }
  await page.locator('textarea[placeholder="Enter prompt to compare across slots..."]').fill(
    'Write a two-sentence product description for a mechanical keyboard. Be specific.',
  )
  await page.locator('button', { hasText: /^Compare$/ }).click()
  await expect(page.getByText('streaming', { exact: true }).first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('streaming', { exact: true })).toHaveCount(0, { timeout: 300_000 })
  await expect(page.getByText('partial', { exact: true })).toHaveCount(0, { timeout: 60_000 })
  await page.getByText('Results', { exact: true }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(800)
  await shot(page, 'compare')
  const diff = page.locator('button', { hasText: /^Diff$/ })
  if (await diff.isVisible()) {
    await diff.click()
    await page.waitForTimeout(500)
    await shot(page, 'compare-diff')
  }

  await nav(page, '/analytics')
  await page.waitForTimeout(1200)
  await shot(page, 'analytics')

  await nav(page, '/costs')
  await page.waitForTimeout(1200)
  await shot(page, 'costs')

  await nav(page, '/system')
  await page.waitForTimeout(2500)
  await shot(page, 'system')
})

// ---------------------------------------------------------------------------
// Live: seed the observe port with two recognisable clients, then capture.
// ---------------------------------------------------------------------------
test('live', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/live')
  await expect(page.getByText('Ollama connected')).toBeVisible({ timeout: 20_000 })

  const style = 'Follow the house style guide closely. '.repeat(80)
  const post = (ua: string, body: object) =>
    fetch(`${OBSERVE}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': ua },
      body: JSON.stringify({ stream: false, ...body }),
    }).then((r) => r.text())

  // Client A: a Python script whose system prompt starts with a timestamp.
  // Three turns, so the cache-prefix finding has enough evidence.
  const history: Array<{ role: string; content: string }> = []
  const questions = ['Summarise our refund policy in one line.', 'And for digital goods?', 'Who approves exceptions?']
  for (const q of questions) {
    history.push({ role: 'user', content: q })
    const res = await post('ollama-python/0.4.7', {
      model: MODELS.fast,
      messages: [{ role: 'system', content: `[${new Date().toISOString()}] You are a careful assistant. ${style}` }, ...history],
      options: { num_predict: 60 },
    })
    try {
      history.push({ role: 'assistant', content: JSON.parse(res).message?.content ?? '' })
    } catch {
      history.push({ role: 'assistant', content: '' })
    }
  }

  // Client B: an editor assistant that sends a large tool set with a short message.
  const tool = (name: string, desc: string) => ({
    type: 'function',
    function: {
      name,
      description: desc,
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative file path' },
          query: { type: 'string', description: 'Search text or pattern' },
          limit: { type: 'integer', description: 'Maximum number of results to return' },
        },
        required: ['path'],
      },
    },
  })
  await post('Continue/1.2.0', {
    model: MODELS.fast,
    messages: [{ role: 'user', content: 'Rename the helper in utils.ts' }],
    tools: [
      tool('read_file', 'Read a file from the workspace and return its contents'),
      tool('search_code', 'Search the workspace for a pattern and return matching lines'),
      tool('list_dir', 'List the entries of a directory in the workspace'),
      tool('edit_file', 'Apply a text replacement to a file in the workspace'),
      tool('run_terminal', 'Run a shell command in the workspace terminal and return its output'),
    ],
    options: { num_predict: 40 },
  })

  await expect(page.locator('main')).toContainText('4 turns', { timeout: 60_000 })
  // Select the latest Python turn, so the card shows where its prompt stopped matching the previous one.
  await page.locator('tr', { hasText: 'Ollama Python SDK' }).first().click()
  await page.waitForTimeout(1500)
  await shot(page, 'live')
})

// ---------------------------------------------------------------------------
// Labs and tools: each one independent.
// ---------------------------------------------------------------------------
test('cache lab', async ({ page }) => {
  await page.goto('/cache-lab')
  await page.locator('select').first().selectOption(MODELS.fast)
  await page.locator('button', { hasText: 'Measure' }).click()
  await expect(page.getByText('Measured result')).toBeVisible({ timeout: 240_000 })
  await page.getByText('Diagnosis', { exact: true }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(600)
  await shot(page, 'cache-lab')
})

test('decision lab', async ({ page }) => {
  await page.goto('/decision-lab')
  await page.getByRole('button', { name: 'Decide' }).click()
  await expect(page.getByText(/input tokens/)).toBeVisible({ timeout: 240_000 })
  await page.getByText('Answers', { exact: true }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(500)
  await shot(page, 'decision-lab')
})

test('protocol observatory', async ({ page }) => {
  await page.goto('/protocols')
  await page.locator('select').first().selectOption(MODELS.chat)
  await page.locator('button', { hasText: 'Run all 3 protocols' }).click()
  await expect(page.getByText('Envelope diff')).toBeVisible({ timeout: 240_000 })
  await page.waitForTimeout(600)
  await shot(page, 'protocols')
  await page.getByText('Envelope diff').click()
  await page.getByText('Envelope diff').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await shot(page, 'protocols-envelope')
})

test('embeddings', async ({ page }) => {
  await page.goto('/embeddings')
  await page.locator('textarea[placeholder="First text..."]').fill('The cat sat on the warm windowsill, watching the rain.')
  await page.locator('textarea[placeholder="Second text..."]').fill('A kitten rested by the window while it rained outside.')
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  await expect(page.getByText('Cosine Similarity')).toBeVisible({ timeout: 120_000 })
  await page.getByText('Similarity Calculator').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await shot(page, 'embeddings')
})

test('knowledge base', async ({ page }) => {
  test.setTimeout(600_000)
  const doc = path.join(os.tmpdir(), 'llmxray-kv-cache-notes.md')
  fs.writeFileSync(doc, SAMPLE_DOC)
  await page.goto('/rag')
  // The upload is ignored until the page has picked its embedding model.
  const embedSelect = page.locator('select').first()
  await expect(embedSelect).toContainText('nomic', { timeout: 20_000 })
  await embedSelect.selectOption(MODELS.embed)
  await page.locator('input[type=file]').setInputFiles(doc)
  await expect(page.getByText('Documents (1)')).toBeVisible({ timeout: 300_000 })
  await page.locator('input[placeholder="Search your documents..."]').fill('why does a timestamp break the cache')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 120_000 })
  await page.getByText('Documents (1)').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(600)
  await shot(page, 'knowledge-base')
})

test('benchmark', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/benchmark')
  await page.locator('button', { hasText: MODELS.benchmark }).first().click()
  for (const suite of ['ARC-Challenge', 'HellaSwag', 'GSM8K', 'TruthfulQA']) {
    await page.getByText(suite, { exact: true }).click()
  }
  await page.getByRole('button', { name: 'Run Benchmark' }).click()
  await expect(page.getByText(/Latest Result/)).toBeVisible({ timeout: 480_000 })
  await page.waitForTimeout(1500)
  await page.getByText(/Latest Result/).evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(800)
  await shot(page, 'benchmark')
})

test('tool workshop', async ({ page }) => {
  await page.goto('/tools')
  for (const name of ['Calculator', 'Web Fetch', 'Regex Tester']) {
    await page.locator('button', { hasText: 'From Template...' }).first().click()
    await expect(page.getByText('Tool Templates')).toBeVisible()
    await page.getByText(name, { exact: true }).first().click()
    await page.waitForTimeout(400)
  }
  await page.locator('button', { hasText: 'Code Panel' }).click()
  await page.waitForTimeout(800)
  await shot(page, 'tools')
})

test('code completion', async ({ page }) => {
  await page.goto('/fim')
  await page.locator('select').first().selectOption(MODELS.fim)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Stitched preview')).toBeVisible({ timeout: 240_000 })
  await page.getByText('Stitched preview').scrollIntoViewIfNeeded()
  await shot(page, 'fim')
})

test('models', async ({ page }) => {
  await page.goto('/settings?tab=models')
  await page.waitForTimeout(2500)
  await shot(page, 'models')
})

const SAMPLE_DOC = `# Notes on the KV cache in local inference

## What the cache holds

When a model reads a prompt it computes, for every token, a key vector and a value
vector in every attention layer. Those tensors are what the model attends over when
it produces the next token. Keeping them in memory between requests is the KV cache.
A request whose prompt starts with the same tokens as the previous request can reuse
the cached tensors for that shared prefix and only evaluate the tokens that differ.

## Why the prefix has to match from the first token

Attention is causal. The key and value for token 200 depend on tokens 1 to 199. If
any token before position 200 changes, every cached tensor from that position onwards
is wrong and has to be recomputed. The daemon therefore compares the new prompt with
the cached one from the very beginning and keeps only the longest identical prefix.

## Why a timestamp breaks it

A system prompt that begins with the current date and time changes on every turn.
The first few tokens differ, the shared prefix is empty, and the whole prompt is
re-evaluated. The same thing happens with a session id, a random greeting, or a
reordered list of tools. Moving the changing value to the end of the prompt keeps
the long static part identical, so the cache keeps it.

## What it costs

Prefill is the phase that evaluates the prompt tokens. On a consumer GPU a 2,000
token prompt takes tens to hundreds of milliseconds to prefill; on CPU, seconds.
A chat client that re-reads its whole prompt every turn pays that cost on every
message, and the user feels it as a pause before the first token.

## How to see it

Ollama reports the number of prompt tokens it evaluated and the number it took
from the cache. A turn that reports zero cached tokens after a long conversation
is a cache miss. The LLMxRay Live page shows both numbers per turn and marks the
exact point in the prompt where the match with the previous turn stopped.
`
