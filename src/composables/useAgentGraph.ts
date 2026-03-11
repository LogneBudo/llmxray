import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { useAgentStore } from '@/stores/agent-store'
import type { AgentNode, AgentEdge } from '@/types/agent'

interface LayoutNode extends AgentNode {
  x: number
  y: number
}

interface LayoutEdge extends AgentEdge {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function useAgentGraph(sessionId: Ref<string>) {
  const agentStore = useAgentStore()

  const graph = computed(() => agentStore.getGraph(sessionId.value))

  const svgWidth = ref(800)
  const svgHeight = ref(400)

  const layoutNodes = computed<LayoutNode[]>(() => {
    const nodes = graph.value?.nodes ?? []
    if (nodes.length === 0) return []

    const nodeWidth = 180
    const nodeHeight = 60
    const horizontalGap = 60
    const verticalCenter = svgHeight.value / 2

    // Simple left-to-right layout
    const totalWidth = nodes.length * (nodeWidth + horizontalGap)
    svgWidth.value = Math.max(800, totalWidth + 100)

    return nodes.map((node, i) => ({
      ...node,
      x: 50 + i * (nodeWidth + horizontalGap),
      y: verticalCenter - nodeHeight / 2,
    }))
  })

  const layoutEdges = computed<LayoutEdge[]>(() => {
    const edges = graph.value?.edges ?? []
    const nodeMap = new Map(layoutNodes.value.map((n) => [n.id, n]))

    return edges
      .map((edge) => {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)
        if (!source || !target) return null
        return {
          ...edge,
          x1: source.x + 180,
          y1: source.y + 30,
          x2: target.x,
          y2: target.y + 30,
        }
      })
      .filter((e): e is LayoutEdge => e !== null)
  })

  return {
    graph,
    layoutNodes,
    layoutEdges,
    svgWidth,
    svgHeight,
  }
}
