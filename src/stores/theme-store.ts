import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('llmxray-theme') as ThemeMode) ?? 'system')

  const resolvedTheme = ref<'dark' | 'light'>(resolve(mode.value))

  function resolve(m: ThemeMode): 'dark' | 'light' {
    if (m === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return m
  }

  function setMode(m: ThemeMode) {
    mode.value = m
    localStorage.setItem('llmxray-theme', m)
    resolvedTheme.value = resolve(m)
    applyTheme()
  }

  function applyTheme() {
    const root = document.documentElement
    if (resolvedTheme.value === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode.value === 'system') {
      resolvedTheme.value = resolve('system')
      applyTheme()
    }
  })

  // Apply on init
  watch(mode, () => {
    resolvedTheme.value = resolve(mode.value)
    applyTheme()
  }, { immediate: true })

  return {
    mode,
    resolvedTheme,
    setMode,
  }
})
