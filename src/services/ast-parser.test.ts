import { describe, it, expect } from 'vitest'
import { parse as babelParse } from '@babel/parser'
import { parseCodeToTools, toolsToCode, generateToolSchemas } from './ast-parser'
import type { ToolBlockData } from '@/types/tool-canvas'

/** The Calculator template exactly as the workshop stores it: bare statements reading `args`. */
const calculator: ToolBlockData = {
  uid: 'k-abc',
  name: 'calculate',
  description: 'Evaluate a mathematical expression and return the result',
  parameters: [{ name: 'expression', type: 'string' }],
  body: "// Safe math evaluation (no eval)\nconst expr = String(args.expression)\nconst fn = new Function('return ' + expr.replace(/[^0-9+\\-*/().\\s]/g, ''))\nreturn fn()",
}

const fetcher: ToolBlockData = {
  uid: 'k-def',
  name: 'fetch_url',
  description: 'Fetch a page',
  parameters: [
    { name: 'url', type: 'string' },
    { name: 'mode', type: 'string', enumValues: ['text', 'json'] },
  ],
  body: 'const res = await fetch(args.url)\nif (args.mode === "json") {\n  return await res.json()\n}\nreturn await res.text()',
}

function assertValidTypeScript(code: string) {
  expect(() => babelParse(code, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow()
}

describe('toolsToCode', () => {
  it('emits a function whose signature matches how the body reads its inputs', () => {
    const code = toolsToCode([calculator])
    assertValidTypeScript(code)
    expect(code).toContain('export async function calculate(args: { expression: string }) {')
    expect(code).toContain('\n  const expr = String(args.expression)\n')
    expect(code.trimEnd().endsWith('}')).toBe(true)
  })

  it('declares enum parameters as string-literal unions and omits args when there are none', () => {
    const ping: ToolBlockData = { ...calculator, uid: 'k-x', name: 'ping', parameters: [], body: 'return "pong"' }
    const code = toolsToCode([fetcher, ping])
    assertValidTypeScript(code)
    expect(code).toContain('mode: "text" | "json"')
    expect(code).toContain('export async function ping() {\n  return "pong"\n}')
  })
})

describe('parseCodeToTools', () => {
  it('round-trips a generated tool back to the same block', () => {
    const { tools, warnings } = parseCodeToTools(toolsToCode([calculator, fetcher]))
    expect(warnings).toEqual([])
    expect(tools.map((t) => t.name)).toEqual(['calculate', 'fetch_url'])
    const [calc, fetchTool] = tools
    expect(calc!.uid).toBe('k-abc')
    expect(calc!.description).toBe(calculator.description)
    expect(calc!.parameters.map((p) => p.name)).toEqual(['expression'])
    expect(calc!.body).toBe(calculator.body)
    expect(fetchTool!.parameters.map((p) => [p.name, p.enumValues])).toEqual([
      ['url', undefined],
      ['mode', ['text', 'json']],
    ])
    expect(fetchTool!.body).toBe(fetcher.body)
  })

  it('stores the body as bare statements for hand-written functions too', () => {
    const { tools } = parseCodeToTools('export async function hi(name: string) {\n  return `hi ${name}`\n}')
    expect(tools[0]!.body).toBe('return `hi ${name}`')
    expect(tools[0]!.parameters).toEqual([{ name: 'name', type: 'string' }])
  })

  it('keeps the schema flat whichever signature style was written', () => {
    const { tools } = parseCodeToTools(toolsToCode([fetcher]))
    const schema = generateToolSchemas(tools)[0]!
    expect(Object.keys(schema.function.parameters.properties)).toEqual(['url', 'mode'])
    expect(schema.function.parameters.properties.mode!.enum).toEqual(['text', 'json'])
  })
})
