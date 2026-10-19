// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  parseAnthropicResponse,
  classifyPath,
  identifyClient,
  anatomy,
  prefixBreak,
  breakSnippet,
  parseOllamaResponse,
  parseOpenAIResponse,
  rates,
  createTurnLog,
} from './observe-core.mjs'

describe('classifyPath', () => {
  it('records the model endpoints on both protocols and nothing else', () => {
    expect(classifyPath('POST', '/api/chat')).toEqual({ protocol: 'ollama-chat', kind: 'chat' })
    expect(classifyPath('POST', '/v1/chat/completions?x=1').protocol).toBe('openai-chat')
    expect(classifyPath('POST', '/api/embed').kind).toBe('embedding')
    expect(classifyPath('GET', '/api/tags')).toBeNull()
    expect(classifyPath('GET', '/api/chat')).toBeNull()
    expect(classifyPath('POST', '/api/pull')).toBeNull()
  })
})

describe('identifyClient', () => {
  it('names the clients a user would recognise', () => {
    expect(identifyClient({ 'user-agent': 'GitHubCopilotChat/0.41.0' }).label).toBe('VS Code Copilot')
    expect(identifyClient({ 'user-agent': 'ollama/0.40.3 (amd64 windows) Go/go1.24' }).label).toBe('Ollama CLI')
    expect(identifyClient({ 'user-agent': 'ollama-python/0.5.1 (x86_64 Windows) Python/3.12' }).label).toBe('Ollama Python SDK')
    expect(identifyClient({ 'user-agent': 'OpenAI/Python 1.59.0' }).label).toBe('OpenAI Python SDK')
    expect(identifyClient({ 'user-agent': 'curl/8.9.1' }).label).toBe('curl')
  })
  it('recognises VS Code Copilot behind the Ollama extension by its prompt, not its SDK user agent', () => {
    const headers = { 'user-agent': 'ollama-js/0.6.3 (x64 win32 Node.js/v24.21.0)' }
    expect(identifyClient(headers).label).toBe('Ollama JS SDK')
    const bySystem = identifyClient(headers, {
      messages: [{ role: 'system', content: 'You are an AI assistant using Copilot SDK in VS Code. You help users…' }],
    })
    expect(bySystem).toMatchObject({ id: 'copilot', label: 'VS Code Copilot', userAgent: headers['user-agent'] })
    const byTools = identifyClient(headers, {
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ function: { name: 'view' } }, { function: { name: 'read_powershell' } }],
    })
    expect(byTools.id).toBe('copilot')
    expect(identifyClient(headers, { tools: [{ function: { name: 'read_file' } }] }).id).toBe('ollama-js')
  })

  it('keeps unknown agents distinct by their product token', () => {
    const c = identifyClient({ 'user-agent': 'MyBot/2.0 (+https://example)' })
    expect(c.id).toBe('ua:mybot')
    expect(c.label).toBe('MyBot')
    expect(identifyClient({}).id).toBe('unknown')
  })
})

describe('anatomy', () => {
  const body = {
    model: 'qwen2.5-coder:14b',
    messages: [
      { role: 'system', content: 'You are a careful assistant.' },
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'first answer' },
      { role: 'user', content: 'second question' },
    ],
    tools: [{ type: 'function', function: { name: 'read_file', parameters: { type: 'object' } } }],
  }

  it('splits a chat prompt into system, tools, history and the current message', () => {
    const a = anatomy(body, 'ollama-chat')
    expect(a.systemChars).toBe('You are a careful assistant.'.length)
    expect(a.messageChars).toBe('second question'.length)
    expect(a.historyChars).toBe('first question'.length + 'first answer'.length)
    expect(a.toolsChars).toBe(JSON.stringify(body.tools).length)
    expect(a.totalChars).toBe(a.systemChars + a.toolsChars + a.historyChars + a.messageChars)
    expect(a.toolsOffered).toBe(1)
    expect(a.toolNames).toEqual(['read_file'])
    expect(a.messages).toBe(4)
  })

  it('places tool schemas after the system message in the canonical form', () => {
    const a = anatomy(body, 'ollama-chat')
    expect(a.canonical.indexOf('<system>')).toBeLessThan(a.canonical.indexOf('<tools>'))
    expect(a.canonical.indexOf('<tools>')).toBeLessThan(a.canonical.indexOf('<user>'))
  })

  it('handles OpenAI content parts, generate and embed bodies', () => {
    const parts = anatomy(
      { messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'image_url' }] }] },
      'openai-chat',
    )
    expect(parts.messageChars).toBe('hi[image_url]'.length)
    const gen = anatomy({ system: 'sys', prompt: 'write' }, 'ollama-generate')
    expect(gen.systemChars).toBe(3)
    expect(gen.messageChars).toBe(5)
    const emb = anatomy({ input: ['a', 'bb'] }, 'ollama-embed')
    expect(emb.messageChars).toBe(3)
    expect(emb.messages).toBe(2)
    expect(anatomy(null, 'ollama-chat').totalChars).toBe(0)
  })
})

