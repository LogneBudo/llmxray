<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import { buildMarkdownReport } from '@/utils/share-comparison'
import { useMetricsStore } from '@/stores/metrics-store'
import type { ComparisonRun } from '@/types/comparison'

const props = defineProps<{ run: ComparisonRun }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const metricsStore = useMetricsStore()
const commentary = ref('')
const copied = ref(false)
const pasteHint = ref(false)

const markdownPreview = computed(() =>
  buildMarkdownReport(
    props.run,
    (sid) => metricsStore.getMetrics(sid),
    commentary.value || undefined,
  ),
)

async function openDiscussions() {
  // Copy full report to clipboard first
  try {
    await navigator.clipboard.writeText(markdownPreview.value)
    pasteHint.value = true
  } catch { /* clipboard may fail */ }

  // Open Discussions with title only (body too long for URL)
  const hasLanguages = props.run.executions.some(e => e.language)
  const models = [...new Set(props.run.executions.map(e => e.model))]
  let title: string
  if (hasLanguages) {
    const langs = props.run.executions.filter(e => e.language).map(e => e.language!.toUpperCase()).join(' vs ')
    title = `Language Compare: ${langs} — ${models[0]}`
  } else {
    title = `Model Comparison: ${models.join(' vs ')}`
  }
  const params = new URLSearchParams({ category: 'show-and-tell', title })
  window.open(`https://github.com/LogneBudo/llmxray/discussions/new?${params.toString()}`, '_blank')
}

async function copyMarkdown() {
  await navigator.clipboard.writeText(markdownPreview.value)
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
      <div class="w-full max-w-lg rounded-xl border border-border-default bg-surface-raised p-5 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-text-primary">{{ t('comparison.share.dialogTitle') }}</h3>
          <button
            class="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Commentary -->
        <label class="mb-1 block text-xs text-text-muted">{{ t('comparison.share.commentaryLabel') }}</label>
        <textarea
          v-model="commentary"
          rows="3"
          class="mb-3 w-full resize-none rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
          :placeholder="t('comparison.share.commentaryPlaceholder')"
        />

        <!-- Markdown preview -->
        <label class="mb-1 block text-xs text-text-muted">{{ t('comparison.share.preview') }}</label>
        <pre class="mb-4 max-h-56 overflow-y-auto rounded-lg border border-border-default bg-surface p-3 text-xs text-text-secondary whitespace-pre-wrap break-words">{{ markdownPreview }}</pre>

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
        <!-- Note -->
        <p v-else class="mt-3 text-center text-[9px] text-text-muted">
          {{ t('comparison.share.note') }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
