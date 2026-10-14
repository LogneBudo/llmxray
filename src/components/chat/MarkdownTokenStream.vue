<script setup lang="ts">
/**
 * A reply as it streams: rendered Markdown, with every token underlined in its
 * confidence colour. The exact-token view (one chip per token, hover for the
 * numbers) stays on the Session page; this is the reading view.
 */
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { useTokenConfidence } from '@/composables/useTokenConfidence'
import { renderMarkdown } from '@/composables/useMarkdown'
import { paintTokens, visibleTokens } from '@/services/markdown-token-paint'

const props = defineProps<{
  sessionId: string
  /** When true, the view settles immediately instead of waiting for the next paint tick. */
  completed?: boolean
}>()

const { tokens, getColor } = useTokenConfidence(toRef(props, 'sessionId'))

const painted = ref('')

/** Rendering and painting cost grows with the reply, so it runs at most every PAINT_MS while streaming. */
const PAINT_MS = 80
let timer: ReturnType<typeof setTimeout> | null = null
let dirty = false

function paint() {
  const shown = visibleTokens(tokens.value).map((t) => ({ text: t.text, color: getColor(t.confidence) }))
  const html = renderMarkdown(shown.map((t) => t.text).join(''))
  painted.value = paintTokens(html, shown)
  dirty = false
}

function schedule() {
  dirty = true
  if (props.completed) {
    if (timer) clearTimeout(timer)
    timer = null
    paint()
    return
  }
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    if (dirty) paint()
  }, PAINT_MS)
}

watch(() => tokens.value.length, schedule, { immediate: true })
watch(() => props.completed, (done) => done && schedule())

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const isEmpty = computed(() => painted.value === '')
</script>

<template>
  <div v-if="!isEmpty" class="markdown-prose markdown-prose--painted" v-html="painted" />
</template>