describe('prefixBreak', () => {
  it('finds where this turn stopped matching the previous one and scales to tokens', () => {
    const prev = '<system>rules\n<user>file: a.ts cursor 1:1\n<user>hello'
    const next = '<system>rules\n<user>file: b.ts cursor 9:9\n<user>hello again'
    const b = prefixBreak(prev, next, 1000)
    expect(b.breakChar).toBe('<system>rules\n<user>file: '.length)
    expect(b.breakTokensEst).toBe(Math.round((b.breakChar / next.length) * 1000))
    expect(b.identical).toBe(false)
  })
  it('reports identical prompts and nothing for a first turn', () => {
    expect(prefixBreak(null, 'x', 10)).toBeNull()
    expect(prefixBreak('same', 'same', 10).identical).toBe(true)
  })
  it('windows a snippet around the break', () => {
    const s = breakSnippet('a'.repeat(200) + 'B' + 'c'.repeat(200), 200, 10)
    expect(s.before).toBe('…' + 'a'.repeat(10))
    expect(s.after).toBe('B' + 'c'.repeat(9) + '…')
  })
})

describe('parseOllamaResponse', () => {
  it('reads the counts off the final NDJSON chunk and collects tool calls', () => {
    const stream = [
      JSON.stringify({ model: 'm', message: { role: 'assistant', content: 'Hel' }, done: false }),
      JSON.stringify({ model: 'm', message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'read_file', arguments: {} } }] }, done: false }),
      JSON.stringify({
        model: 'm',
        message: { role: 'assistant', content: '' },
        done: true,
        done_reason: 'stop',
        prompt_eval_count: 324,
        prompt_eval_cached_count: 290,
        prompt_eval_duration: 18_600_000,
        eval_count: 40,
        eval_duration: 1_000_000_000,
      }),
    ].join('\n')
    const r = parseOllamaResponse(stream)
    expect(r.promptTokens).toBe(324)
    expect(r.cachedTokens).toBe(290)
    expect(r.prefillMs).toBeCloseTo(18.6)
    expect(r.evalTokens).toBe(40)
    expect(r.toolCalls).toEqual(['read_file'])
    expect(r.generatedChars).toBe(3)
    const d = rates(r)
    expect(d.evaluated).toBe(34)
    // Real prefill rate divides by the UNCACHED tokens, never the total.
    expect(d.prefillTps).toBe(Math.round((34 / 18.6) * 1000))
    expect(d.genTps).toBe(40)
  })
  it('returns null on an empty or non-JSON body and keeps an error', () => {
    expect(parseOllamaResponse('')).toBeNull()
    expect(parseOllamaResponse('<html>')).toBeNull()
    expect(parseOllamaResponse(JSON.stringify({ error: 'model not found' })).error).toBe('model not found')
  })

  it('reads the prompt and context sizes off a context-size rejection, as Ollama 0.40.3 sends it', () => {
    // Captured live from VS Code Copilot against deepseek-r1:8b on 2026-10-12.
    const body = JSON.stringify({
      error: {
        code: 400,
        message: 'request (9415 tokens) exceeds the available context size (4096 tokens), try increasing it',
        type: 'exceed_context_size_error',
        n_prompt_tokens: 9415,
        n_ctx: 4096,
      },
    })
    const r = parseOllamaResponse(body)
    expect(r.error).toMatch(/exceeds the available context size/)
    expect(r.contextExceeded).toEqual({ promptTokens: 9415, contextLength: 4096 })
    expect(r.promptTokens).toBe(9415)
    // The older string form carries the same numbers in its message.
    const s = parseOllamaResponse(JSON.stringify({ error: 'request (500 tokens) exceeds the available context size (256 tokens), try increasing it' }))
    expect(s.contextExceeded).toEqual({ promptTokens: 500, contextLength: 256 })
    expect(parseOllamaResponse(JSON.stringify({ error: 'model not found' })).contextExceeded).toBeNull()
  })
})

