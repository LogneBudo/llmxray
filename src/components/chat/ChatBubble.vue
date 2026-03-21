<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types/conversation'
import { useSessionStore } from '@/stores/session-store'
import { useReasoningStore } from '@/stores/reasoning-store'
import { useMetricsStore } from '@/stores/metrics-store'
import { useQualityStore } from '@/stores/quality-store'
import { renderMarkdown } from '@/composables/useMarkdown'
import InlineThinkingBlock from './InlineThinkingBlock.vue'
import AssistantTokenStream from './AssistantTokenStream.vue'
import AttachmentBubble from './AttachmentBubble.vue'
import QualityBadges from './QualityBadges.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const sessionStore = useSessionStore()
const reasoningStore = useReasoningStore()
const metricsStore = useMetricsStore()
const qualityStore = useQualityStore()

const qualityReport = computed(() => qualityStore.getReport(props.message.id))

const sessionMetrics = computed(() => {
  if (!props.message.sessionId) return null
  return metricsStore.getMetrics(props.message.sessionId)
})

const wasTruncated = computed(() => {
  if (!props.message.sessionId) return false
  const session = sessionStore.sessionById(props.message.sessionId)
  return session?.doneReason === 'length'
})

const thinkingState = computed(() => {
  if (!props.message.sessionId) return { isThinking: false, content: '' }
  return reasoningStore.getThinking(props.message.sessionId)
})

const isUser = computed(() => props.message.role === 'user')

// For completed (non-streaming) assistant messages, strip think tags for display
const displayContent = computed(() => {
  if (isUser.value) {
    // Strip prepended document context from display
    if (props.message.attachments?.length) {
      const separator = '\n\n---\n\n'
      const sepIndex = props.message.content.lastIndexOf(separator)
      if (sepIndex !== -1) return props.message.content.slice(sepIndex + separator.length)
    }
    return props.message.content
  }
  if (props.message.isStreaming) return '' // Token stream handles display
  return props.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
})

const renderedHtml = computed(() => {
  if (isUser.value || !displayContent.value) return ''
  return renderMarkdown(displayContent.value)
})

const formattedTime = computed(() => {
  const d = new Date(props.message.timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="flex w-full" :class="isUser ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5"
      :class="
        isUser
          ? 'bg-accent text-white rounded-br-md'
          : 'bg-surface-raised border border-border-default rounded-bl-md'
      "
    >
      <!-- User message -->
      <template v-if="isUser">
        <AttachmentBubble v-if="message.attachments?.length" :attachments="message.attachments" />
        <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ displayContent }}</p>
      </template>

      <!-- Assistant message -->
      <template v-else>
        <!-- Inline thinking indicator -->
        <InlineThinkingBlock
          v-if="message.sessionId"
          :is-thinking="thinkingState.isThinking"
          :content="thinkingState.content"
          :completed="!message.isStreaming"
        />

        <!-- Streaming: show token stream -->
        <AssistantTokenStream
          v-if="message.isStreaming && message.sessionId"
          :session-id="message.sessionId"
        />

        <!-- Completed: show rendered markdown -->
        <div
          v-else-if="displayContent"
          class="markdown-prose"
          v-html="renderedHtml"
        />

        <!-- Streaming cursor when no tokens yet -->
        <span v-if="message.isStreaming && !displayContent" class="inline-flex items-center gap-1 py-1">
          <span class="h-1.5 w-1.5 rounded-full bg-accent" style="animation: typing-bounce 1.2s ease-in-out infinite" />
          <span class="h-1.5 w-1.5 rounded-full bg-accent" style="animation: typing-bounce 1.2s ease-in-out 0.2s infinite" />
          <span class="h-1.5 w-1.5 rounded-full bg-accent" style="animation: typing-bounce 1.2s ease-in-out 0.4s infinite" />
        </span>

        <!-- Truncation warning (fallback when quality analysis hasn't run yet) -->
        <div v-if="wasTruncated && !message.isStreaming && !qualityReport" class="mt-1 text-[10px] text-warning">
          {{ $t('dashboard.bubble.truncatedWarning') }}
        </div>
      </template>

      <!-- Inline response metrics -->
      <div
        v-if="!isUser && !message.isStreaming && sessionMetrics"
        class="mt-1.5 flex items-center gap-2 text-[10px] text-text-muted"
      >
        <span>{{ sessionMetrics.completionTokenCount }} {{ $t('dashboard.bubble.tokens') }}</span>
        <span class="opacity-40">·</span>
        <span>{{ sessionMetrics.tokensPerSecond.toFixed(1) }} {{ $t('dashboard.bubble.tokPerSec') }}</span>
        <span class="opacity-40">·</span>
        <span>{{ sessionMetrics.ttftMs < 1000 ? sessionMetrics.ttftMs.toFixed(0) + 'ms' : (sessionMetrics.ttftMs / 1000).toFixed(1) + 's' }} {{ $t('dashboard.bubble.ttft') }}</span>
        <span
          v-if="qualityReport && qualityReport.overall !== 'pass'"
          class="ml-1 inline-block h-1.5 w-1.5 rounded-full"
          :class="qualityReport.overall === 'fail' ? 'bg-error' : 'bg-warning'"
          :title="$t('quality.issuesDetected')"
        />
      </div>

      <!-- Quality badges -->
      <QualityBadges :report="qualityReport" />

      <div class="mt-1" :class="isUser ? 'text-end' : ''">
        <span class="text-[10px] opacity-50">{{ formattedTime }}</span>
      </div>
    </div>
  </div>
</template>
