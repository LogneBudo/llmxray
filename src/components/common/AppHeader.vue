<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, ref, onMounted } from 'vue'

const route = useRoute()

const pageTitle = computed(() => {
  const name = route.name as string | undefined
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    session: 'Session',
    comparison: 'Compare Models',
    embeddings: 'Embeddings',
    rag: 'Knowledge Base',
    models: 'Models',
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
    <h1 class="text-lg font-semibold text-text-primary">{{ pageTitle }}</h1>
    <div class="flex items-center gap-3">
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
