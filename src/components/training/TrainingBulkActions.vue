<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  selectedCount: number
}>()

const emit = defineEmits<{
  export: []
  'mark-accepted': []
  'mark-rejected': []
  'add-tag': [tag: string]
  delete: []
  'deselect-all': []
}>()

const showTagInput = ref(false)
const tagInput = ref('')
const confirmDelete = ref(false)

function submitTag() {
  const tag = tagInput.value.trim().toLowerCase()
  if (tag) {
    emit('add-tag', tag)
    tagInput.value = ''
    showTagInput.value = false
  }
}

function handleDelete() {
  if (confirmDelete.value) {
    emit('delete')
    confirmDelete.value = false
  } else {
    confirmDelete.value = true
    setTimeout(() => { confirmDelete.value = false }, 3000)
  }
}
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border border-accent/30 bg-surface-raised px-4 py-2.5">
    <span class="text-xs font-medium text-accent">{{ selectedCount }} selected</span>

    <div class="ml-auto flex items-center gap-2">
      <button
        class="rounded-lg bg-surface-overlay px-3 py-1 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
        @click="emit('export')"
      >
        Export JSONL
      </button>

      <button
        class="rounded-lg bg-success/10 px-3 py-1 text-[10px] text-success hover:bg-success/20 transition-colors"
        @click="emit('mark-accepted')"
      >
        Mark Accepted
      </button>

      <button
        class="rounded-lg bg-error/10 px-3 py-1 text-[10px] text-error hover:bg-error/20 transition-colors"
        @click="emit('mark-rejected')"
      >
        Mark Rejected
      </button>

      <!-- Tag input -->
      <div v-if="showTagInput" class="flex items-center gap-1">
        <input
          v-model="tagInput"
          type="text"
          placeholder="Tag name..."
          class="w-24 rounded border border-accent bg-surface px-2 py-0.5 text-[10px] text-text-primary outline-none"
          @keydown.enter="submitTag"
          @keydown.escape="showTagInput = false"
        />
        <button
          class="text-[10px] text-accent hover:underline"
          @click="submitTag"
        >Add</button>
      </div>
      <button
        v-else
        class="rounded-lg bg-accent/10 px-3 py-1 text-[10px] text-accent hover:bg-accent/20 transition-colors"
        @click="showTagInput = true"
      >
        Add Tag
      </button>

      <button
        class="rounded-lg px-3 py-1 text-[10px] transition-colors"
        :class="confirmDelete ? 'bg-error/10 text-error' : 'text-text-muted hover:text-error'"
        @click="handleDelete"
      >
        {{ confirmDelete ? 'Confirm?' : 'Delete' }}
      </button>

      <button
        class="text-[10px] text-text-muted hover:text-text-primary transition-colors"
        @click="emit('deselect-all')"
      >
        Deselect
      </button>
    </div>
  </div>
</template>
