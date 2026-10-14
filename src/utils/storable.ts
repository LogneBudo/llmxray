import { isProxy, toRaw } from 'vue'

/**
 * A plain copy of `value` with every Vue reactive proxy unwrapped, at any depth.
 *
 * IndexedDB stores values with the structured clone algorithm, which refuses a
 * Proxy outright. Pinia state is deep-reactive, so an object read from a store
 * and its nested objects are all proxies; handing one to `put()` throws
 * DataCloneError and the write silently never happens. Unwrap before storing.
 *
 * Only own enumerable properties are copied, which is what structured clone
 * keeps anyway. Dates, typed arrays and other clonable non-plain objects pass
 * through untouched.
 */
export function storable<T>(value: T): T {
  return unwrap(value) as T
}

function unwrap(value: unknown): unknown {
  const raw = isProxy(value) ? toRaw(value) : value
  if (raw === null || typeof raw !== 'object') return raw
  if (Array.isArray(raw)) return raw.map(unwrap)
  const proto = Object.getPrototypeOf(raw)
  if (proto !== Object.prototype && proto !== null) return raw
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v !== undefined) out[k] = unwrap(v)
  }
  return out
}
