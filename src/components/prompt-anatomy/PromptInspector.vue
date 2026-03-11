<script setup lang="ts">
import { computed } from 'vue'
import { usePromptStore } from '@/stores/prompt-store'
import PromptSectionComponent from './PromptSection.vue'
import PromptTokenCount from './PromptTokenCount.vue'

const props = defineProps<{
  sessionId: string
}>()

const promptStore = usePromptStore()

const anatomy = computed(() => promptStore.getAnatomy(props.sessionId))
const sections = computed(() => promptStore.getSections(props.sessionId))
</script>

<template>
  <div v-if="anatomy" class="space-y-4">
    <PromptTokenCount
      :sections="sections"
      :total-tokens="anatomy.totalTokenCount"
    />

    <div class="space-y-3">
      <PromptSectionComponent
        v-for="section in sections"
        :key="section.id"
        :section="section"
        :total-tokens="anatomy.totalTokenCount"
      />
    </div>

    <!-- Message breakdown (chat mode) -->
    <div v-if="anatomy.messages && anatomy.messages.length > 0" class="rounded-lg border border-border-default bg-surface-raised p-4">
      <h4 class="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Message Breakdown</h4>
      <div class="space-y-2">
        <div
          v-for="(msg, i) in anatomy.messages"
          :key="i"
          class="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
        >
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-muted">{{ msg.role }}</span>
            <span class="text-text-secondary truncate max-w-md">{{ msg.content.slice(0, 80) }}{{ msg.content.length > 80 ? '...' : '' }}</span>
          </div>
          <span class="text-xs text-text-muted">~{{ msg.tokenCount }} tok</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
    No prompt anatomy data available.
  </div>
</template>