describe('parseOpenAIResponse', () => {
  it('reads usage, cached tokens and timings from an SSE stream', () => {
    const sse = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hi' }, finish_reason: null }] }),
      'data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ function: { name: 'search' } }] }, finish_reason: null }] }),
      'data: ' +
        JSON.stringify({
          choices: [{ delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: 31, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 30 } },
          timings: { prompt_n: 31, prompt_ms: 8, prompt_per_second: 3875, predicted_n: 5, predicted_ms: 100 },
        }),
      'data: [DONE]',
    ].join('\n\n')
    const r = parseOpenAIResponse(sse)
    expect(r.promptTokens).toBe(31)
    expect(r.cachedTokens).toBe(30)
    expect(r.prefillMs).toBe(8)
    expect(r.toolCalls).toEqual(['search'])
    expect(r.doneReason).toBe('stop')
    // 1 uncached token in 8 ms = 125 tok/s, not the daemon's 3875.
    expect(rates(r).prefillTps).toBe(125)
  })
  it('reads a non-streamed body', () => {
    const r = parseOpenAIResponse(JSON.stringify({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 1 } }))
    expect(r.promptTokens).toBe(3)
    expect(r.cachedTokens).toBeNull()
  })
})

describe('createTurnLog', () => {
  it('is bounded, sequenced and subscribable', () => {
    const log = createTurnLog(2)
    const seen = []
    log.subscribe((t) => seen.push(t.seq))
    for (let i = 0; i < 3; i++) log.push({ id: String(i), seq: log.nextSeq() })
    expect(log.size).toBe(2)
    expect(log.all().map((t) => t.seq)).toEqual([2, 3])
    expect(log.since(2).map((t) => t.seq)).toEqual([3])
    expect(seen).toEqual([1, 2, 3])
    log.rememberCanonical('k', 'abc')
    expect(log.previousCanonical('k')).toBe('abc')
    log.clear()
    expect(log.size).toBe(0)
    expect(log.previousCanonical('k')).toBeNull()
  })
})

describe('anthropic-messages (Claude Code through Ollama)', () => {
  it('classifies /v1/messages as a chat turn', () => {
    expect(classifyPath('POST', '/v1/messages')).toEqual({ protocol: 'anthropic-messages', kind: 'chat' })
  })

  it('reads the prompt as cached plus uncached tokens from a plain JSON answer', () => {
    // Measured on Ollama 0.40.4: the second identical prompt reports input_tokens 5, cache_read 30.
    const r = parseAnthropicResponse(JSON.stringify({ type: 'message', role: 'assistant', content: [{ type: 'text', text: 'Blue.' }], stop_reason: 'end_turn', usage: { input_tokens: 5, cache_read_input_tokens: 30, output_tokens: 2 } }))
    expect(r.promptTokens).toBe(35)
    expect(r.cachedTokens).toBe(30)
    expect(r.evalTokens).toBe(2)
    expect(r.doneReason).toBe('end_turn')
    expect(r.generatedChars).toBe(5)
  })

  it('reads the SSE stream: usage from message_start and message_delta, tool names, text length', () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start","message":{"role":"assistant","content":[],"usage":{"input_tokens":19,"output_tokens":0}}}',
      'event: content_block_start',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","name":"read_file","input":{}}}',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hello"}}',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":7}}',
      '',
    ].join('\n')
    const r = parseAnthropicResponse(sse)
    expect(r.promptTokens).toBe(19)
    expect(r.cachedTokens).toBeNull()
    expect(r.evalTokens).toBe(7)
    expect(r.doneReason).toBe('tool_use')
    expect(r.toolCalls).toEqual(['read_file'])
    expect(r.generatedChars).toBe(5)
  })

  it('takes the system prompt from the top level and reads content blocks', () => {
    const a = anatomy(
      {
        system: 'You are terse.',
        tools: [{ name: 'read_file', input_schema: { type: 'object' } }],
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'first' }] },
          { role: 'assistant', content: [{ type: 'tool_use', name: 'read_file', input: { path: 'a' } }] },
          { role: 'user', content: [{ type: 'tool_result', content: 'data' }, { type: 'text', text: 'now?' }] },
        ],
      },
      'anthropic-messages',
    )
    expect(a.systemChars).toBe('You are terse.'.length)
    expect(a.toolsOffered).toBe(1)
    expect(a.toolNames).toEqual(['read_file'])
    expect(a.messageChars).toBe('[tool_result]data'.length + 'now?'.length)
    expect(a.historyChars).toBeGreaterThan(0)
    expect(a.canonical.startsWith('<system>You are terse.\n<tools>')).toBe(true)
  })
})

