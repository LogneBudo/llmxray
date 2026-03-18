<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  MessageSquareText,
  ArrowLeftRight,
  Waypoints,
  BookOpen,
  Hammer,
  GraduationCap,
  Boxes,
  Timer,
  Monitor,
  Settings,
  MessageSquare,
} from 'lucide-vue-next'
import FeedbackOverlay from './FeedbackOverlay.vue'

const route = useRoute()
const { t } = useI18n()
const showFeedback = ref(false)

const navItems = computed<{ path: string; label: string; icon: Component }[]>(() => [
  { path: '/', label: t('common.nav.chatDiagnostics'), icon: MessageSquareText },
  { path: '/compare', label: t('common.nav.compare'), icon: ArrowLeftRight },
  { path: '/embeddings', label: t('common.nav.embeddings'), icon: Waypoints },
  { path: '/rag', label: t('common.nav.knowledgeBase'), icon: BookOpen },
  { path: '/tools', label: t('common.nav.toolWorkshop'), icon: Hammer },
  { path: '/training', label: t('common.nav.aiTraining'), icon: GraduationCap },
  { path: '/settings?tab=models', label: t('common.nav.models'), icon: Boxes },
  { path: '/benchmark', label: t('common.nav.benchmark'), icon: Timer },
  { path: '/system', label: t('common.nav.mySystem'), icon: Monitor },
  { path: '/settings', label: t('common.nav.settings'), icon: Settings },
])
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
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="mt-auto flex items-center border-t border-border-default px-3 py-[16px]">
      <div class="flex flex-1 items-center gap-1.5 rounded-lg bg-surface px-3 py-2.5">
        <span class="flex-1 text-xs text-text-muted truncate">{{ $t('common.nav.tagline') }}</span>
        <button
          class="shrink-0 rounded p-0.5 text-text-muted hover:text-accent transition-colors"
          :title="$t('feedback.title')"
          @click.stop="showFeedback = true"
        >
          <MessageSquare class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </aside>

  <FeedbackOverlay v-if="showFeedback" @close="showFeedback = false" />
</template>
