<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme-store'
import { useLocaleStore, AVAILABLE_LOCALES, type Locale } from '@/stores/locale-store'
import { Sun, Moon, ChevronDown } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()

const localeMenuOpen = ref(false)
const localeMenuRef = ref<HTMLElement | null>(null)

const currentFlag = computed(() =>
  AVAILABLE_LOCALES.find(l => l.code === localeStore.locale)?.flag ?? 'xx'
)

function selectLocale(code: Locale) {
  localeStore.setLocale(code)
  localeMenuOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (!localeMenuOpen.value) return
  if (localeMenuRef.value && !localeMenuRef.value.contains(e.target as Node)) {
    localeMenuOpen.value = false
  }
}

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
    fim: t('common.header.fim'),
    protocols: t('common.header.protocols'),
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
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
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

      <!-- Language dropdown -->
      <div ref="localeMenuRef" class="relative">
        <button
          class="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
          :title="$t('settings.general.language')"
          :aria-expanded="localeMenuOpen"
          aria-haspopup="listbox"
          @click.stop="localeMenuOpen = !localeMenuOpen"
        >
          <span :class="`fi fi-${currentFlag}`" class="!h-3.5 !w-5 rounded-sm" />
          <ChevronDown class="h-3 w-3" :class="{ 'rotate-180': localeMenuOpen }" />
        </button>
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <ul
            v-if="localeMenuOpen"
            role="listbox"
            class="absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-border-default bg-surface-raised py-1 shadow-lg"
          >
            <li
              v-for="loc in AVAILABLE_LOCALES"
              :key="loc.code"
              role="option"
              :aria-selected="loc.code === localeStore.locale"
              class="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
              :class="{ 'bg-surface-overlay text-text-primary': loc.code === localeStore.locale }"
              @click="selectLocale(loc.code)"
            >
              <span :class="`fi fi-${loc.flag}`" class="!h-3.5 !w-5 rounded-sm" />
              <span>{{ loc.label }}</span>
            </li>
          </ul>
        </Transition>
      </div>

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
