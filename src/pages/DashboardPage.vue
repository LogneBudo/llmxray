<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMetricsStore } from '@/stores/metrics-store'
import { useConversationStore } from '@/stores/conversation-store'
import { formatDuration, formatTps, formatNumber } from '@/utils/format'
import ChatConversation from '@/components/chat/ChatConversation.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'
import SessionHistoryTable from '@/components/metrics/SessionHistoryTable.vue'

const metricsStore = useMetricsStore()
const conversationStore = useConversationStore()

const showMetrics = ref(false)

const aggregate = computed(() => metricsStore.aggregate)
const hasMetrics = computed(() => aggregate.value.totalSessions > 0)

const recentConversations = computed(() => conversationStore.recentConversations)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Chat takes most of the space -->
    <div class="flex-1 min-h-0">
      <ChatConversation />
    </div>

    <!-- Collapsible metrics + history panel -->
    <div v-if="hasMetrics" class="border-t border-border-default">
      <button
        class="flex w-full items-center justify-between px-4 py-2 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
        @click="showMetrics = !showMetrics"
      >
        <span>
          {{ aggregate.totalSessions }} sessions · Avg {{ formatTps(aggregate.avgTps) }}
        </span>
        <span class="transition-transform" :class="{ 'rotate-180': showMetrics }">▾</span>
      </button>

      <div v-if="showMetrics" class="max-h-80 overflow-auto px-4 pb-4 space-y-4">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Total Sessions" :value="aggregate.totalSessions" />
          <MetricCard label="Avg TTFT" :value="formatDuration(aggregate.avgTtftMs)" />
          <MetricCard label="Avg Speed" :value="formatTps(aggregate.avgTps)" />
          <MetricCard label="Total Tokens" :value="formatNumber(aggregate.totalTokensGenerated)" unit="tok" />
        </div>
        <SessionHistoryTable />
      </div>
    </div>

    <!-- Conversation sidebar (recent chats) -->
    <div
      v-if="recentConversations.length > 1"
      class="border-t border-border-default px-4 py-2"
    >
      <p class="text-[10px] uppercase tracking-wider text-text-muted mb-1">Recent Chats</p>
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="conv in recentConversations.slice(0, 5)"
          :key="conv.id"
          class="shrink-0 rounded-lg px-3 py-1.5 text-xs transition-colors"
          :class="
            conversationStore.activeConversationId === conv.id
              ? 'bg-accent/10 text-accent'
              : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
          "
          @click="conversationStore.setActiveConversation(conv.id)"
        >
          {{ conv.name }}
        </button>
      </div>
    </div>
  </div>
</template>
