<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import { LANGUAGE_NAMES } from '@/utils/slot-labels'

defineProps<{
  detectedLanguage: string
  conflicts: { slotId: string; slotLabel: string; targetLanguage: string }[]
  prompt: string
}>()

const emit = defineEmits<{
  translate: [slotId: string]
  updateTarget: [slotId: string]
  translateAll: []
  cancel: []
}>()

const { t } = useI18n()

function langName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase()
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('cancel')
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
          <h3 class="text-sm font-semibold text-text-primary">
            {{ t('comparison.language.mismatchTitle') }}
          </h3>
          <button
            class="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Description -->
        <p class="mb-4 text-xs text-text-muted">
          {{ t('comparison.language.mismatchDescription', { detected: langName(detectedLanguage) }) }}
        </p>

        <!-- Conflict cards -->
        <div class="space-y-3 mb-4">
          <div
            v-for="conflict in conflicts"
            :key="conflict.slotId"
            class="rounded-lg border border-border-default bg-surface p-3"
          >
            <div class="mb-2 text-sm font-medium text-text-primary">
              {{ conflict.slotLabel }}
              <span class="text-text-muted font-normal">
                — {{ t('comparison.language.targetIs', { language: langName(conflict.targetLanguage) }) }}
              </span>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-surface hover:bg-accent-hover transition-colors"
                @click="emit('translate', conflict.slotId)"
              >
                {{ t('comparison.language.translateTo', { language: langName(conflict.targetLanguage) }) }}
              </button>
              <button
                class="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-overlay transition-colors"
                @click="emit('updateTarget', conflict.slotId)"
              >
                {{ t('comparison.language.keepDetected', { language: langName(detectedLanguage) }) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom actions -->
        <div class="flex items-center justify-between border-t border-border-default pt-3">
          <button
            class="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
            @click="emit('cancel')"
          >
            {{ t('comparison.language.cancel') }}
          </button>
          <button
            class="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-surface hover:bg-accent-hover transition-colors"
            @click="emit('translateAll')"
          >
            {{ t('comparison.language.translateAll') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
