import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from './locales/en'

/**
 * Components call `useI18n()`, which throws "Need to install with `app.use`
 * function" when a test mounts them without the plugin. Installing it globally
 * here keeps every component test exercising the REAL English catalog, so an
 * assertion on a visible label is an assertion on the shipped string.
 *
 * Deliberately a fresh instance rather than the app singleton from `src/i18n.ts`:
 * that one calls `detectLocale()`, which reads localStorage and navigator.language
 * and would make test output depend on the machine's locale.
 */
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  globalInjection: true,
  messages: { en },
})

config.global.plugins = [...(config.global.plugins ?? []), i18n]
