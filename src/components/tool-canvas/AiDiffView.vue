<script setup lang="ts">
import { computed } from 'vue'
import { diffLines } from 'diff'

const props = defineProps<{
  oldCode: string
  newCode: string
  explanation: string
}>()

defineEmits<{
  accept: []
  dismiss: []
}>()

const diff = computed(() => diffLines(props.oldCode, props.newCode))
</script>

<template>
  <div class="ai-diff">
    <!-- Explanation -->
    <div v-if="explanation" class="diff-explanation">
      {{ explanation }}
    </div>

    <!-- Diff view -->
    <div class="diff-code">
      <div
        v-for="(part, i) in diff"
        :key="i"
        class="diff-line"
        :class="{
          added: part.added,
          removed: part.removed,
        }"
      >{{ part.value }}</div>
    </div>

    <!-- Actions -->
    <div class="diff-actions">
      <button class="diff-accept" @click="$emit('accept')">Accept</button>
      <button class="diff-dismiss" @click="$emit('dismiss')">Dismiss</button>
    </div>
  </div>
</template>

<style scoped>
.ai-diff {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-explanation {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.diff-code {
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  padding: 6px 8px;
  max-height: 200px;
  overflow: auto;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-line {
  color: var(--color-text-primary);
}
.diff-line.added {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
}
.diff-line.removed {
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
  color: var(--color-error);
  text-decoration: line-through;
}

.diff-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.diff-accept {
  background: var(--color-success);
  color: var(--color-surface-base, #0f172a);
  border: none;
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.diff-accept:hover {
  opacity: 0.9;
}
.diff-dismiss {
  background: none;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-muted);
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 11px;
  cursor: pointer;
}
.diff-dismiss:hover {
  background: var(--color-surface-overlay);
}
</style>
