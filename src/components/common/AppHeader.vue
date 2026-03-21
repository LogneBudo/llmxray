<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme-store'
import { useLocaleStore, AVAILABLE_LOCALES } from '@/stores/locale-store'
import { Sun, Moon } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()

function toggleLocale() {
  const codes = AVAILABLE_LOCALES.map(l => l.code)
  const idx = codes.indexOf(localeStore.locale)
  localeStore.setLocale(codes[(idx + 1) % codes.length]!)
}

const currentFlag = computed(() =>
  AVAILABLE_LOCALES.find(l => l.code === localeStore.locale)?.flag ?? '🌐'
)

const pageTitle = computed(() => {
  const name = route.name as string | undefined
  const titles: Record<string, string> = {
    dashboard: t('common.header.chatDiagnostics'),
    session: t('common.header.session'),
    comparison: t('common.header.compareModels'),
    embeddings: t('common.header.embeddings'),
    rag: t('common.header.knowledgeBase'),
    models: t('common.header.models'),
    benchmark: t('common.header.benchmark'),
    costs: t('common.header.costDashboard'),
    analytics: t('common.header.analytics'),
    tools: t('common.header.toolWorkshop'),
    system: t('common.header.mySystem'),
    settings: t('common.header.settings'),
  }
  return titles[name ?? ''] ?? t('common.header.default')
})

const connected = ref(false)

async function checkConnection() {
  try {
    const res = await fetch('/api/tags')
    connected.value = res.ok
  } catch {
    connected.value = false
  }
}

onMounted(() => {
  checkConnection()
  setInterval(checkConnection, 15_000)
})
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-border-default bg-surface-raised px-6">
    <h1 class="text-lg font-semibold text-text-primary">
      <template v-if="route.name === 'session'">
        <RouterLink to="/" class="text-text-secondary hover:text-accent transition-colors">{{ $t('common.header.chatDiagnostics') }}</RouterLink>
        <span class="mx-2 text-text-muted">/</span>
        <span>Session {{ (route.params.id as string)?.slice(0, 8) }}</span>
      </template>
      <template v-else>{{ pageTitle }}</template>
    </h1>
    <div class="flex items-center gap-3">
      <!-- Theme toggle -->
      <button
        class="flex items-center justify-center rounded-lg p-1.5 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
        :title="`Theme: ${themeStore.mode}`"
        @click="themeStore.setMode(themeStore.resolvedTheme === 'dark' ? 'light' : 'dark')"
      >
        <Sun v-if="themeStore.resolvedTheme === 'dark'" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>

      <!-- Language toggle -->
      <button
        class="flex items-center justify-center rounded-lg px-1.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
        :title="$t('settings.general.language')"
        @click="toggleLocale"
      >
        {{ currentFlag }}
      </button>

      <div class="flex items-center gap-2 text-sm text-text-secondary">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="connected ? 'bg-success' : 'bg-error'"
        />
        {{ connected ? $t('common.status.ollamaConnected') : $t('common.status.ollamaDisconnected') }}
      </div>
    </div>
  </header>
</template>
