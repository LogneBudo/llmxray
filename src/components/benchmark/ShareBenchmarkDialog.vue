<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import type { BenchmarkResult } from '@/types/benchmark'
import { buildBenchmarkMarkdown } from '@/utils/share-benchmark'

const props = defineProps<{ result: BenchmarkResult }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const commentary = ref('')
const pasteHint = ref(false)
const copied = ref(false)

const LETTERS = 'ABCDEFGHIJ'

function resolveAnswer(letter: string, choices?: string[]): string {
  if (!choices || !letter) return letter
  const idx = LETTERS.indexOf(letter.trim().toUpperCase())
  if (idx >= 0 && idx < choices.length) return choices[idx]!
  return letter
}

const fullMarkdown = computed(() => {
  const md = buildBenchmarkMarkdown(props.result)
  return commentary.value.trim() ? `${commentary.value.trim()}\n\n---\n\n${md}` : md
})

const accuracy = computed(() => (props.result.accuracy * 100).toFixed(1))

// Group questions by category for preview
const categorizedQuestions = computed(() => {
  const map = new Map<string, typeof props.result.questionResults>()
  for (const qr of props.result.questionResults) {
    const list = map.get(qr.category) ?? []
    list.push(qr)
    map.set(qr.category, list)
  }
  return map
})

async function openDiscussions() {
  try {
    await navigator.clipboard.writeText(fullMarkdown.value)
    pasteHint.value = true
  } catch { /* clipboard may fail */ }

  const title = `Benchmark: ${props.result.modelName} — ${accuracy.value}% on ${props.result.benchmarkIds.join(', ')}`
  const params = new URLSearchParams({ category: 'show-and-tell', title })
  window.open(`https://github.com/LogneBudo/llmxray/discussions/new?${params.toString()}`, '_blank')
}

async function copyMarkdown() {
  await navigator.clipboard.writeText(fullMarkdown.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click="handleBackdropClick"
    >
      <div class="w-full max-w-2xl rounded-xl border border-border-default bg-surface-raised p-5 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-text-primary">{{ t('comparison.share.dialogTitle') }}</h3>
          <button class="rounded p-1 text-text-muted hover:text-text-primary transition-colors" @click="emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Commentary -->
        <label class="mb-1 block text-xs text-text-muted">{{ t('comparison.share.commentaryLabel') }}</label>
        <textarea
          v-model="commentary"
          rows="2"
          class="mb-3 w-full resize-none rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
          :placeholder="t('comparison.share.commentaryPlaceholder')"
        />

        <!-- Structured preview -->
        <label class="mb-1 block text-xs text-text-muted">{{ t('comparison.share.preview') }}</label>
        <div class="mb-4 max-h-72 overflow-y-auto rounded-lg border border-border-default bg-surface">
          <!-- Summary header -->
          <div class="border-b border-border-default px-3 py-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-text-primary">{{ result.modelName }}</span>
              <span class="text-sm font-bold" :class="result.accuracy >= 0.5 ? 'text-success' : 'text-error'">{{ accuracy }}%</span>
            </div>
            <div class="text-[10px] text-text-muted">
              {{ result.totalQuestions }} questions · {{ result.benchmarkIds.join(', ') }} · {{ result.categories.length }} categories
            </div>
          </div>

          <!-- Per-category compact table -->
          <div v-for="[category, questions] in categorizedQuestions" :key="category" class="border-b border-border-default/50 last:border-0">
            <div class="px-3 py-1.5 bg-surface-overlay/30 text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
              {{ category }}
            </div>
            <div
              v-for="(qr, i) in questions"
              :key="qr.questionId"
              class="group relative flex items-center gap-2 px-3 py-1 text-xs hover:bg-surface-overlay/20 transition-colors"
            >
              <!-- Question number + icon -->
              <span class="w-5 text-end text-text-muted">{{ i + 1 }}</span>
              <span>{{ qr.correct ? '✅' : '❌' }}</span>

              <!-- Question (hover for full text) -->
              <span
                class="flex-1 text-text-secondary cursor-help underline decoration-dotted decoration-text-muted/30"
                :title="qr.questionText ?? qr.questionId"
              >
                Q{{ i + 1 }}
              </span>

              <!-- Expected answer (hover for full text) -->
              <span
                class="w-12 text-center text-success cursor-help underline decoration-dotted decoration-success/30 text-[11px] font-medium"
                :title="'Expected: ' + resolveAnswer(qr.expectedAnswer, qr.choices)"
              >
                {{ qr.expectedAnswer }}
              </span>

              <!-- Model answer (hover for full text) -->
              <span
                class="w-12 text-center cursor-help underline decoration-dotted text-[11px] font-medium"
                :class="qr.correct ? 'text-success decoration-success/30' : 'text-error decoration-error/30'"
                :title="'Model: ' + resolveAnswer(qr.modelAnswer, qr.choices)"
              >
                {{ qr.modelAnswer }}
              </span>

              <!-- Confidence -->
              <span class="w-10 text-end text-text-muted text-[10px]">
                {{ (qr.avgTokenConfidence * 100).toFixed(0) }}%
              </span>

              <!-- Latency -->
              <span class="w-12 text-end text-text-muted text-[10px]">
                {{ qr.latencyMs.toFixed(0) }}ms
              </span>
            </div>
          </div>
        </div>

        <!-- Info -->
        <p class="mb-3 text-[10px] text-text-muted italic">
          Hover over questions and answers to see full text. The clipboard will contain the complete detailed report.
        </p>

        <!-- Buttons -->
        <div class="flex items-center gap-2">
          <button
            class="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors"
            @click="openDiscussions"
          >
            {{ t('comparison.share.openGithub') }}
          </button>
          <button
            class="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            @click="copyMarkdown"
          >
            {{ copied ? t('comparison.share.copied') : t('comparison.share.copyMarkdown') }}
          </button>
          <button
            class="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            @click="emit('close')"
          >
            {{ t('common.actions.cancel') }}
          </button>
        </div>

        <!-- Paste hint -->
        <p v-if="pasteHint" class="mt-3 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-xs text-accent text-center">
          Report copied to clipboard — paste it in the Discussion body (Ctrl+V)
        </p>
        <p v-else class="mt-3 text-center text-[9px] text-text-muted">
          {{ t('comparison.share.note') }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
