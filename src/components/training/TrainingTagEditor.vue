<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

defineProps<{
  tags: string[]
  allTags: string[]
}>()

const emit = defineEmits<{
  'update:tags': [tags: string[]]
}>()

const input = ref('')

function handleKeydown(e: KeyboardEvent, currentTags: string[]) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const tag = input.value.trim().toLowerCase()
    if (tag && !currentTags.includes(tag)) {
      emit('update:tags', [...currentTags, tag])
    }
    input.value = ''
  }
}

function removeTag(currentTags: string[], tag: string) {
  emit('update:tags', currentTags.filter((t) => t !== tag))
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-for="tag in tags"
      :key="tag"
      class="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
    >
      {{ tag }}
      <button
        class="text-accent/60 hover:text-accent transition-colors"
        @click="removeTag(tags, tag)"
      >
        <X class="h-2.5 w-2.5" :stroke-width="3" />
      </button>
    </span>
    <input
      v-model="input"
      type="text"
      :placeholder="$t('training.tags.addPlaceholder')"
      class="w-20 bg-transparent text-[10px] text-text-primary placeholder-text-muted outline-none"
      @keydown="handleKeydown($event, tags)"
    />
  </div>
</template>