describe('a client that names itself', () => {
  it('wins over the User-Agent guess through X-LLMxRay-Client', () => {
    const c = identifyClient({ 'user-agent': 'ollama-python/0.4', 'x-llmxray-client': 'swarm-watch' })
    expect(c).toEqual({ id: 'tag:swarm-watch', label: 'swarm-watch', userAgent: 'ollama-python/0.4' })
  })
})

describe('the answer: what came back, joined from the stream', () => {
  it('Ollama native: text, thinking and tool calls with their arguments', () => {
    const stream = [
      { message: { role: 'assistant', content: '', thinking: 'Need the file. ' }, done: false },
      { message: { role: 'assistant', content: '', thinking: 'Read it.' }, done: false },
      { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'read_file', arguments: { path: 'memory/x.md' } } }] }, done: false },
      { message: { role: 'assistant', content: 'Done.' }, done: false },
      { message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 3 },
    ].map((o) => JSON.stringify(o)).join('\n')
    expect(parseOllamaResponse(stream).answer).toEqual({
      content: 'Done.',
      thinking: 'Need the file. Read it.',
      toolCalls: [{ name: 'read_file', arguments: { path: 'memory/x.md' } }],
    })
  })

  it('OpenAI-compatible stream: arguments arrive as text pieces per tool call index', () => {
    const chunks = [
      { choices: [{ delta: { content: 'Let me check' } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'prom_query', arguments: '{"que' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'ry":"up"}' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 1, function: { name: 'read_file', arguments: '{"path":"a"}' } }] } }] },
      { choices: [{ delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 20, completion_tokens: 9 } },
    ]
    const sse = chunks.map((c) => `data: ${JSON.stringify(c)}`).join('\n\n') + '\n\ndata: [DONE]\n'
    expect(parseOpenAIResponse(sse).answer).toEqual({
      content: 'Let me check',
      thinking: null,
      toolCalls: [{ name: 'prom_query', arguments: { query: 'up' } }, { name: 'read_file', arguments: { path: 'a' } }],
    })
  })

  it('OpenAI-compatible single body, and reasoning text kept as thinking', () => {
    const body = JSON.stringify({ choices: [{ message: { content: 'Four.', reasoning: '2+2' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 2 } })
    expect(parseOpenAIResponse(body).answer).toEqual({ content: 'Four.', thinking: '2+2', toolCalls: [] })
  })

  it('Anthropic stream: text deltas, thinking deltas and a tool_use built from partial JSON', () => {
    const events = [
      { type: 'message_start', message: { usage: { input_tokens: 10 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Look it up.' } },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Checking.' } },
      { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', name: 'list_files' } },
      { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"dir":' } },
      { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '"runs"}' } },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 12 } },
    ]
    const sse = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}`).join('\n\n')
    expect(parseAnthropicResponse(sse).answer).toEqual({
      content: 'Checking.',
      thinking: 'Look it up.',
      toolCalls: [{ name: 'list_files', arguments: { dir: 'runs' } }],
    })
  })

  it('an argument fragment that never becomes valid JSON is kept as text, not dropped', () => {
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'x', arguments: '{"cut' } }] } }] })}\n`
    expect(parseOpenAIResponse(sse).answer.toolCalls).toEqual([{ name: 'x', arguments: '{"cut' }])
  })
})
