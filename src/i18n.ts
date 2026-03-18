import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'
import zh from './locales/zh'
import ar from './locales/ar'

const SUPPORTED_LOCALES = ['en', 'fr', 'zh', 'ar']

function detectLocale(): string {
  const saved = localStorage.getItem('llmxray-locale')
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  const browser = navigator.language
  if (browser.startsWith('fr')) return 'fr'
  if (browser.startsWith('zh')) return 'zh'
  if (browser.startsWith('ar')) return 'ar'
  // if (browser.startsWith('he')) return 'he'
  // if (browser.startsWith('ja')) return 'ja'
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  globalInjection: true,
  messages: { en, fr, zh, ar },
  numberFormats: {
    en: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
    fr: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
    zh: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
    ar: {
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
    zh: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    ar: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
  },
})
