import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToolDefinitionStore } from './tool-definition-store'
import type { OllamaToolDefinition } from '@/types/ollama'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

function makeTool(name: string): OllamaToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description: `A ${name} tool`,
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input value' },
        },
        required: ['input'],
      },
    },
  }
}

describe('tool-definition-store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useToolDefinitionStore()
    expect(store.allDefinitions).toHaveLength(0)
    expect(store.enabledDefinitions).toHaveLength(0)
  })

  it('addDefinition stores a tool and returns its ID', () => {
    const store = useToolDefinitionStore()
    const id = store.addDefinition(makeTool('get_weather'))

    expect(id).toBeDefined()
    expect(store.allDefinitions).toHaveLength(1)
    expect(store.allDefinitions[0]!.definition.function.name).toBe('get_weather')
    expect(store.allDefinitions[0]!.enabled).toBe(true)
  })

  it('addDefinition persists to localStorage', () => {
    const store = useToolDefinitionStore()
    store.addDefinition(makeTool('test'))

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'llmxray-tool-definitions',
      expect.any(String),
    )
  })

  it('enabledDefinitions returns only enabled tools', () => {
    const store = useToolDefinitionStore()
    const id1 = store.addDefinition(makeTool('tool_a'))
    store.addDefinition(makeTool('tool_b'))

    store.toggleEnabled(id1)

    expect(store.enabledDefinitions).toHaveLength(1)
    expect(store.enabledDefinitions[0]!.function.name).toBe('tool_b')
  })

  it('updateDefinition modifies existing tool', () => {
    const store = useToolDefinitionStore()
    const id = store.addDefinition(makeTool('old_name'))

    store.updateDefinition(id, makeTool('new_name'))

    expect(store.allDefinitions[0]!.definition.function.name).toBe('new_name')
  })

  it('updateDefinition does nothing for unknown ID', () => {
    const store = useToolDefinitionStore()
    store.addDefinition(makeTool('original'))

    store.updateDefinition('nonexistent', makeTool('changed'))

    expect(store.allDefinitions[0]!.definition.function.name).toBe('original')
  })

  it('removeDefinition deletes a tool', () => {
    const store = useToolDefinitionStore()
    const id = store.addDefinition(makeTool('to_remove'))

    store.removeDefinition(id)

    expect(store.allDefinitions).toHaveLength(0)
  })

  it('toggleEnabled flips the enabled state', () => {
    const store = useToolDefinitionStore()
    const id = store.addDefinition(makeTool('toggle_me'))

    expect(store.getById(id)!.enabled).toBe(true)
    store.toggleEnabled(id)
    expect(store.getById(id)!.enabled).toBe(false)
    store.toggleEnabled(id)
    expect(store.getById(id)!.enabled).toBe(true)
  })

  it('toggleEnabled does nothing for unknown ID', () => {
    const store = useToolDefinitionStore()
    store.addDefinition(makeTool('safe'))

    store.toggleEnabled('nonexistent')
    expect(store.allDefinitions).toHaveLength(1)
  })

  it('getById returns the stored definition', () => {
    const store = useToolDefinitionStore()
    const id = store.addDefinition(makeTool('findable'))

    const found = store.getById(id)
    expect(found).toBeDefined()
    expect(found!.id).toBe(id)
  })

  it('getById returns undefined for unknown ID', () => {
    const store = useToolDefinitionStore()
    expect(store.getById('nope')).toBeUndefined()
  })

  it('loads persisted data on init', () => {
    // Pre-populate localStorage
    const tool = {
      id: 'pre-1',
      definition: makeTool('persisted'),
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    localStorageMock.setItem('llmxray-tool-definitions', JSON.stringify([tool]))

    const store = useToolDefinitionStore()
    expect(store.allDefinitions).toHaveLength(1)
    expect(store.allDefinitions[0]!.definition.function.name).toBe('persisted')
  })
})
