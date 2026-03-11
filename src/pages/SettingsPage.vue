<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ollamaClient } from '@/services/ollama-client'

const ollamaUrl = ref('http://localhost:11434')
const defaultTemperature = ref(0.7)
const defaultContextLength = ref(4096)
const connectionStatus = ref<'connected' | 'disconnected' | 'testing'>('disconnected')

function loadSettings() {
  const saved = localStorage.getItem('llmxray-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>
      if (typeof parsed.ollamaUrl === 'string') ollamaUrl.value = parsed.ollamaUrl
      if (typeof parsed.defaultTemperature === 'number') defaultTemperature.value = parsed.defaultTemperature
      if (typeof parsed.defaultContextLength === 'number') defaultContextLength.value = parsed.defaultContextLength
    } catch {
      // Ignore
    }
  }
}

function saveSettings() {
  localStorage.setItem(
    'llmxray-settings',
    JSON.stringify({
      ollamaUrl: ollamaUrl.value,
      defaultTemperature: defaultTemperature.value,
      defaultContextLength: defaultContextLength.value,
    }),
  )
}

async function testConnection() {
  connectionStatus.value = 'testing'
  try {
    const res = await fetch(`${ollamaUrl.value}/api/tags`)
    connectionStatus.value = res.ok ? 'connected' : 'disconnected'
  } catch {
    connectionStatus.value = 'disconnected'
  }
}

function applyUrl() {
  // The proxy handles routing, but we store the preference
  saveSettings()
}

onMounted(() => {
  loadSettings()
  testConnection()
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- Connection -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <h3 class="text-sm font-medium text-text-primary">Ollama Connection</h3>
      <div class="flex gap-3">
        <input
          v-model="ollamaUrl"
          class="flex-1 rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          placeholder="http://localhost:11434"
        />
        <button
          class="rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-primary hover:bg-border-default transition-colors"
          @click="testConnection"
        >
          Test
        </button>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-sm text-surface hover:bg-accent-hover transition-colors"
          @click="applyUrl"
        >
          Save
        </button>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="{
            'bg-success': connectionStatus === 'connected',
            'bg-error': connectionStatus === 'disconnected',
            'bg-warning animate-pulse': connectionStatus === 'testing',
          }"
        />
        <span class="text-text-secondary">
          {{ connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'testing' ? 'Testing...' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- Defaults -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <h3 class="text-sm font-medium text-text-primary">Default Parameters</h3>

      <div class="space-y-3">
        <div>
          <label class="block text-xs text-text-muted mb-1">Temperature</label>
          <input
            v-model.number="defaultTemperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="w-full"
            @change="saveSettings"
          />
          <span class="text-xs text-text-secondary">{{ defaultTemperature }}</span>
        </div>

        <div>
          <label class="block text-xs text-text-muted mb-1">Context Length</label>
          <select
            v-model.number="defaultContextLength"
            class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            @change="saveSettings"
          >
            <option :value="2048">2048</option>
            <option :value="4096">4096</option>
            <option :value="8192">8192</option>
            <option :value="16384">16384</option>
            <option :value="32768">32768</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
