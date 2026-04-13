import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'
import zh from './locales/zh'
import ar from './locales/ar'
import sr from './locales/sr'
import srCyrl from './locales/sr-Cyrl'

const SUPPORTED_LOCALES = ['en', 'fr', 'zh', 'ar', 'sr', 'sr-Cyrl']

function detectLocale(): string {
  const saved = localStorage.getItem('llmxray-locale')
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  const browser = navigator.language
  if (browser.startsWith('fr')) return 'fr'
  if (browser.startsWith('zh')) return 'zh'
  if (browser.startsWith('ar')) return 'ar'
  // Serbian: prefer Cyrillic by default if browser language is sr (cultural identity marker)
  if (browser === 'sr-Latn' || browser.startsWith('sr-Latn')) return 'sr'
  if (browser.startsWith('sr')) return 'sr-Cyrl'
  // if (browser.startsWith('he')) return 'he'
  // if (browser.startsWith('ja')) return 'ja'
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  globalInjection: true,
  messages: { en, fr, zh, ar, sr, 'sr-Cyrl': srCyrl },
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
    sr: {
      decimal: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      percent: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
    },
    'sr-Cyrl': {
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
    sr: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
    'sr-Cyrl': {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    },
  },
})
