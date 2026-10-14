import { describe, it, expect } from 'vitest'
import { isProxy, reactive, ref } from 'vue'
import { storable } from './storable'

describe('storable', () => {
  it('unwraps a reactive object and everything nested in it', () => {
    const conv = reactive({
      id: 'c1',
      options: { temperature: 0.7 },
      messages: [{ id: 'm1', attachments: [{ name: 'a.png' }] }],
    })
    const plain = storable(conv)
    expect(isProxy(plain)).toBe(false)
    expect(isProxy(plain.options)).toBe(false)
    expect(isProxy(plain.messages)).toBe(false)
    expect(isProxy(plain.messages[0]!.attachments)).toBe(false)
    expect(plain).toEqual({
      id: 'c1',
      options: { temperature: 0.7 },
      messages: [{ id: 'm1', attachments: [{ name: 'a.png' }] }],
    })
  })

  it('unwraps a proxy stored inside a plain object, and survives structured clone', () => {
    const options = reactive({ seed: 42 })
    const session = { id: 's1', options, metrics: null, createdAt: 1 }
    expect(() => structuredClone(session)).toThrow()
    const plain = storable(session)
    expect(() => structuredClone(plain)).not.toThrow()
    expect(plain.options).toEqual({ seed: 42 })
  })

  it('unwraps the value of a Map entry read through a reactive ref', () => {
    const map = ref(new Map<string, { id: string; tags: string[] }>())
    map.value.set('k', { id: 'k', tags: ['x'] })
    const entry = map.value.get('k')!
    expect(isProxy(entry)).toBe(true)
    const plain = storable(entry)
    expect(isProxy(plain)).toBe(false)
    expect(isProxy(plain.tags)).toBe(false)
    expect(plain).toEqual({ id: 'k', tags: ['x'] })
  })

  it('leaves primitives, null and dates alone', () => {
    const d = new Date(0)
    expect(storable(3)).toBe(3)
    expect(storable(null)).toBe(null)
    expect(storable({ d }).d).toBe(d)
  })
})
