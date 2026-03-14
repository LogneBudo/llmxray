<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme-store'

const route = useRoute()
const themeStore = useThemeStore()

const pageTitle = computed(() => {
  const name = route.name as string | undefined
  const titles: Record<string, string> = {
    dashboard: 'Chat Diagnostics',
    session: 'Session',
    comparison: 'Compare Models',
    embeddings: 'Embeddings',
    rag: 'Knowledge Base',
    models: 'Models',
    benchmark: 'Benchmark',
    tools: 'Tool Workshop',
    system: 'My System',
    settings: 'Settings',
  }
  return titles[name ?? ''] ?? 'LLMxRay'
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
        <RouterLink to="/" class="text-text-secondary hover:text-accent transition-colors">Chat Diagnostics</RouterLink>
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
        <!-- Sun icon (shown in dark mode) -->
        <svg v-if="themeStore.resolvedTheme === 'dark'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      <div class="flex items-center gap-2 text-sm text-text-secondary">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="connected ? 'bg-success' : 'bg-error'"
        />
        {{ connected ? 'Ollama Connected' : 'Ollama Disconnected' }}
      </div>
    </div>
  </header>
</template>
