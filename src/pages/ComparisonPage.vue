<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useComparisonStore } from '@/stores/comparison-store'
import { useSessionStore } from '@/stores/session-store'
import { useMetricsStore } from '@/stores/metrics-store'
import { startGeneration } from '@/services/generate-service'
import { exportAsJson, exportAsMarkdown } from '@/utils/share-comparison'
import ComparisonSlotConfigurator from '@/components/comparison/ComparisonSlotConfigurator.vue'
import ComparisonGrid from '@/components/comparison/ComparisonGrid.vue'
import ComparisonDiffView from '@/components/comparison/ComparisonDiffView.vue'
import ComparisonMetricsBar from '@/components/comparison/ComparisonMetricsBar.vue'
import ShareComparisonDialog from '@/components/comparison/ShareComparisonDialog.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { ChevronDown, Download, Share2 } from 'lucide-vue-next'
import { detectLanguage } from '@/utils/language-detect'
import { LANGUAGE_NAMES } from '@/utils/slot-labels'
import { AVAILABLE_LOCALES } from '@/stores/locale-store'
import type { ComparisonSlot, ComparisonRun } from '@/types/comparison'

const comparisonStore = useComparisonStore()
const sessionStore = useSessionStore()

const slots = ref<ComparisonSlot[]>([])
const prompt = ref('')
const isRunning = ref(false)
const viewMode = ref<'grid' | 'diff'>('grid')

const savedRuns = ref<ComparisonRun[]>([])
const showHistory = ref(false)
const showShareDialog = ref(false)
const showExportMenu = ref(false)

onMounted(async () => {
  savedRuns.value = await comparisonStore.loadSavedRuns()
})

function formatRunDate(ts: number) {
  return new Date(ts).toLocaleString()
}

function loadRun(run: ComparisonRun) {
  comparisonStore.loadRunIntoView(run)
  showHistory.value = false
}

async function deleteRun(id: string) {
  await comparisonStore.deleteSavedRun(id)
  savedRuns.value = savedRuns.value.filter(r => r.id !== id)
}

function handleExportJson() {
  if (activeRun.value) exportAsJson(activeRun.value)
  showExportMenu.value = false
}

function handleExportMarkdown() {
  if (activeRun.value) {
    const metricsStore = useMetricsStore()
    exportAsMarkdown(activeRun.value, (sid) => metricsStore.getMetrics(sid))
  }
  showExportMenu.value = false
}

function handleShare() {
  showExportMenu.value = false
  showShareDialog.value = true
}

const activeRun = computed(() => comparisonStore.activeRun)
const isLanguageMode = computed(() => slots.value.some(s => s.language !== undefined))
const canRun = computed(() => {
  if (slots.value.length === 0 || isRunning.value) return false
  if (isLanguageMode.value) {
    // In language mode, at least one slot must have a prompt
    return slots.value.some(s => s.promptOverride?.trim())
  }
  return prompt.value.trim().length > 0
})
const hasCompletedResults = computed(() =>
  activeRun.value?.executions.some((e) => e.status === 'completed') ?? false,
)

function updateSlotLanguage(index: number, lang: string) {
  slots.value = slots.value.map((s, i) =>
    i === index ? { ...s, language: lang, promptOverride: undefined, wasTranslated: false } : s
  )
}

function updateSlotPrompt(index: number, text: string) {
  const slot = slots.value[index]
  if (slot) {
    slot.promptOverride = text || undefined
    slot.wasTranslated = false
    // Detect language of pasted/typed text
    if (text && text.trim().length >= 20) {
      slot.detectedLanguage = detectLanguage(text.trim())
    } else {
      slot.detectedLanguage = null
    }
  }
}

const translatingSlots = ref<Set<string>>(new Set())
const translationAborts = ref<Map<string, AbortController>>(new Map())
const translationThinking = ref<Map<string, string>>(new Map())
const translationProgress = ref<Map<string, string>>(new Map())

const SUPPORTED_LANG_CODES = new Set<string>(AVAILABLE_LOCALES.map(l => l.code))

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur'])

function slotTextDirection(slot: ComparisonSlot): 'rtl' | 'ltr' {
  if (slot.wasTranslated) {
    // After translation: direction follows the target language (dropdown)
    return RTL_LANGS.has(slot.language ?? '') ? 'rtl' : 'ltr'
  }
  if (slot.detectedLanguage) {
    // Before translation: direction follows what's actually in the box
    return RTL_LANGS.has(slot.detectedLanguage) ? 'rtl' : 'ltr'
  }
  // Empty or too short to detect: follow the dropdown (placeholder direction)
  return RTL_LANGS.has(slot.language ?? '') ? 'rtl' : 'ltr'
}

