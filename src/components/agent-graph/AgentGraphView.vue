<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentGraph } from '@/composables/useAgentGraph'
import AgentNodeComponent from './AgentNode.vue'
import AgentStateDiff from './AgentStateDiff.vue'

const props = defineProps<{
  sessionId: string
}>()

const sessionIdRef = computed(() => props.sessionId)
const { layoutNodes, layoutEdges, svgWidth, svgHeight } = useAgentGraph(sessionIdRef)

const selectedNodeId = ref<string | null>(null)

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return layoutNodes.value.find((n) => n.id === selectedNodeId.value) ?? null
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="layoutNodes.length > 0" class="flex gap-4">
      <!-- Graph -->
      <div class="flex-1 overflow-auto rounded-lg border border-border-default bg-surface">
        <svg
          :width="svgWidth"
          :height="svgHeight"
          class="min-w-full"
        >
          <!-- Edges -->
          <line
            v-for="edge in layoutEdges"
            :key="edge.id"
            :x1="edge.x1"
            :y1="edge.y1"
            :x2="edge.x2"
            :y2="edge.y2"
            stroke="#475569"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />

          <!-- Arrow marker -->
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
            </marker>
          </defs>

          <!-- Nodes -->
          <AgentNodeComponent
            v-for="node in layoutNodes"
            :key="node.id"
            :node="node"
            :selected="selectedNodeId === node.id"
            @select="selectedNodeId = $event"
          />
        </svg>
      </div>

      <!-- Detail panel -->
      <div class="w-72 shrink-0">
        <AgentStateDiff :node="selectedNode" />
        <div v-if="!selectedNode" class="rounded-lg border border-border-default bg-surface-raised p-4 text-center text-sm text-text-muted">
          Click a node to inspect its state.
        </div>
      </div>
    </div>

    <div v-else class="rounded-lg border border-border-default bg-surface-raised p-8 text-center text-sm text-text-muted">
      <p>No agent graph data for this session.</p>
      <p class="mt-1">Agent graph nodes are created during generation.</p>
    </div>
  </div>
</template>
