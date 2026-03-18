<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RefreshCw, Trash2 } from 'lucide-vue-next'
import { useModelStore } from '@/stores/model-store'
import { ollamaClient } from '@/services/ollama-client'
import { formatBytes } from '@/utils/format'
import { MODEL_CATALOG, type CatalogEntry, type CatalogVariant } from '@/data/model-catalog'
import ModelCapabilityIcons from '@/components/common/ModelCapabilityIcons.vue'

const modelStore = useModelStore()

// ── Installed Models ─────────────────────────────────────────────
const confirmDeleteName = ref<string | null>(null)
const deleteError = ref<string | null>(null)

async function handleDelete(name: string) {
  if (confirmDeleteName.value === name) {
    try {
      deleteError.value = null
      await modelStore.deleteModel(name)
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : 'Delete failed'
    }
    confirmDeleteName.value = null
  } else {
    confirmDeleteName.value = name
    setTimeout(() => {
      if (confirmDeleteName.value === name) confirmDeleteName.value = null
    }, 3000)
  }
}

// ── Catalog ──────────────────────────────────────────────────────
const activeCategory = ref('all')
const searchQuery = ref('')

const categories = computed(() => [
  { key: 'all', label: 'All' },
  ...MODEL_CATALOG.map((c) => ({ key: c.key, label: c.label })),
])

const filteredEntries = computed(() => {
  let entries: Array<CatalogEntry & { category: string }> = []

  for (const cat of MODEL_CATALOG) {
    if (activeCategory.value !== 'all' && cat.key !== activeCategory.value) continue
    for (const entry of cat.entries) {
      entries.push({ ...entry, category: cat.key })
    }
  }

  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    entries = entries.filter(
      (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    )
  }

  return entries
})

// Track which variant is selected per catalog entry
const selectedVariants = ref<Map<string, string>>(new Map())

function getSelectedVariant(entry: CatalogEntry): CatalogVariant {
  const tag = selectedVariants.value.get(entry.name)
  return entry.variants.find((v) => v.tag === tag) ?? entry.variants[0]!
}

function selectVariant(entryName: string, tag: string) {
  const next = new Map(selectedVariants.value)
  next.set(entryName, tag)
  selectedVariants.value = next
}

function isInstalled(entryName: string, variantTag: string): boolean {
  const fullName = variantTag === 'latest' ? entryName : `${entryName}:${variantTag}`
  return modelStore.modelNames.some(
    (n) => n === fullName || n === `${fullName}:latest` || n === entryName,
  )
}

// ── Pulling ──────────────────────────────────────────────────────
const pullProgress = ref<Map<string, { status: string; percent: number }>>(new Map())
const pullError = ref<string | null>(null)

// Free-text pull
const customPullName = ref('')

async function pullModel(name: string) {
  const progress = new Map(pullProgress.value)
  progress.set(name, { status: 'Starting...', percent: 0 })
  pullProgress.value = progress
  pullError.value = null

  try {
    await ollamaClient.pullModel(name, (status, completed, total) => {
      const p = new Map(pullProgress.value)
      const pct = completed && total ? Math.round((completed / total) * 100) : 0
      p.set(name, { status, percent: pct })
      pullProgress.value = p
    })

    // Done — refresh models
    await modelStore.fetchModels()

    const p = new Map(pullProgress.value)
    p.delete(name)
    pullProgress.value = p
  } catch (e) {
    pullError.value = `Failed to pull ${name}: ${e instanceof Error ? e.message : 'Unknown error'}`
    const p = new Map(pullProgress.value)
    p.delete(name)
    pullProgress.value = p
  }
}

function pullCatalogEntry(entry: CatalogEntry) {
  const variant = getSelectedVariant(entry)
  const fullName = variant.tag === 'latest' ? entry.name : `${entry.name}:${variant.tag}`
  pullModel(fullName)
}

function pullCustomModel() {
  const name = customPullName.value.trim()
  if (!name) return
  pullModel(name)
  customPullName.value = ''
}

function isPulling(name: string): boolean {
  return pullProgress.value.has(name)
}

