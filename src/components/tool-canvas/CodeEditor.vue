<script setup lang="ts">
import { computed } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const props = withDefaults(
  defineProps<{
    modelValue: string
    language?: 'typescript' | 'json'
    readonly?: boolean
    placeholder?: string
    minHeight?: string
  }>(),
  {
    language: 'typescript',
    readonly: false,
    placeholder: '',
    minHeight: '100px',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const extensions = computed(() => {
  const exts = [
    props.language === 'json'
      ? json()
      : javascript({ typescript: true }),
    oneDark,
    EditorView.theme({
      '&': {
        backgroundColor: 'var(--color-surface-base, #0f172a)',
        minHeight: props.minHeight,
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-surface-base, #0f172a)',
        borderRight: '1px solid var(--color-border-default)',
        color: 'var(--color-text-muted)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
      },
      '.cm-activeLine': {
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--color-accent)',
      },
      '.cm-selectionBackground': {
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent) !important',
      },
      '.cm-content': {
        caretColor: 'var(--color-accent)',
      },
    }),
    EditorView.lineWrapping,
  ]
  if (props.readonly) {
    exts.push(EditorView.editable.of(false))
  }
  return exts
})

function handleChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <Codemirror
    :model-value="modelValue"
    :extensions="extensions"
    :placeholder="placeholder"
    :style="{ minHeight, fontSize: '12px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border-default)' }"
    @update:model-value="handleChange"
  />
</template>
