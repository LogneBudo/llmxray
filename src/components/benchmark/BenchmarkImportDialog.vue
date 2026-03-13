<script setup lang="ts">
import { ref } from 'vue'
import { useBenchmarkStore } from '@/stores/benchmark-store'

const emit = defineEmits<{
  close: []
}>()

const benchmarkStore = useBenchmarkStore()

const fileContent = ref('')
const error = ref('')
const importing = ref(false)
const dragOver = ref(false)

function handleFile(file: File) {
  if (file.size > 1_000_000) {
    error.value = 'File too large (max 1MB)'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    fileContent.value = reader.result as string
    error.value = ''
  }
  reader.readAsText(file)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

async function doImport() {
  if (!fileContent.value) return
  importing.value = true
  error.value = ''

  const result = await benchmarkStore.importCustomSuite(fileContent.value)
  importing.value = false

  if (result.ok) {
    emit('close')
  } else {
    error.value = result.error ?? 'Import failed'
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="w-full max-w-lg rounded-lg border border-border-default bg-surface-raised p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary">Import Custom Benchmark Suite</h3>
        <button
          class="text-text-muted hover:text-text-primary transition-colors"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Drop zone -->
      <div
        class="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors"
        :class="dragOver ? 'border-accent bg-accent/5' : 'border-border-default'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <span class="mb-2 text-2xl text-text-muted">{ }</span>
        <span class="text-sm text-text-secondary">Drop .json file here</span>
        <span class="my-1 text-xs text-text-muted">or</span>
        <label class="cursor-pointer rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-text-primary transition-colors">
          Browse
          <input type="file" accept=".json" class="hidden" @change="onFileInput" />
        </label>
      </div>

      <!-- Preview -->
      <div v-if="fileContent" class="mb-4">
        <div class="rounded-md bg-surface p-3">
          <pre class="max-h-[200px] overflow-auto text-[10px] text-text-secondary">{{ fileContent.slice(0, 1000) }}{{ fileContent.length > 1000 ? '...' : '' }}</pre>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
        {{ error }}
      </div>

      <!-- Validation info -->
      <div class="mb-4 text-[10px] text-text-muted">
        <p>Requirements: JSON with name, questions array (2-500 items).</p>
        <p>Each question needs: id, question, choices (2-6), correctAnswer.</p>
        <p>Max 1MB. HTML tags will be stripped. IDs will be deduplicated.</p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button
          class="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          :disabled="!fileContent || importing"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          :class="
            fileContent && !importing
              ? 'bg-accent text-surface hover:bg-accent-hover'
              : 'bg-surface-overlay text-text-muted cursor-not-allowed'
          "
          @click="doImport"
        >
          {{ importing ? 'Importing...' : 'Import Suite' }}
        </button>
      </div>
    </div>
  </div>
</template>