function slotHasMismatch(slot: ComparisonSlot): boolean {
  return !!(
    slot.language &&
    slot.detectedLanguage &&
    slot.detectedLanguage !== slot.language &&
    !slot.wasTranslated
  )
}

function slotDetectedUnsupported(slot: ComparisonSlot): boolean {
  return !!(
    slot.detectedLanguage &&
    !SUPPORTED_LANG_CODES.has(slot.detectedLanguage) &&
    slot.detectedLanguage !== slot.language
  )
}

function cancelTranslation(slotId: string) {
  const abort = translationAborts.value.get(slotId)
  if (abort) abort.abort()
  translatingSlots.value.delete(slotId)
  translationAborts.value.delete(slotId)
  translationThinking.value.delete(slotId)
  translationProgress.value.delete(slotId)
}

async function translateSlot(index: number) {
  const slot = slots.value[index]
  if (!slot?.language || !slot.promptOverride?.trim()) return
  const slotId = slot.slotId

  // Abort any previous translation for this slot
  cancelTranslation(slotId)

  const abortController = new AbortController()
  translationAborts.value.set(slotId, abortController)
  translatingSlots.value.add(slotId)
  translationThinking.value.set(slotId, '')
  translationProgress.value.set(slotId, '')

  try {
    const langName = LANGUAGE_NAMES[slot.language] ?? slot.language
    const translationPrompt = `Translate the following text to ${langName}. Return only the translation, nothing else:\n\n${slot.promptOverride.trim()}`

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: slot.model, prompt: translationPrompt, stream: true }),
      signal: abortController.signal,
    })

    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let inThinking = false
    let thinkingText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const json = JSON.parse(line)
          if (json.response) {
            fullText += json.response

            // Parse <think> blocks
            if (fullText.includes('<think>') && !fullText.includes('</think>')) {
              inThinking = true
              thinkingText = fullText.split('<think>').pop() ?? ''
              translationThinking.value.set(slotId, thinkingText)
            } else if (inThinking && fullText.includes('</think>')) {
              inThinking = false
              translationThinking.value.set(slotId, '')
              // Extract text after </think>
              const afterThink = fullText.split('</think>').pop()?.trim() ?? ''
              translationProgress.value.set(slotId, afterThink)
            } else if (!inThinking) {
              // No thinking or after thinking — show the clean output
              const clean = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
              translationProgress.value.set(slotId, clean)
            }
          }
        } catch { /* skip malformed lines */ }
      }
    }

    // Final result: strip thinking blocks
    const finalText = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    if (finalText) {
      slot.promptOverride = finalText
      slot.wasTranslated = true
      slot.detectedLanguage = slot.language
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return // cancelled by user
    throw e
  } finally {
    translatingSlots.value.delete(slotId)
    translationAborts.value.delete(slotId)
    translationThinking.value.delete(slotId)
    translationProgress.value.delete(slotId)
  }
}

async function runComparison() {
  if (!canRun.value) return
  isRunning.value = true
  viewMode.value = 'grid'
  const runId = comparisonStore.createRun(prompt.value.trim(), slots.value)

  const promises = slots.value.map(async (slot) => {
    try {
      const result = await startGeneration({
        model: slot.model,
        prompt: slot.promptOverride ?? prompt.value.trim(),
        system: slot.system || undefined,
        options: slot.options,
      })
      comparisonStore.updateExecution(runId, slot.slotId, {
        sessionId: result.sessionId,
        status: 'streaming',
      })

      const checkInterval = setInterval(() => {
        const session = sessionStore.sessionById(result.sessionId)
        if (session && (session.status === 'completed' || session.status === 'error')) {
          comparisonStore.updateExecution(runId, slot.slotId, {
            status: session.status,
            outputText: session.outputText,
            metrics: session.metrics,
          })
          clearInterval(checkInterval)
          comparisonStore.finalizeRun(runId)
        }
      }, 500)
    } catch {
      comparisonStore.updateExecution(runId, slot.slotId, {
        status: 'error',
      })
    }
  })

  await Promise.allSettled(promises)
  isRunning.value = false
  savedRuns.value = await comparisonStore.loadSavedRuns()
}

</script>

