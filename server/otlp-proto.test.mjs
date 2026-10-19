// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { encodeTraces, decodeTraces } from './otlp-proto.mjs'
import { payload, turnSpan } from './otel-export.mjs'

const turn = {
  id: 't1',
  seq: 7,
  at: 1792400000123,
  durationMs: 2903,
  mode: 'agent',
  model: 'qwen2.5:7b',
  protocol: 'ollama-chat',
  client: { id: 'tag:x', label: 'VS Code Copilot' },
  loadMs: 0,
  queueMs: 3,
  error: null,
  prompt: { tokens: 1204, cached: 1180, prefillMs: 41, contextRequested: 32768 },
  gen: { tokens: 86, doneReason: 'stop' },
  fit: { contextLength: 32768, cpuShare: 0.125 },
  toolCalls: ['read_file', 'search'],
  toolsOffered: 8,
}

describe('OTLP protobuf', () => {
  it('round-trips a span with every value type: strings, ints, doubles, booleans, arrays, ids and times', () => {
    const span = turnSpan(turn, { traceId: '0af7651916cd43dd8448eb211c80319c', parentSpanId: 'b7ad6b7169203331' })
    const sent = payload([span, { ...span, spanId: '00f067aa0ba902b7', name: 'failed', status: { code: 2, message: 'HTTP 500' } }], '0.8.10')
    const back = decodeTraces(encodeTraces(sent))
    expect(back).toEqual(sent)
  })

  it('writes a 64-bit nanosecond time without losing a digit', () => {
    const span = turnSpan(turn, { traceId: '0af7651916cd43dd8448eb211c80319c' })
    const back = decodeTraces(encodeTraces(payload([span], '1'))).resourceSpans[0].scopeSpans[0].spans[0]
    expect(back.startTimeUnixNano).toBe('1792400000123000000')
    expect(back.endTimeUnixNano).toBe('1792400003026000000')
  })

  it('leaves an unset status out entirely, as OTLP means it', () => {
    const span = turnSpan(turn, { traceId: '0af7651916cd43dd8448eb211c80319c' })
    const back = decodeTraces(encodeTraces(payload([span], '1'))).resourceSpans[0].scopeSpans[0].spans[0]
    expect(back.status).toEqual({})
  })
})
