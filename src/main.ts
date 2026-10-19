import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import { i18n, loadLocale } from './i18n'
import App from './App.vue'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/500.css'
import 'flag-icons/css/flag-icons.min.css'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
// The saved or browser language is in place before the first paint, never English first.
loadLocale(i18n.global.locale.value).finally(() => app.mount('#app'))
