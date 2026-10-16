import { describe, it, expect } from 'vitest'
import { scoreCase, callInProse, summarise, type CaseResult } from './tool-fidelity'
import { TOOL_CASES } from '@/data/tool-fidelity/cases'
import type { OllamaChatChunk } from '@/types/ollama'

const byId = Object.fromEntries(TOOL_CASES.map((c) => [c.id, c]))

function reply(content: string, calls?: { name: string; arguments: unknown }[]): OllamaChatChunk {
  return {
    model: 'x',
    created_at: '',
    message: { role: 'assistant', content, tool_calls: calls?.map((c) => ({ function: c })) as OllamaChatChunk['message']['tool_calls'] },
    done: true,
    done_reason: 'stop',
  } as OllamaChatChunk
}

describe('scoreCase', () => {
  it('passes a correct call with the right arguments', () => {
    const r = scoreCase(byId['simple-call']!, reply('', [{ name: 'read_file', arguments: { path: 'notes/todo.md' } }]))
    expect(r.outcome).toBe('valid')
  })

  it('catches the measured gemma4 failure: the short required argument dropped next to a long one', () => {
    const r = scoreCase(byId['long-content']!, reply('', [{ name: 'write_file', arguments: { content: 'Line 1: the quick brown fox'.repeat(300) } }]))
    expect(r.outcome).toBe('missing-args')
    expect(r.detail).toMatch(/path argument is missing/)
  })

  it('catches a shortened long argument', () => {
    const r = scoreCase(byId['long-content']!, reply('', [{ name: 'write_file', arguments: { path: 'logs/run-1.txt', content: 'Line 1: short.' } }]))
    expect(r.outcome).toBe('bad-args')
    expect(r.detail).toMatch(/content was shortened/)
  })

  it('catches a tool call written into the answer text', () => {
    const r = scoreCase(byId['simple-call']!, reply('Sure! {"name": "read_file", "arguments": {"path": "notes/todo.md"}}'))
    expect(r.outcome).toBe('in-prose')
    expect(callInProse('read_file({"path":"a"})', ['read_file'])).toBe('read_file')
    expect(callInProse('I will read the file for you.', ['read_file'])).toBeNull()
  })

  it('catches the wrong tool, a hallucinated tool, and a quoted number', () => {
    expect(scoreCase(byId['pick-right-tool']!, reply('', [{ name: 'write_file', arguments: { path: 'config/app.yaml', content: '' } }])).outcome).toBe('wrong-tool')
    expect(scoreCase(byId['hallucinated-tool']!, reply('', [{ name: 'delete_file', arguments: { path: 'tmp/old.log' } }])).outcome).toBe('hallucinated-tool')
    const quoted = scoreCase(byId['number-type']!, reply('', [{ name: 'search_web', arguments: { query: 'Ollama prompt cache', max_results: '5' } }]))
    expect(quoted.outcome).toBe('bad-args')
    expect(quoted.detail).toMatch(/not a number/)
  })

  it('wants no call for a greeting and for the turn after a tool result, and counts parallel calls', () => {
    expect(scoreCase(byId['no-tool-needed']!, reply('Hello! I am here.')).outcome).toBe('valid')
    expect(scoreCase(byId['no-tool-needed']!, reply('', [{ name: 'search_web', arguments: { query: 'hello' } }])).outcome).toBe('unneeded-call')
    expect(scoreCase(byId['after-result']!, reply('The first line is "Buy milk".')).outcome).toBe('valid')
    expect(scoreCase(byId['parallel']!, reply('', [{ name: 'read_file', arguments: { path: 'src/a.ts' } }])).outcome).toBe('wrong-count')
    expect(scoreCase(byId['parallel']!, reply('', [{ name: 'read_file', arguments: { path: 'src/a.ts' } }, { name: 'read_file', arguments: { path: 'src/b.ts' } }])).outcome).toBe('valid')
  })

  it('accepts arguments sent as a JSON string', () => {
    const r = scoreCase(byId['enum']!, reply('', [{ name: 'get_weather', arguments: '{"city":"Lyon","unit":"celsius"}' }]))
    expect(r.outcome).toBe('valid')
  })
})

describe('summarise', () => {
  it('scores each model by its share of valid cases, best first', () => {
    const rs: CaseResult[] = [
      { caseId: 'a', model: 'm1', outcome: 'valid', detail: '', calls: [], content: '', thinking: '', ms: 1 },
      { caseId: 'b', model: 'm1', outcome: 'missing-args', detail: '', calls: [], content: '', thinking: '', ms: 1 },
      { caseId: 'a', model: 'm2', outcome: 'valid', detail: '', calls: [], content: '', thinking: '', ms: 1 },
      { caseId: 'b', model: 'm2', outcome: 'valid', detail: '', calls: [], content: '', thinking: '', ms: 1 },
    ]
    const s = summarise(rs)
    expect(s.map((x) => [x.model, x.score])).toEqual([['m2', 100], ['m1', 50]])
    expect(s[1]!.byOutcome['missing-args']).toBe(1)
  })
})
