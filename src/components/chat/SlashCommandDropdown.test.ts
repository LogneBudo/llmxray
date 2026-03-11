import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SlashCommandDropdown from './SlashCommandDropdown.vue'

// Mock the registry
vi.mock('@/services/slash-command-registry', () => {
  const mockCommands = [
    { name: 'help', description: 'Show help', category: 'chat', usage: '/help', execute: vi.fn() },
    { name: 'clear', description: 'Clear chat', category: 'chat', usage: '/clear', execute: vi.fn() },
    { name: 'model', description: 'Switch model', category: 'settings', usage: '/model [name]', execute: vi.fn() },
    { name: 'temperature', description: 'Set temperature', category: 'settings', usage: '/temperature <value>', execute: vi.fn() },
    { name: 'rag', description: 'Toggle RAG', category: 'navigation', usage: '/rag', execute: vi.fn() },
  ]

  return {
    getMatchingCommands: vi.fn((prefix: string) => {
      const p = prefix.replace(/^\//, '').toLowerCase()
      return p ? mockCommands.filter((c) => c.name.startsWith(p)) : mockCommands
    }),
    getCommandsByCategory: vi.fn(() => ({
      chat: mockCommands.filter((c) => c.category === 'chat'),
      settings: mockCommands.filter((c) => c.category === 'settings'),
      navigation: mockCommands.filter((c) => c.category === 'navigation'),
    })),
  }
})

describe('SlashCommandDropdown', () => {
  function createWrapper(props = {}) {
    return mount(SlashCommandDropdown, {
      props: {
        filter: '',
        visible: true,
        ...props,
      },
    })
  }

  it('renders commands when visible', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('hides when visible is false', () => {
    const wrapper = createWrapper({ visible: false })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('filters commands by prefix', () => {
    const wrapper = createWrapper({ filter: '/he' })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]!.text()).toContain('help')
  })

  it('shows all commands for empty filter', () => {
    const wrapper = createWrapper({ filter: '' })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(5)
  })

  it('emits select when a command is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('highlights the selected index', () => {
    const wrapper = createWrapper()
    const firstButton = wrapper.findAll('button')[0]!
    expect(firstButton.classes()).toContain('bg-accent/10')
  })

  describe('keyboard navigation via handleKeydown', () => {
    it('ArrowDown moves selection forward', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      vm.handleKeydown(event)
      await nextTick()

      const buttons = wrapper.findAll('button')
      expect(buttons[1]!.classes()).toContain('bg-accent/10')
    })

    it('ArrowUp wraps to last item from first', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      vm.handleKeydown(event)
      await nextTick()

      const buttons = wrapper.findAll('button')
      const lastIdx = buttons.length - 1
      expect(buttons[lastIdx]!.classes()).toContain('bg-accent/10')
    })

    it('Tab emits select for current item', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      vm.handleKeydown(event)

      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('Enter emits select for current item', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      vm.handleKeydown(event)

      expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('Escape emits close', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      vm.handleKeydown(event)

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('returns false when not visible', () => {
      const wrapper = createWrapper({ visible: false })
      const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      const result = vm.handleKeydown(event)

      expect(result).toBe(false)
    })
  })

  it('displays category labels', () => {
    const wrapper = createWrapper()
    const text = wrapper.text()
    expect(text).toContain('Chat & Conversation')
    expect(text).toContain('Model & Settings')
    expect(text).toContain('Features & Navigation')
  })

  it('resets selectedIndex when filter changes', async () => {
    const wrapper = createWrapper({ filter: '' })
    const vm = wrapper.vm as { handleKeydown: (e: KeyboardEvent) => boolean }

    // Move down
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
    vm.handleKeydown(event)

    // Change filter — should reset index
    await wrapper.setProps({ filter: '/m' })
    const buttons = wrapper.findAll('button')
    if (buttons.length > 0) {
      expect(buttons[0]!.classes()).toContain('bg-accent/10')
    }
  })
})
