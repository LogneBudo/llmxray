<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  value: unknown
  path: string
  selectedPaths: Set<string>
  depth?: number
}>()

const emit = defineEmits<{
  'toggle-path': [path: string]
}>()

const expanded = ref(props.depth === undefined || (props.depth ?? 0) < 2)
const depth = props.depth ?? 0

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function isLeaf(v: unknown): boolean {
  return !isObject(v) && !isArray(v)
}

function typeLabel(v: unknown): string {
  if (v === null) return 'null'
  if (isArray(v)) return `[${v.length}]`
  if (isObject(v)) return `{${Object.keys(v).length}}`
  return typeof v
}

function displayValue(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return v.length > 40 ? `"${v.slice(0, 40)}..."` : `"${v}"`
  return String(v)
}

function childPath(key: string | number): string {
  if (typeof key === 'number') {
    return props.path ? `${props.path}[${key}]` : `[${key}]`
  }
  return props.path ? `${props.path}.${key}` : key
}

function toggle() {
  expanded.value = !expanded.value
}

function selectPath() {
  emit('toggle-path', props.path)
}

function bubbleToggle(path: string) {
  emit('toggle-path', path)
}
</script>

<template>
  <div class="tree-node" :style="{ paddingLeft: depth > 0 ? '14px' : '0' }">
    <!-- Leaf node: clickable to select -->
    <div
      v-if="isLeaf(value)"
      class="tree-row leaf"
      :class="{ selected: selectedPaths.has(path) }"
      @click.stop="selectPath"
    >
      <span class="tree-key">{{ label }}</span>
      <span class="tree-type">{{ typeLabel(value) }}</span>
      <span class="tree-val">{{ displayValue(value) }}</span>
      <span v-if="selectedPaths.has(path)" class="tree-check">&#10003;</span>
    </div>

    <!-- Object node -->
    <template v-else-if="isObject(value)">
      <div class="tree-row branch" @click.stop="toggle">
        <span class="tree-arrow" :class="{ open: expanded }">&#9654;</span>
        <span class="tree-key">{{ label }}</span>
        <span class="tree-type">{{ typeLabel(value) }}</span>
      </div>
      <div v-if="expanded" class="tree-children">
        <JsonTreeNode
          v-for="key in Object.keys(value as Record<string, unknown>)"
          :key="key"
          :label="key"
          :value="(value as Record<string, unknown>)[key]"
          :path="childPath(key)"
          :selected-paths="selectedPaths"
          :depth="depth + 1"
          @toggle-path="bubbleToggle"
        />
      </div>
    </template>

    <!-- Array node -->
    <template v-else-if="isArray(value)">
      <div class="tree-row branch" @click.stop="toggle">
        <span class="tree-arrow" :class="{ open: expanded }">&#9654;</span>
        <span class="tree-key">{{ label }}</span>
        <span class="tree-type">{{ typeLabel(value) }}</span>
      </div>
      <div v-if="expanded" class="tree-children">
        <JsonTreeNode
          v-for="(item, i) in (value as unknown[])"
          :key="i"
          :label="`[${i}]`"
          :value="item"
          :path="childPath(i)"
          :selected-paths="selectedPaths"
          :depth="depth + 1"
          @toggle-path="bubbleToggle"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.tree-node {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 1.2;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.tree-row.leaf:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.tree-row.leaf.selected {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.tree-row.branch:hover {
  background: var(--color-surface-overlay);
}

.tree-arrow {
  font-size: 8px;
  color: var(--color-text-muted);
  transition: transform 0.15s;
  display: inline-block;
  width: 10px;
  text-align: center;
}
.tree-arrow.open {
  transform: rotate(90deg);
}

.tree-key {
  color: var(--color-accent);
  font-weight: 600;
}

.tree-type {
  color: var(--color-text-muted);
  font-size: 10px;
}

.tree-val {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.tree-check {
  color: var(--color-success);
  font-weight: 700;
  margin-left: auto;
}
</style>
