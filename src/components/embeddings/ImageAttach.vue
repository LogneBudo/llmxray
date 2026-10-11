<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, X } from 'lucide-vue-next'

/**
 * Pick one image to embed alongside text. Emits the base64 payload WITHOUT the
 * data-URL prefix, which is what Ollama's `/api/embed` object input takes; the
 * thumbnail re-adds the prefix for display only.
 */
const props = defineProps<{
  modelValue: string | undefined
  disabled?: boolean
  label: string
  removeLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const mime = ref('image/png')

function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  mime.value = file.type || 'image/png'
  const reader = new FileReader()
  reader.onload = () => {
    const url = typeof reader.result === 'string' ? reader.result : ''
    const comma = url.indexOf(',')
    emit('update:modelValue', comma === -1 ? undefined : url.slice(comma + 1))
  }
  reader.readAsDataURL(file)
}

function clear() {
  emit('update:modelValue', undefined)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="modelValue">
      <img
        :src="`data:${mime};base64,${modelValue}`"
        alt=""
        class="h-12 w-12 rounded border border-border-default object-cover"
      />
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-text-muted hover:text-error transition-colors"
        :disabled="disabled"
        @click="clear"
      >
        <X class="h-3.5 w-3.5" />
        {{ removeLabel }}
      </button>
    </template>
    <label
      v-else
      class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border-default px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
      :class="disabled ? 'pointer-events-none opacity-50' : ''"
    >
      <ImagePlus class="h-3.5 w-3.5" />
      {{ label }}
      <input ref="fileInput" type="file" accept="image/*" class="hidden" :disabled="disabled" @change="onPick" />
    </label>
  </div>
</template>
