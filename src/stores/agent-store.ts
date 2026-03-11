import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import type { AgentNode, AgentEdge, AgentGraph } from '@/types/agent'

export const useAgentStore = defineStore('agent', () => {
  const graphsBySession = ref<Map<string, AgentGraph>>(new Map())

  function getGraph(sessionId: string): AgentGraph | null {
    return graphsBySession.value.get(sessionId) ?? null
  }

  function initGraph(sessionId: string) {
    graphsBySession.value.set(sessionId, {
      sessionId,
      nodes: [],
      edges: [],
    })
  }

  function addNode(sessionId: string, node: AgentNode) {
    const graph = graphsBySession.value.get(sessionId)
    if (!graph) return

    graph.nodes.push(node)

    // Auto-create edge from previous node
    if (graph.nodes.length > 1) {
      const prevNode = graph.nodes[graph.nodes.length - 2]!
      graph.edges.push({
        id: nanoid(),
        source: prevNode.id,
        target: node.id,
        label: `Step ${graph.nodes.length - 1}`,
      })
    }
  }

  function addEdge(sessionId: string, edge: AgentEdge) {
    const graph = graphsBySession.value.get(sessionId)
    if (graph) graph.edges.push(edge)
  }

  return {
    graphsBySession,
    getGraph,
    initGraph,
    addNode,
    addEdge,
  }
})
