import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'

function detectLocale(): string {
  const saved = localStorage.getItem('llmxray-locale')
  if (saved && ['en', 'fr'].includes(saved)) return saved
  const browser = navigator.language
  if (browser.startsWith('fr')) return 'fr'
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  globalInjection: true,
  messages: { en, fr },
  numberFormats: {
    en: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
    fr: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
  },
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    fr: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
  },
})
