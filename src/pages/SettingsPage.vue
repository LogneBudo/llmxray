<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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

const temperatureLabel = computed(() => {
  const t = defaultTemperature.value
  if (t === 0) return 'Deterministic'
  if (t <= 0.3) return 'Focused'
  if (t <= 0.7) return 'Balanced'
  if (t <= 1.2) return 'Creative'
  return 'Very random'
})

const temperaturePercent = computed(() => (defaultTemperature.value / 2) * 100)

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

      <div class="space-y-6">
        <!-- Temperature -->
        <div>
          <div class="flex items-center gap-1.5 mb-3">
            <label class="text-xs text-text-muted">Temperature</label>
            <div class="group relative">
              <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-default text-[10px] text-text-muted cursor-help">?</span>
              <div class="pointer-events-none absolute left-full top-1/2 z-10 ml-2 w-72 -translate-y-1/2 rounded-lg border border-border-default bg-surface-raised p-3 text-xs text-text-secondary opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <p class="font-medium text-text-primary mb-1">What is Temperature?</p>
                <p class="mb-2">Temperature controls how "creative" or "random" the model's answers are. Think of it like a dial between <strong>focused</strong> and <strong>imaginative</strong>.</p>
                <ul class="space-y-1 text-[11px]">
                  <li><strong>0</strong> — Always picks the most likely word. Great for facts, math, and code.</li>
                  <li><strong>0.7</strong> — A good balance: mostly sensible but with some variety. This is the default because it works well for general conversation.</li>
                  <li><strong>1.0+</strong> — More surprising and creative, but may produce nonsense at high values.</li>
                </ul>
                <div class="mt-2 border-t border-border-default/50 pt-2 text-[10px] text-text-muted">Default: 0.7 — recommended starting point for most tasks.</div>
              </div>
            </div>
            <!-- Current value + label together -->
            <span class="ml-auto text-xs text-text-primary font-medium">{{ defaultTemperature }}</span>
            <span class="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary">{{ temperatureLabel }}</span>
          </div>

          <!-- Slider -->
          <input
            v-model.number="defaultTemperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="w-full"
            @change="saveSettings"
          />

          <!-- Scale labels -->
          <div class="relative mt-1 h-4">
            <span class="absolute left-0 text-[10px] text-text-muted">0</span>
            <span class="absolute text-[10px] text-text-muted" style="left: 15%">0.3</span>
            <span class="absolute text-[10px] text-accent font-medium" style="left: 35%">0.7</span>
            <span class="absolute text-[10px] text-text-muted" style="left: 50%">1.0</span>
            <span class="absolute text-[10px] text-text-muted" style="left: 75%">1.5</span>
            <span class="absolute right-0 text-[10px] text-text-muted">2.0</span>
          </div>

          <!-- Human-readable scale -->
          <div class="relative mt-0.5 h-3">
            <div class="absolute inset-0 flex">
              <div class="flex-[15] text-center text-[9px] text-text-muted border-r border-border-default/30">Focused</div>
              <div class="flex-[20] text-center text-[9px] text-text-muted border-r border-border-default/30">Balanced</div>
              <div class="flex-[25] text-center text-[9px] text-text-muted border-r border-border-default/30">Creative</div>
              <div class="flex-[40] text-center text-[9px] text-text-muted">Wild</div>
            </div>
          </div>

          <!-- Pointer indicator showing current position -->
          <div class="relative h-1.5 mt-1">
            <div class="absolute h-1.5 rounded-full bg-border-default/30 w-full" />
            <div
              class="absolute h-1.5 rounded-full bg-accent/60 transition-all duration-150"
              :style="{ width: `${temperaturePercent}%` }"
            />
          </div>
        </div>

        <!-- Context Length -->
        <div>
          <div class="flex items-center gap-1.5 mb-2">
            <label class="text-xs text-text-muted">Context Length</label>
            <div class="group relative">
              <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-default text-[10px] text-text-muted cursor-help">?</span>
              <div class="pointer-events-none absolute left-full top-1/2 z-10 ml-2 w-72 -translate-y-1/2 rounded-lg border border-border-default bg-surface-raised p-3 text-xs text-text-secondary opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <p class="font-medium text-text-primary mb-1">What is Context Length?</p>
                <p class="mb-2">Context length is the model's "memory window" — how much of the conversation it can see at once. It's measured in <strong>tokens</strong> (roughly 1 token = 3/4 of a word).</p>
                <ul class="space-y-1 text-[11px]">
                  <li><strong>2,048</strong> — About 1,500 words. Good for short Q&A.</li>
                  <li><strong>4,096</strong> — About 3,000 words. Works for most conversations.</li>
                  <li><strong>8,192</strong> — About 6,000 words. Good for longer discussions or documents.</li>
                  <li><strong>16,384+</strong> — For very long documents or multi-page analysis.</li>
                </ul>
                <div class="mt-2 border-t border-border-default/50 pt-2 text-[10px] text-text-muted">Larger context uses more RAM/VRAM. If your system has limited memory, stick with 4,096.</div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <select
              v-model.number="defaultContextLength"
              class="rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              @change="saveSettings"
            >
              <option :value="2048">2,048</option>
              <option :value="4096">4,096</option>
              <option :value="8192">8,192</option>
              <option :value="16384">16,384</option>
              <option :value="32768">32,768</option>
              <option :value="65536">65,536</option>
              <option :value="131072">131,072</option>
            </select>
            <span class="text-[10px] text-text-muted">
              &#x2248; {{ Math.round(defaultContextLength * 0.75).toLocaleString() }} words
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
