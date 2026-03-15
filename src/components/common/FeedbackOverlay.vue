<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useModelStore } from '@/stores/model-store'
import { ollamaClient } from '@/services/ollama-client'
import {
  submitFeedback,
  collectMetadata,
  type FeedbackType,
} from '@/services/feedback-service'

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const modelStore = useModelStore()

const feedbackType = ref<FeedbackType | null>(null)
const message = ref('')
const email = ref('')
const submitting = ref(false)
const submitted = ref(false)

const types: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug', icon: '!' },
  { value: 'idea', label: 'Idea', icon: '?' },
  { value: 'question', label: 'Question', icon: 'Q' },
  { value: 'other', label: 'Other', icon: '...' },
]

async function handleSubmit() {
  if (!feedbackType.value || !message.value.trim()) return

  submitting.value = true
  try {
    let ollamaConnected = false
    try {
      const ver = await ollamaClient.version()
      ollamaConnected = !!ver
    } catch { /* offline */ }

    const metadata = collectMetadata(
      route.path,
      modelStore.modelNames[0] ?? '',
      ollamaConnected,
      modelStore.modelNames,
    )

    await submitFeedback({
      type: feedbackType.value,
      message: message.value.trim(),
      email: email.value.trim(),
      metadata,
    })

    submitted.value = true
    setTimeout(() => emit('close'), 1500)
  } catch (e) {
    console.error('Feedback submission failed:', e)
  } finally {
    submitting.value = false
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click="handleBackdropClick"
    >
      <!-- Modal -->
      <div class="w-full max-w-md rounded-xl border border-border-default bg-surface-raised p-5 shadow-2xl">
        <!-- Success state -->
        <div v-if="submitted" class="flex flex-col items-center gap-3 py-8">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg class="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p class="text-sm font-medium text-text-primary">Thank you for your feedback!</p>
          <p class="text-xs text-text-muted">Your input helps make LLMxRay better.</p>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-text-primary">Send Feedback</h3>
            <button
              class="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              @click="emit('close')"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Type selector -->
          <div class="mb-4">
            <p class="mb-2 text-xs text-text-muted">What kind of feedback?</p>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="t in types"
                :key="t.value"
                class="flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-xs transition-colors"
                :class="
                  feedbackType === t.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-default text-text-secondary hover:border-accent/50 hover:text-text-primary'
                "
                @click="feedbackType = t.value"
              >
                <span class="text-sm font-bold">{{ t.icon }}</span>
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <!-- Message -->
          <div class="mb-3">
            <textarea
              v-model="message"
              rows="4"
              class="w-full resize-none rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
              placeholder="Tell us what's on your mind..."
            />
          </div>

          <!-- Email (optional) -->
          <div class="mb-4">
            <label class="mb-1 block text-xs text-text-muted">Email <span class="text-text-muted/50">(optional — only if you'd like a response)</span></label>
            <input
              v-model="email"
              type="email"
              class="w-full rounded-lg border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
              placeholder="your@email.com"
            />
          </div>

          <!-- Submit -->
          <button
            :disabled="!feedbackType || !message.trim() || submitting"
            class="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
            @click="handleSubmit"
          >
            {{ submitting ? 'Sending...' : 'Send Feedback' }}
          </button>

          <p class="mt-2 text-center text-[9px] text-text-muted">
            Includes app context (page, model, system) to help us understand your feedback.
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>
