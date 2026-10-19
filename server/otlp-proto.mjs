/**
 * OTLP trace requests in protobuf, the encoding every OTLP/HTTP collector accepts (Phoenix
 * takes nothing else). Only the messages LLMxRay sends are covered, with field numbers from
 * opentelemetry/proto: collector/trace/v1/trace_service.proto, trace/v1/trace.proto,
 * common/v1/common.proto and resource/v1/resource.proto.
 *
 * The input is the same object the JSON encoding uses (see payload() in otel-export.mjs).
 */

const VARINT = 0
const FIXED64 = 1
const LENGTH = 2

class Writer {
  constructor() {
    this.parts = []
  }
  varint(n) {
    let v = BigInt(n)
    const bytes = []
    do {
      let b = Number(v & 0x7fn)
      v >>= 7n
      if (v > 0n) b |= 0x80
      bytes.push(b)
    } while (v > 0n)
    this.parts.push(Buffer.from(bytes))
  }
  key(field, wire) {
    this.varint((field << 3) | wire)
  }
  /** A length-delimited field: bytes, a string, or a nested message already encoded. */
  bytes(field, buf) {
    this.key(field, LENGTH)
    this.varint(buf.length)
    this.parts.push(buf)
  }
  string(field, s) {
    if (s == null || s === '') return
    this.bytes(field, Buffer.from(String(s), 'utf8'))
  }
  message(field, encode) {
    const inner = new Writer()
    encode(inner)
    this.bytes(field, inner.finish())
  }
  uint(field, n) {
    if (!n) return
    this.key(field, VARINT)
    this.varint(n)
  }
  fixed64(field, n) {
    const buf = Buffer.alloc(8)
    buf.writeBigUInt64LE(BigInt(n))
    this.key(field, FIXED64)
    this.parts.push(buf)
  }
  double(field, x) {
    const buf = Buffer.alloc(8)
    buf.writeDoubleLE(x)
    this.key(field, FIXED64)
    this.parts.push(buf)
  }
  finish() {
    return Buffer.concat(this.parts)
  }
}

// AnyValue: string 1, bool 2, int 3, double 4, array 5.
function anyValue(w, v) {
  if (v.stringValue != null) w.bytes(1, Buffer.from(v.stringValue, 'utf8'))
  else if (v.boolValue != null) {
    w.key(2, VARINT)
    w.varint(v.boolValue ? 1 : 0)
  } else if (v.intValue != null) {
    w.key(3, VARINT)
    w.varint(BigInt.asUintN(64, BigInt(v.intValue)))
  } else if (v.doubleValue != null) w.double(4, v.doubleValue)
  else if (v.arrayValue) w.message(5, (a) => v.arrayValue.values.forEach((x) => a.message(1, (e) => anyValue(e, x))))
}

// KeyValue: key 1, value 2.
const keyValue = (w, kv) => {
  w.string(1, kv.key)
  w.message(2, (v) => anyValue(v, kv.value))
}

// Span: trace_id 1, span_id 2, parent_span_id 4, name 5, kind 6, start 7, end 8, attributes 9, status 15.
function span(w, s) {
  w.bytes(1, Buffer.from(s.traceId, 'hex'))
  w.bytes(2, Buffer.from(s.spanId, 'hex'))
  if (s.parentSpanId) w.bytes(4, Buffer.from(s.parentSpanId, 'hex'))
  w.string(5, s.name)
  w.uint(6, s.kind)
  w.fixed64(7, s.startTimeUnixNano)
  w.fixed64(8, s.endTimeUnixNano)
  for (const a of s.attributes ?? []) w.message(9, (kv) => keyValue(kv, a))
  // Status: message 2, code 3. Left out when unset, as an empty status means "unset".
  if (s.status?.code || s.status?.message) {
    w.message(15, (st) => {
      st.string(2, s.status.message)
      st.uint(3, s.status.code)
    })
  }
}

