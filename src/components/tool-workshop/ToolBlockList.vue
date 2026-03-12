<script setup lang="ts">
import type { ToolActionBlock } from '@/types/tool-workshop'
import ToolBlockCard from './ToolBlockCard.vue'

const props = defineProps<{
  blocks: ToolActionBlock[]
}>()

const emit = defineEmits<{
  'update:blocks': [blocks: ToolActionBlock[]]
  remove: [id: string]
}>()

const sorted = computed(() => [...props.blocks].sort((a, b) => a.order - b.order))

function onUpdateBlock(updated: ToolActionBlock) {
  const newBlocks = props.blocks.map((b) => (b.id === updated.id ? updated : b))
  emit('update:blocks', newBlocks)
}

function moveBlock(id: string, direction: -1 | 1) {
  const list = [...props.blocks].sort((a, b) => a.order - b.order)
  const idx = list.findIndex((b) => b.id === id)
  if (idx < 0) return
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= list.length) return
  const temp = list[idx]!.order
  list[idx]!.order = list[targetIdx]!.order
  list[targetIdx]!.order = temp
  emit('update:blocks', list)
}

import { computed } from 'vue'
</script>

<template>
  <div v-if="sorted.length === 0" class="rounded-lg border border-dashed border-border-default p-6 text-center">
    <p class="text-xs text-text-muted">No action blocks yet</p>
    <p class="text-[10px] text-text-muted mt-1">Add blocks below to build your tool's logic visually</p>
  </div>

  <div v-else class="space-y-2">
    <div v-for="(block, idx) in sorted" :key="block.id" class="relative">
      <!-- Connection line -->
      <div v-if="idx > 0" class="flex justify-center -mt-1 -mb-1">
        <div class="h-3 w-px bg-border-default" />
      </div>
      <div class="flex gap-1.5">
        <!-- Reorder buttons -->
        <div class="flex flex-col justify-center gap-0.5 pt-3">
          <button
            :disabled="idx === 0"
            class="text-[10px] text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            @click="moveBlock(block.id, -1)"
          >
            ^
          </button>
          <button
            :disabled="idx === sorted.length - 1"
            class="text-[10px] text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
            @click="moveBlock(block.id, 1)"
          >
            v
          </button>
        </div>
        <!-- Block card -->
        <div class="flex-1">
          <ToolBlockCard
            :block="block"
            @update="onUpdateBlock"
            @remove="emit('remove', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