onMounted(() => {
  if (modelStore.models.length === 0) {
    modelStore.fetchModels()
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Installed Models -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary">
          {{ $t('settings.models.installedModels') }}
          <span class="ml-1 text-text-muted">({{ modelStore.models.length }})</span>
        </h3>
        <button
          class="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
          @click="modelStore.fetchModels()"
        >
          <RefreshCw class="h-3.5 w-3.5" />
          {{ $t('settings.models.refresh') }}
        </button>
      </div>

      <p v-if="deleteError" class="text-xs text-error">{{ deleteError }}</p>

      <div v-if="modelStore.models.length === 0" class="py-4 text-center text-sm text-text-muted">
        {{ $t('settings.models.noModelsInstalled') }}
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="model in modelStore.models"
          :key="model.name"
          class="flex items-center gap-3 rounded-lg bg-surface px-3 py-2.5 text-xs"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-text-primary truncate">{{ model.name }}</span>
              <ModelCapabilityIcons :model-name="model.name" />
            </div>
            <div class="flex gap-3 text-[10px] text-text-muted mt-0.5">
              <span v-if="model.details?.family">{{ model.details.family }}</span>
              <span v-if="model.details?.parameter_size">{{ model.details.parameter_size }}</span>
              <span v-if="model.details?.quantization_level">{{ model.details.quantization_level }}</span>
            </div>
          </div>
          <span class="shrink-0 text-[10px] text-text-muted">{{ formatBytes(model.size) }}</span>
          <button
            v-if="confirmDeleteName === model.name"
            class="shrink-0 rounded-lg border border-error/30 px-2.5 py-1 text-[10px] text-error hover:bg-error/10 transition-colors"
            @click="handleDelete(model.name)"
          >
            {{ $t('settings.models.confirmDeletePrompt') }}
          </button>
          <button
            v-else
            class="shrink-0 rounded p-1 text-text-muted hover:text-error transition-colors"
            :title="$t('settings.models.delete')"
            @click="handleDelete(model.name)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Download Catalog -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <h3 class="text-sm font-medium text-text-primary">{{ $t('settings.models.downloadModels') }}</h3>

      <!-- Category filter -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="rounded-lg px-3 py-1.5 text-xs transition-colors"
          :class="
            activeCategory === cat.key
              ? 'bg-accent/10 text-accent'
              : 'bg-surface text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
          "
          @click="activeCategory = cat.key"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Search -->
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('settings.models.searchModels')"
        class="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
      />

      <p v-if="pullError" class="text-xs text-error">{{ pullError }}</p>

      <!-- Catalog entries -->
      <div v-if="filteredEntries.length === 0" class="py-4 text-center text-sm text-text-muted">
        {{ $t('settings.models.noModelsMatch') }}
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="entry in filteredEntries"
          :key="entry.name"
          class="rounded-lg border border-border-default bg-surface p-3"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-text-primary">{{ entry.name }}</span>
                <span
                  v-if="isInstalled(entry.name, getSelectedVariant(entry).tag)"
                  class="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] text-success"
                >
                  {{ $t('settings.models.installed') }}
                </span>
              </div>
              <p class="text-[10px] text-text-muted mt-0.5">{{ entry.description }}</p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <!-- Variant selector -->
              <select
                v-if="entry.variants.length > 1"
                :value="getSelectedVariant(entry).tag"
                class="rounded border border-border-default bg-surface px-2 py-1 text-[10px] text-text-primary outline-none focus:border-accent"
                @change="selectVariant(entry.name, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="v in entry.variants" :key="v.tag" :value="v.tag">
                  {{ v.params }} ({{ v.size }})
                </option>
              </select>
              <span v-else class="text-[10px] text-text-muted">
                {{ entry.variants[0]!.params }} ({{ entry.variants[0]!.size }})
              </span>

              <!-- Pull button -->
              <button
                :disabled="isPulling(`${entry.name}:${getSelectedVariant(entry).tag}`) || isPulling(entry.name)"
                class="rounded-lg bg-accent px-3 py-1 text-[10px] text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
                @click="pullCatalogEntry(entry)"
              >
                {{ $t('settings.models.pull') }}
              </button>
            </div>
          </div>

          <!-- Pull progress -->
          <div
            v-if="pullProgress.has(`${entry.name}:${getSelectedVariant(entry).tag}`) || pullProgress.has(entry.name)"
            class="mt-2 space-y-1"
          >
            <div class="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
              <div
                class="h-full rounded-full bg-accent transition-all duration-300"
                :style="{ width: `${(pullProgress.get(`${entry.name}:${getSelectedVariant(entry).tag}`) ?? pullProgress.get(entry.name))?.percent ?? 0}%` }"
              />
            </div>
            <p class="text-[9px] text-text-muted">
              {{ (pullProgress.get(`${entry.name}:${getSelectedVariant(entry).tag}`) ?? pullProgress.get(entry.name))?.status }}
            </p>
          </div>
        </div>
      </div>

      <!-- Free-text pull -->
      <div class="border-t border-border-default pt-4">
        <p class="mb-2 text-xs text-text-muted">{{ $t('settings.models.pullByName') }}</p>
        <div class="flex gap-2">
          <input
            v-model="customPullName"
            type="text"
            placeholder="e.g. llama3.2:3b"
            class="flex-1 rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent font-mono"
            @keydown.enter="pullCustomModel"
          />
          <button
            :disabled="!customPullName.trim() || isPulling(customPullName.trim())"
            class="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
            @click="pullCustomModel"
          >
            {{ $t('settings.models.pull') }}
          </button>
        </div>
        <!-- Custom pull progress -->
        <template v-for="[name, prog] in pullProgress" :key="name">
          <div
            v-if="!filteredEntries.some((e) => `${e.name}:${getSelectedVariant(e).tag}` === name || e.name === name)"
            class="mt-2 space-y-1"
          >
            <div class="flex items-center justify-between text-[10px] text-text-muted">
              <span class="font-mono">{{ name }}</span>
              <span>{{ prog.percent }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
              <div
                class="h-full rounded-full bg-accent transition-all duration-300"
                :style="{ width: `${prog.percent}%` }"
              />
            </div>
            <p class="text-[9px] text-text-muted">{{ prog.status }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
