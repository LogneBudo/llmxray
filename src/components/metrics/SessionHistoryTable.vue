<script setup lang="ts">
import { useSessionStore } from '@/stores/session-store'
import { formatDuration, formatTps, formatRelativeTime } from '@/utils/format'
import StatusBadge from '@/components/common/StatusBadge.vue'

const sessionStore = useSessionStore()
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised">
    <div class="px-4 py-3 border-b border-border-default">
      <h3 class="text-sm font-medium text-text-secondary">Recent Sessions</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border-default text-left text-xs text-text-muted uppercase tracking-wide">
            <th class="px-4 py-2">Model</th>
            <th class="px-4 py-2">Status</th>
            <th class="px-4 py-2">Tokens</th>
            <th class="px-4 py-2">Speed</th>
            <th class="px-4 py-2">Duration</th>
            <th class="px-4 py-2">When</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="session in sessionStore.recentSessions.slice(0, 20)"
            :key="session.id"
            class="border-b border-border-default last:border-0 hover:bg-surface-overlay cursor-pointer transition-colors"
            @click="$router.push({ name: 'session', params: { id: session.id } })"
          >
            <td class="px-4 py-2 font-medium text-text-primary">{{ session.model }}</td>
            <td class="px-4 py-2"><StatusBadge :status="session.status" :detail="session.error" /></td>
            <td class="px-4 py-2 text-text-secondary">
              {{ session.metrics ? session.metrics.totalTokenCount : '—' }}
            </td>
            <td class="px-4 py-2 text-text-secondary">
              {{ session.metrics ? formatTps(session.metrics.tokensPerSecond) : '—' }}
            </td>
            <td class="px-4 py-2 text-text-secondary">
              {{ session.metrics ? formatDuration(session.metrics.totalDurationMs) : '—' }}
            </td>
            <td class="px-4 py-2 text-text-muted">{{ formatRelativeTime(session.createdAt) }}</td>
          </tr>
          <tr v-if="sessionStore.recentSessions.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-text-muted">No sessions yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
