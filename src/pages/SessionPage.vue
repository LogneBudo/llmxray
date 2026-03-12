<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session-store'
import { useMetricsStore } from '@/stores/metrics-store'
import type { ToolCallEntry } from '@/types/toolcall'
import TabBar from '@/components/common/TabBar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import TokenStreamDisplay from '@/components/token-stream/TokenStreamDisplay.vue'
import MetricsDashboard from '@/components/metrics/MetricsDashboard.vue'
import ReasoningViewer from '@/components/reasoning/ReasoningViewer.vue'
import IntrospectionPanel from '@/components/introspection/IntrospectionPanel.vue'
import ToolCallTimeline from '@/components/tool-calls/ToolCallTimeline.vue'
import AgentGraphView from '@/components/agent-graph/AgentGraphView.vue'
import PromptInspector from '@/components/prompt-anatomy/PromptInspector.vue'
import ResponseOptimizerDrawer from '@/components/tool-optimizer/ResponseOptimizerDrawer.vue'

const props = defineProps<{ id: string }>()

const sessionStore = useSessionStore()
const metricsStore = useMetricsStore()

const activeTab = ref('stream')

const tabs = [
  { key: 'stream', label: 'Stream' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'introspection', label: 'Introspection' },
  { key: 'tools', label: 'Tools' },
  { key: 'agent', label: 'Agent Graph' },
  { key: 'prompt', label: 'Prompt' },
]

const session = computed(() => sessionStore.sessionById(props.id) ?? null)
const metrics = computed(() => metricsStore.getMetrics(props.id))

const optimizerEntry = ref<ToolCallEntry | null>(null)

onMounted(() => {
  sessionStore.setActiveSession(props.id)
})
</script>

<template>
  <div v-if="session" class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">{{ session.model }}</h2>
        <StatusBadge :status="session.status" />
      </div>
      <div class="text-xs text-text-muted">Session {{ session.id.slice(0, 8) }}</div>
    </div>

    <TabBar :tabs="tabs" :active-tab="activeTab" @update:active-tab="activeTab = $event" />

    <div class="mt-4">
      <template v-if="activeTab === 'stream'">
        <div class="space-y-4">
          <TokenStreamDisplay :session-id="id" />
          <MetricsDashboard :metrics="metrics" />
        </div>
      </template>

      <template v-else-if="activeTab === 'reasoning'">
        <ReasoningViewer :session-id="id" />
      </template>

      <template v-else-if="activeTab === 'introspection'">
        <IntrospectionPanel :session-id="id" :model-name="session.model" />
      </template>

      <template v-else-if="activeTab === 'tools'">
        <ToolCallTimeline :session-id="id" @optimize="optimizerEntry = $event" />
      </template>

      <template v-else-if="activeTab === 'agent'">
        <AgentGraphView :session-id="id" />
      </template>

      <template v-else-if="activeTab === 'prompt'">
        <PromptInspector :session-id="id" />
      </template>
    </div>
  </div>

  <div v-else class="flex items-center justify-center py-20 text-text-muted">
    Session not found.
  </div>

  <ResponseOptimizerDrawer
    v-if="optimizerEntry"
    :entry="optimizerEntry"
    @close="optimizerEntry = null"
  />
</template>
