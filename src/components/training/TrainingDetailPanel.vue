<script setup lang="ts">
import { ref } from 'vue'
import type { AiTrainingPair } from '@/types/canvas-ai'
import { formatRelativeTime } from '@/utils/format'
import TrainingTagEditor from './TrainingTagEditor.vue'

const props = defineProps<{
  pair: AiTrainingPair
  allTags: string[]
}>()

const emit = defineEmits<{
  close: []
  'update:response': [id: string, response: string]
  'update:tags': [id: string, tags: string[]]
  'toggle-accepted': [id: string]
  delete: [id: string]
}>()

const editing = ref(false)
const editedResponse = ref('')
const confirmDelete = ref(false)

function startEdit() {
  editedResponse.value = props.pair.response
  editing.value = true
}

function saveEdit() {
  emit('update:response', props.pair.id, editedResponse.value)
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function handleDelete() {
  if (confirmDelete.value) {
    emit('delete', props.pair.id)
    confirmDelete.value = false
  } else {
    confirmDelete.value = true
    setTimeout(() => { confirmDelete.value = false }, 3000)
  }
}

const phaseColors: Record<string, string> = {
  draft: 'bg-blue-500/20 text-blue-400',
  insights: 'bg-amber-500/20 text-amber-400',
  automap: 'bg-emerald-500/20 text-emerald-400',
  fix: 'bg-rose-500/20 text-rose-400',
}
</script>

<template>
  <div class="rounded-lg border border-accent/30 bg-surface-raised p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-medium"
          :class="phaseColors[pair.phase]"
        >{{ pair.phase }}</span>
        <span class="text-xs text-text-secondary">{{ pair.toolName }}</span>
        <span class="text-[10px] text-text-muted">{{ pair.model }}</span>
        <span class="text-[10px] text-text-muted">{{ formatRelativeTime(pair.timestamp) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="rounded px-2 py-1 text-[10px] transition-colors"
          :class="pair.accepted ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
          @click="emit('toggle-accepted', pair.id)"
        >
          {{ pair.accepted ? 'Accepted' : 'Rejected' }}
        </button>
        <button
          class="text-text-muted hover:text-text-primary transition-colors text-xs"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- System Prompt -->
    <div>
      <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">System Prompt</p>
      <pre class="max-h-32 overflow-auto rounded-lg bg-surface p-3 text-xs text-text-secondary whitespace-pre-wrap font-mono">{{ pair.systemPrompt }}</pre>
    </div>

    <!-- User Prompt -->
    <div>
      <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">User Prompt</p>
      <pre class="max-h-32 overflow-auto rounded-lg bg-surface p-3 text-xs text-text-secondary whitespace-pre-wrap font-mono">{{ pair.userPrompt }}</pre>
    </div>

    <!-- AI Response -->
    <div>
      <div class="mb-1 flex items-center justify-between">
        <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted">AI Response</p>
        <button
          v-if="!editing"
          class="text-[10px] text-accent hover:underline"
          @click="startEdit"
        >
          Edit response
        </button>
      </div>
      <textarea
        v-if="editing"
        v-model="editedResponse"
        rows="8"
        class="w-full rounded-lg border border-accent bg-surface px-3 py-2 text-xs text-text-primary font-mono outline-none resize-y"
      />
      <pre
        v-else
        class="max-h-64 overflow-auto rounded-lg bg-surface p-3 text-xs text-text-secondary whitespace-pre-wrap font-mono"
      >{{ pair.response }}</pre>
      <div v-if="editing" class="mt-2 flex gap-2">
        <button
          class="rounded-lg bg-accent px-3 py-1 text-xs text-white hover:bg-accent-hover transition-colors"
          @click="saveEdit"
        >
          Save
        </button>
        <button
          class="rounded-lg px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          @click="cancelEdit"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Tags -->
    <div>
      <p class="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">Tags</p>
      <TrainingTagEditor
        :tags="pair.tags ?? []"
        :all-tags="allTags"
        @update:tags="emit('update:tags', pair.id, $event)"
      />
    </div>

    <!-- Footer actions -->
    <div class="flex items-center justify-end border-t border-border-default pt-3">
      <button
        class="rounded-lg px-3 py-1 text-xs transition-colors"
        :class="confirmDelete ? 'bg-error/10 text-error' : 'text-text-muted hover:text-error'"
        @click="handleDelete"
      >
        {{ confirmDelete ? 'Confirm delete?' : 'Delete pair' }}
      </button>
    </div>
  </div>
</template>
