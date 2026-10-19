import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll } from 'vitest'

/**
 * The observer keeps its records under ~/.llmxray. Each test file gets its own empty
 * folder instead, set before any module reads it, so no test can write into the real one.
 */
const dir = mkdtempSync(join(tmpdir(), 'llmxray-test-'))
process.env.LLMXRAY_DATA_DIR = dir

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})
