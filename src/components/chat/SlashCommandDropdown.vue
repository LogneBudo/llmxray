<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getMatchingCommands, getCommandsByCategory } from '@/services/slash-command-registry'
import type { SlashCommand } from '@/types/slash-command'

const { t } = useI18n()

const props = defineProps<{
  filter: string
  visible: boolean
}>()

const emit = defineEmits<{
  select: [command: SlashCommand]
  close: []
}>()

const selectedIndex = ref(0)

const matches = computed(() => {
  if (!props.visible) return []
  const prefix = props.filter.replace(/^\//, '')
  return prefix ? getMatchingCommands(prefix) : Object.values(getCommandsByCategory()).flat()
})

watch(
  () => props.filter,
  () => {
    selectedIndex.value = 0
  },
)

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible || matches.value.length === 0) return false

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % matches.value.length
    return true
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value =
      selectedIndex.value <= 0 ? matches.value.length - 1 : selectedIndex.value - 1
    return true
  }
  if (e.key === 'Tab' || (e.key === 'Enter' && matches.value.length > 0)) {
    e.preventDefault()
    emit('select', matches.value[selectedIndex.value]!)
    return true
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return true
  }
  return false
}

defineExpose({ handleKeydown })

const categoryLabel = computed<Record<string, string>>(() => ({
  chat: t('dashboard.slashCommands.chatConversation'),
  settings: t('dashboard.slashCommands.modelSettings'),
  navigation: t('dashboard.slashCommands.featuresNavigation'),
}))
</script>

<template>
  <div
    v-if="visible && matches.length > 0"
    class="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl border border-border-default bg-surface-raised shadow-lg"
  >
    <div class="p-1.5">
      <button
        v-for="(cmd, i) in matches"
        :key="cmd.name"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors"
        :class="i === selectedIndex ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-surface-overlay'"
        @mouseenter="selectedIndex = i"
        @click="$emit('select', cmd)"
      >
        <span class="shrink-0 font-mono text-xs text-accent">/{{ cmd.name }}</span>
        <span class="truncate text-xs text-text-muted">{{ cmd.description }}</span>
        <span class="ml-auto shrink-0 rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-muted">
          {{ categoryLabel[cmd.category] ?? cmd.category }}
        </span>
      </button>
    </div>
  </div>
</template>
