import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/i18n'

export type Locale = 'en' | 'fr'

export const AVAILABLE_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<Locale>(i18n.global.locale.value as Locale)

  function setLocale(l: Locale) {
    locale.value = l
    i18n.global.locale.value = l
    localStorage.setItem('llmxray-locale', l)
    document.documentElement.lang = l
  }

  // Set html lang on init
  document.documentElement.lang = locale.value

  return {
    locale,
    setLocale,
  }
})
