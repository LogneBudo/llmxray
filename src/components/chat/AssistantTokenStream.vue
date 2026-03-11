<script setup lang="ts">
import { computed } from 'vue'
import { useTokenStore } from '@/stores/token-store'
import { useTokenConfidence } from '@/composables/useTokenConfidence'
import type { StreamToken } from '@/types/token'

const props = defineProps<{
  sessionId: string
}>()

const tokenStore = useTokenStore()
const { getColor } = useTokenConfidence()

const tokens = computed<StreamToken[]>(() => tokenStore.getTokens(props.sessionId))

// Filter out <think>...</think> content for display
const visibleTokens = computed(() => {
  const all = tokens.value
  const result: StreamToken[] = []
  let inThink = false
  let fullText = ''

  for (const token of all) {
    fullText += token.text
    if (!inThink && fullText.includes('<think>')) {
      inThink = true
      // Include text before <think> if any
      const before = fullText.split('<think>')[0] ?? ''
      if (before && result.length === 0) {
        result.push({ ...token, text: before })
      }
      continue
    }
    if (inThink) {
      if (fullText.includes('</think>')) {
        inThink = false
        // Get text after </think>
        const afterClose = fullText.split('</think>').pop() ?? ''
        // Only include the portion of this token that comes after </think>
        const tokenAfter = token.text
        if (afterClose.endsWith(tokenAfter) && tokenAfter.includes('</think>')) {
          const cleaned = tokenAfter.split('</think>').pop() ?? ''
          if (cleaned) result.push({ ...token, text: cleaned })
        }
      }
      continue
    }
    result.push(token)
  }
  return result
})
</script>

<template>
  <div class="text-sm leading-relaxed text-text-primary">
    <span
      v-for="token in visibleTokens"
      :key="token.id"
      class="inline"
      :style="{ borderBottom: `2px solid ${getColor(token.confidence)}` }"
    >{{ token.text }}</span>
  </div>
</template>