/** ExportTraceServiceRequest { resource_spans 1 { resource 1, scope_spans 2 { scope 1, spans 2 } } } */
export function encodeTraces(payload) {
  const w = new Writer()
  for (const rs of payload.resourceSpans) {
    w.message(1, (r) => {
      r.message(1, (res) => (rs.resource?.attributes ?? []).forEach((a) => res.message(1, (kv) => keyValue(kv, a))))
      for (const ss of rs.scopeSpans) {
        r.message(2, (sc) => {
          sc.message(1, (scope) => {
            scope.string(1, ss.scope?.name)
            scope.string(2, ss.scope?.version)
          })
          for (const s of ss.spans) sc.message(2, (sp) => span(sp, s))
        })
      }
    })
  }
  return w.finish()
}

/**
 * The reverse, for the tests' stand-in collector and for debugging: protobuf back into the
 * JSON shape payload() builds. Ids come back as hex, times and ints as decimal strings.
 */
export function decodeTraces(buf) {
  const fields = (b) => {
    const out = []
    let i = 0
    const varint = () => {
      let v = 0n
      let shift = 0n
      for (;;) {
        const byte = b[i++]
        v |= BigInt(byte & 0x7f) << shift
        if (!(byte & 0x80)) return v
        shift += 7n
      }
    }
    while (i < b.length) {
      const key = Number(varint())
      const field = key >> 3
      const wire = key & 7
      if (wire === VARINT) out.push({ field, wire, value: varint() })
      else if (wire === FIXED64) {
        out.push({ field, wire, value: b.subarray(i, i + 8) })
        i += 8
      } else if (wire === LENGTH) {
        const len = Number(varint())
        out.push({ field, wire, value: b.subarray(i, i + len) })
        i += len
      } else throw new Error(`unexpected wire type ${wire}`)
    }
    return out
  }
  const all = (fs, n) => fs.filter((f) => f.field === n)
  const one = (fs, n) => fs.find((f) => f.field === n)
  const str = (f) => (f ? Buffer.from(f.value).toString('utf8') : undefined)
  const anyValue = (b) => {
    const f = fields(b)[0]
    if (!f) return {}
    if (f.field === 1) return { stringValue: str(f) }
    if (f.field === 2) return { boolValue: f.value !== 0n }
    if (f.field === 3) return { intValue: String(BigInt.asIntN(64, f.value)) }
    if (f.field === 4) return { doubleValue: Buffer.from(f.value).readDoubleLE(0) }
    if (f.field === 5) return { arrayValue: { values: all(fields(f.value), 1).map((x) => anyValue(x.value)) } }
    return {}
  }
  const kv = (b) => {
    const fs = fields(b)
    return { key: str(one(fs, 1)), value: anyValue(one(fs, 2)?.value ?? Buffer.alloc(0)) }
  }
  const span = (b) => {
    const fs = fields(b)
    const hexOf = (n) => (one(fs, n) ? Buffer.from(one(fs, n).value).toString('hex') : undefined)
    const status = one(fs, 15) ? fields(one(fs, 15).value) : []
    return {
      traceId: hexOf(1),
      spanId: hexOf(2),
      ...(one(fs, 4) ? { parentSpanId: hexOf(4) } : {}),
      name: str(one(fs, 5)),
      kind: Number(one(fs, 6)?.value ?? 0),
      startTimeUnixNano: String(Buffer.from(one(fs, 7).value).readBigUInt64LE(0)),
      endTimeUnixNano: String(Buffer.from(one(fs, 8).value).readBigUInt64LE(0)),
      attributes: all(fs, 9).map((f) => kv(f.value)),
      status: status.length ? { ...(one(status, 2) ? { message: str(one(status, 2)) } : {}), ...(one(status, 3) ? { code: Number(one(status, 3).value) } : {}) } : {},
    }
  }
  return {
    resourceSpans: all(fields(buf), 1).map((rs) => {
      const r = fields(rs.value)
      return {
        resource: { attributes: all(fields(one(r, 1)?.value ?? Buffer.alloc(0)), 1).map((f) => kv(f.value)) },
        scopeSpans: all(r, 2).map((ss) => {
          const s = fields(ss.value)
          const scope = fields(one(s, 1)?.value ?? Buffer.alloc(0))
          return { scope: { name: str(one(scope, 1)), version: str(one(scope, 2)) }, spans: all(s, 2).map((sp) => span(sp.value)) }
        }),
      }
    }),
  }
}