<template>
  <div class="space-y-6">
    <ComparisonSlotConfigurator v-model:slots="slots" />

    <!-- History section -->
    <div v-if="savedRuns.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-4">
      <button class="flex items-center gap-2 text-sm font-medium text-text-secondary" @click="showHistory = !showHistory">
        <ChevronDown class="h-4 w-4 transition-transform" :class="showHistory ? 'rotate-180' : ''" />
        {{ $t('comparison.history.title') }} ({{ savedRuns.length }})
      </button>
      <div v-if="showHistory" class="mt-3 space-y-2">
        <div v-for="run in savedRuns" :key="run.id" class="flex items-center gap-3 rounded-lg bg-surface p-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-text-primary truncate">{{ run.prompt || run.executions[0]?.effectivePrompt || '...' }}</p>
            <p class="text-[10px] text-text-muted">{{ formatRunDate(run.createdAt) }} &middot; {{ run.executions.map(e => e.model).join(', ') }}</p>
          </div>
          <StatusBadge :status="run.status" />
          <button class="text-xs text-accent hover:text-accent-hover" @click="loadRun(run)">{{ $t('comparison.history.load') }}</button>
          <button class="text-xs text-text-muted hover:text-error" @click="deleteRun(run.id)">{{ $t('common.actions.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Prompt section -->
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-3">
      <!-- Language Compare: per-slot prompt grid -->
      <template v-if="isLanguageMode">
        <div
          class="grid gap-3"
          :class="{
            'grid-cols-1': slots.length === 1,
            'grid-cols-2': slots.length === 2 || slots.length === 4,
            'grid-cols-3': slots.length === 3,
          }"
        >
          <div
            v-for="(slot, idx) in slots"
            :key="slot.slotId"
            class="rounded-lg border border-border-default bg-surface p-3 space-y-2"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="flex items-center justify-center h-5 w-5 rounded-full bg-surface-overlay text-[10px] font-bold text-text-secondary shrink-0">{{ idx + 1 }}</span>
              <select
                :value="slot.language"
                class="rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary"
                @change="updateSlotLanguage(idx, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="loc in AVAILABLE_LOCALES" :key="loc.code" :value="loc.code">
                  {{ loc.flag }} {{ loc.label }}
                </option>
              </select>
              <!-- Translate button: mismatch with a supported language -->
              <button
                v-if="slotHasMismatch(slot) && SUPPORTED_LANG_CODES.has(slot.detectedLanguage!) && !translatingSlots.has(slot.slotId)"
                class="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-surface hover:bg-accent-hover transition-colors"
                @click="translateSlot(idx)"
              >
                {{ $t('comparison.language.translateTo', { language: LANGUAGE_NAMES[slot.language!] ?? slot.language }) }}
              </button>
              <!-- Cancel button: translation in progress -->
              <button
                v-else-if="translatingSlots.has(slot.slotId)"
                class="rounded-md border border-error px-2.5 py-1 text-[11px] font-medium text-error hover:bg-error/10 transition-colors"
                @click="cancelTranslation(slot.slotId)"
              >
                {{ $t('common.actions.cancel') }}
              </button>
              <!-- Unsupported language detected -->
              <span
                v-else-if="slotDetectedUnsupported(slot)"
                class="text-[10px] text-warning"
              >
                {{ $t('comparison.language.unsupported') }}
              </span>
              <!-- Successfully translated -->
              <span v-else-if="slot.wasTranslated" class="text-[10px] text-success">
                {{ $t('comparison.language.translated') }}
              </span>
            </div>

            <!-- Translation status: thinking, progress, or waiting -->
            <div v-if="translatingSlots.has(slot.slotId)" class="space-y-2">
              <!-- Thinking display -->
              <div
                v-if="translationThinking.get(slot.slotId)"
                class="rounded-md bg-surface px-2.5 py-2 text-xs text-text-muted italic border border-warning/30 max-h-24 overflow-y-auto"
              >
                <span class="text-[10px] text-warning font-medium not-italic">Thinking...</span>
                <p class="mt-1 whitespace-pre-wrap">{{ translationThinking.get(slot.slotId) }}</p>
              </div>

              <!-- Translation progress -->
              <div
                v-if="translationProgress.get(slot.slotId)"
                class="rounded-md bg-surface px-2.5 py-2 text-xs text-text-secondary border border-accent/20 max-h-24 overflow-y-auto"
                :dir="['ar', 'he', 'fa', 'ur'].includes(slot.language ?? '') ? 'rtl' : 'ltr'"
              >
                {{ translationProgress.get(slot.slotId) }}
              </div>

              <!-- Waiting indicator (no output yet) -->
              <div
                v-if="!translationThinking.get(slot.slotId) && !translationProgress.get(slot.slotId)"
                class="flex items-center gap-2 rounded-md bg-surface px-2.5 py-3 text-xs text-text-muted border border-border-default/50"
              >
                <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                {{ $t('comparison.language.translating') }}
              </div>
            </div>

            <textarea
              v-show="!translatingSlots.has(slot.slotId)"
              :value="slot.promptOverride ?? ''"
              rows="4"
              class="w-full rounded-md border border-border-default bg-surface-raised px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
              :dir="slotTextDirection(slot)"
              :disabled="isRunning"
              :placeholder="$t('comparison.language.promptPlaceholder', { lang: LANGUAGE_NAMES[slot.language ?? ''] ?? '' })"
              @input="updateSlotPrompt(idx, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
        <p class="text-[10px] text-text-muted italic">
          {{ $t('comparison.language.qualityWarning') }}
        </p>
      </template>

      <!-- Standard presets: shared prompt -->
      <template v-else>
        <textarea
          v-model="prompt"
          class="w-full rounded-lg border border-border-default bg-surface px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
          :disabled="isRunning"
          rows="3"
          :placeholder="$t('comparison.prompt.placeholder')"
        />
      </template>

      <div class="flex items-center justify-between">
        <span class="text-xs text-text-muted">
          {{ $t('comparison.configurator.slotsConfigured', { count: slots.length }) }}
        </span>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="!canRun"
          @click="runComparison"
        >
          {{ isRunning ? $t('comparison.prompt.running') : $t('comparison.prompt.compare') }}
        </button>
      </div>
    </div>

    <div v-if="activeRun" class="space-y-4">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-medium text-text-secondary">{{ $t('comparison.results.title') }}</h3>
        <StatusBadge :status="activeRun.status" />
        <div v-if="hasCompletedResults" class="ms-auto flex items-center gap-2">
          <div class="flex gap-1 rounded-lg border border-border-default p-0.5">
            <button
              class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
              :class="viewMode === 'grid' ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-secondary'"
              @click="viewMode = 'grid'"
            >
              {{ $t('comparison.results.grid') }}
            </button>
            <button
              class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
              :class="viewMode === 'diff' ? 'bg-surface-overlay text-text-primary' : 'text-text-muted hover:text-text-secondary'"
              @click="viewMode = 'diff'"
            >
              {{ $t('comparison.results.diff') }}
            </button>
          </div>

          <!-- Export & Share -->
          <div class="relative">
            <button
              class="flex items-center gap-1 rounded-lg border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              @click="showExportMenu = !showExportMenu"
            >
              <Download class="h-3.5 w-3.5" />
              {{ $t('comparison.export.title') }}
            </button>
            <div v-if="showExportMenu" class="fixed inset-0 z-10" @click="showExportMenu = false" />
            <div
              v-if="showExportMenu"
              class="absolute end-0 top-full z-20 mt-1 w-48 rounded-lg border border-border-default bg-surface-raised shadow-lg py-1"
            >
              <button class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay" @click="handleExportJson">
                {{ $t('comparison.export.json') }}
              </button>
              <button class="w-full px-3 py-2 text-start text-xs text-text-secondary hover:bg-surface-overlay" @click="handleExportMarkdown">
                {{ $t('comparison.export.markdown') }}
              </button>
              <div class="border-t border-border-default my-1" />
              <button class="w-full px-3 py-2 text-start text-xs text-accent hover:bg-surface-overlay flex items-center gap-2" @click="handleShare">
                <Share2 class="h-3 w-3" />
                {{ $t('comparison.share.toDiscussions') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ComparisonGrid
        v-if="viewMode === 'grid'"
        :executions="activeRun.executions"
        :slots="activeRun.slots"
        :prompt="activeRun.prompt"
      />
      <ComparisonDiffView
        v-else
        :executions="activeRun.executions"
      />

      <ComparisonMetricsBar
        v-if="hasCompletedResults"
        :executions="activeRun.executions"
      />
    </div>

    <!-- Share dialog -->
    <ShareComparisonDialog
      v-if="showShareDialog && activeRun"
      :run="activeRun"
      @close="showShareDialog = false"
    />

  </div>
</template>
