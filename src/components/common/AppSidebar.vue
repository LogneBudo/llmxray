<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/compare', label: 'Compare', icon: '⇔' },
  { path: '/embeddings', label: 'Embeddings', icon: '◈' },
  { path: '/rag', label: 'Knowledge Base', icon: '📚' },
  { path: '/tools', label: 'Tool Workshop', icon: '⚒' },
  { path: '/models', label: 'Models', icon: '◎' },
  { path: '/benchmark', label: 'Benchmark', icon: '⏱' },
  { path: '/system', label: 'My System', icon: '🖥' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]
</script>

<template>
  <aside class="flex w-56 flex-col border-r border-border-default bg-surface-raised">
    <div class="flex h-14 items-center gap-2 border-b border-border-default px-4">
      <span class="text-xl font-bold text-accent">xR</span>
      <span class="text-sm font-medium text-text-secondary">LLMxRay</span>
    </div>
    <nav class="flex-1 space-y-1 p-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
        :class="
          route.path === item.path
            ? 'bg-surface-overlay text-accent'
            : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
        "
      >
        <span class="text-base">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="mt-auto flex items-center border-t border-border-default px-3 py-[17px]">
      <div class="rounded-lg bg-surface px-3 py-2.5 text-xs text-text-muted">
        Local LLM Observatory
      </div>
    </div>
  </aside>
</template>
