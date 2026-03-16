<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import FeedbackOverlay from './FeedbackOverlay.vue'

const route = useRoute()
const showFeedback = ref(false)

const navItems = [
  { path: '/', label: 'Chat Diagnostics', icon: '' },
  { path: '/compare', label: 'Compare', icon: '⇔' },
  { path: '/embeddings', label: 'Embeddings', icon: '◈' },
  { path: '/rag', label: 'Knowledge Base', icon: '📚' },
  { path: '/tools', label: 'Tool Workshop', icon: '⚒' },
  { path: '/training', label: 'AI Training', icon: '\u2697' },
  { path: '/settings?tab=models', label: 'Models', icon: '◎' },
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
          (item.path.includes('?')
            ? route.fullPath === item.path
            : route.path === item.path)
            ? 'bg-surface-overlay text-accent'
            : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
        "
      >
        <template v-if="item.icon">
          <span class="text-base">{{ item.icon }}</span>
        </template>
        <template v-else>
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 297.5 297.5">
            <path fill="currentColor" xmlns="http://www.w3.org/2000/svg" d="M179.293,23.839c-64.904,0-117.707,52.804-117.707,117.707c0,1.832,0.056,3.651,0.14,5.463H9.933  c-5.486,0-9.933,4.448-9.933,9.933v46.189c0,5.486,4.448,9.933,9.933,9.933h22.349v43.209h-6.953c-4.663,0-8.443,3.78-8.443,8.443  c0,4.663,3.78,8.443,8.443,8.443h30.793c4.663,0,8.443-3.78,8.443-8.443c0-4.663-3.78-8.443-8.443-8.443h-6.953v-43.209h36.713  c21.533,28.059,55.39,46.189,93.411,46.189c64.904,0,117.707-52.804,117.707-117.707S244.196,23.839,179.293,23.839z   M19.866,166.876h213.087c-5.257,11.091-13.854,20.295-24.483,26.323H19.866V166.876z M119.942,141.547  c0-32.726,26.624-59.35,59.35-59.35s59.35,26.624,59.35,59.35c0,1.843-0.096,3.663-0.261,5.463H120.206  C120.04,145.21,119.942,143.39,119.942,141.547z M179.293,239.388c-25.75,0-49.202-10.003-66.689-26.323h32.684  c10.31,4.925,21.837,7.698,34.005,7.698c43.68,0,79.217-35.536,79.217-79.217S222.973,62.33,179.293,62.33  s-79.217,35.536-79.217,79.217c0,1.839,0.086,3.657,0.214,5.463H81.611c-0.101-1.809-0.16-3.629-0.16-5.463  c0-48.871,36.016-89.488,82.901-96.702c-0.758,1.266-1.201,2.741-1.201,4.324c0,4.663,3.78,8.443,8.443,8.443h15.396  c4.663,0,8.443-3.78,8.443-8.443c0-1.583-0.443-3.058-1.201-4.324c46.884,7.214,82.901,47.83,82.901,96.702  C277.134,195.497,233.243,239.388,179.293,239.388z"/>
          </svg>
        </template>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="mt-auto flex items-center border-t border-border-default px-3 py-[16px]">
      <div class="flex flex-1 items-center gap-1.5 rounded-lg bg-surface px-3 py-2.5">
        <span class="flex-1 text-xs text-text-muted truncate">Local LLM Observatory</span>
        <button
          class="shrink-0 rounded p-0.5 text-text-muted hover:text-accent transition-colors"
          title="Send feedback"
          @click.stop="showFeedback = true"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <FeedbackOverlay v-if="showFeedback" @close="showFeedback = false" />
</template>
