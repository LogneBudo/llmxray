import { createI18n } from 'vue-i18n'
import en from './locales/en'

// English ships in the main bundle as the fallback; every other language is its own file,
// fetched the first time it is shown.
type Messages = Record<string, unknown>
const LOADERS: Record<string, () => Promise<{ default: Messages }>> = {
  fr: () => import('./locales/fr'),
  zh: () => import('./locales/zh'),
  ar: () => import('./locales/ar'),
  sr: () => import('./locales/sr'),
  'sr-Cyrl': () => import('./locales/sr-Cyrl'),
}

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
  messages: { en },
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

export async function loadLocale(locale: string): Promise<void> {
  const load = LOADERS[locale]
  if (!load || (i18n.global.availableLocales as string[]).includes(locale)) return
  // Other languages may miss keys English has; those fall back, so their shape is looser.
  const setMessages = i18n.global.setLocaleMessage as (locale: string, messages: Messages) => void
  setMessages(locale, (await load()).default)
}
