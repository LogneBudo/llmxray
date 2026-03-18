import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/i18n'

export type Locale = 'en' | 'fr' | 'ar' | 'he' | 'zh' | 'ja'

const RTL_LOCALES = new Set<string>(['ar', 'he', 'fa', 'ur'])

export const AVAILABLE_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  // { code: 'he', label: 'עברית', flag: '🇮🇱' },
  // { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<Locale>(i18n.global.locale.value as Locale)

  function setLocale(l: Locale) {
    locale.value = l
    ;(i18n.global.locale as unknown as { value: string }).value = l
    localStorage.setItem('llmxray-locale', l)
    document.documentElement.lang = l
    document.documentElement.dir = RTL_LOCALES.has(l) ? 'rtl' : 'ltr'
  }

  // Set html lang + dir on init
  document.documentElement.lang = locale.value
  document.documentElement.dir = RTL_LOCALES.has(locale.value) ? 'rtl' : 'ltr'

  return {
    locale,
    setLocale,
  }
})
