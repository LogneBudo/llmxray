/**
 * Store <-> Canvas bridge composable.
 * Syncs WorkshopTool[] from Pinia to Vue Flow nodes/edges,
 * handles bidirectional updates, and provides execution overlays.
 */

import { ref, watch, nextTick } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { useToolCallStore } from '@/stores/toolcall-store'
import { useSessionStore } from '@/stores/session-store'
import { workshopToolToBlock, blockToWorkshopToolPatch } from '@/services/tool-canvas-adapter'
import { parseCodeToTools, toolsToCode, generateToolSchemas } from '@/services/ast-parser'
import type { ToolBlockData, LlmToolSchema } from '@/types/tool-canvas'

export interface ExecutionOverlay {
  status: 'executing' | 'completed' | 'failed'
  result?: unknown
  durationMs?: number
}

export function useToolCanvas() {
  const store = useToolWorkshopStore()
  const toolCallStore = useToolCallStore()
  const sessionStore = useSessionStore()

  // --- Flow state ---
  const flowNodes = ref<Node[]>([])
  const flowEdges = ref<Edge[]>([])
  const syncLock = ref<'store' | 'canvas' | null>(null)

  // --- Execution overlays ---
  const executionOverlays = ref<Map<string, ExecutionOverlay>>(new Map())

  // --- Code panel state ---
  const combinedCode = ref('')
  const codeWarnings = ref<string[]>([])
  const codeSyncStatus = ref<'synced' | 'dirty'>('synced')
  const schemas = ref<LlmToolSchema[]>([])

  // Map canvas node ID → store tool.id (since uid = tool.id, they're the same)

  // --- Store → Canvas sync ---

  function rebuildFromStore() {
    if (syncLock.value === 'canvas') return

    syncLock.value = 'store'

    const tools = store.allTools
    const nodes: Node[] = []
    const edges: Edge[] = []

    tools.forEach((tool, i) => {
      const block = workshopToolToBlock(tool)
      const overlay = executionOverlays.value.get(tool.id)

      const position = tool.canvasMeta?.position ?? {
        x: 80 + (i % 3) * 480,
        y: 60 + Math.floor(i / 3) * 400,
      }

      nodes.push({
        id: tool.id,
        type: 'tool-function',
        position,
        data: {
          ...block,
          executionStatus: overlay?.status ?? 'idle',
          lastResult: overlay?.result,
          lastDurationMs: overlay?.durationMs,
          onUpdate: (field: string, value: unknown) => handleBlockUpdate(tool.id, field, value),
        },
      })
    })

    // Sequential edges between nodes
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1]!
      const curr = nodes[i]!
      edges.push({
        id: `e-${prev.id}-${curr.id}`,
        source: prev.id,
        target: curr.id,
        animated: true,
        style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
      })
    }

    flowNodes.value = nodes
    flowEdges.value = edges

    // Update code panel
    const blocks = tools.map((t) => workshopToolToBlock(t))
    combinedCode.value = toolsToCode(blocks)
    schemas.value = generateToolSchemas(blocks)
    codeSyncStatus.value = 'synced'

    nextTick(() => {
      syncLock.value = null
    })
  }

  // Watch store changes
  watch(() => store.allTools, rebuildFromStore, { deep: true })

  // Initial build
  rebuildFromStore()

  // --- Canvas → Store sync ---

  function handleBlockUpdate(toolId: string, field: string, value: unknown) {
    const tool = store.getById(toolId)
    if (!tool) return

    syncLock.value = 'canvas'

    // Build a partial block with the updated field
    const currentBlock = workshopToolToBlock(tool)
    const updatedBlock: ToolBlockData = { ...currentBlock, [field]: value }

    // For fields stored in canvasMeta, update directly
    if (field === 'mappings' || field === 'probeConfig' || field === 'returnSchema') {
      const canvasMeta = { ...tool.canvasMeta, [field]: value }
      store.updateTool(toolId, { canvasMeta })
    } else {
      const patch = blockToWorkshopToolPatch(updatedBlock, tool)
      store.updateTool(toolId, patch)
    }

    nextTick(() => {
      syncLock.value = null
    })
  }

  // --- Node drag → persist position ---

  function onNodeDragStop(event: { node: Node }) {
    const toolId = event.node.id
    const tool = store.getById(toolId)
    if (!tool) return

    const canvasMeta = {
      ...tool.canvasMeta,
      position: { x: event.node.position.x, y: event.node.position.y },
    }
    store.updateTool(toolId, { canvasMeta })
  }

  // --- Add new tool ---

  function addNewTool() {
    const id = store.addTool({
      definition: {
        type: 'function',
        function: {
          name: 'new_tool',
          description: 'A new tool',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
    })
    return id
  }

  // --- Code panel: bidirectional sync ---

  let codeDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function onCodeEdit(newCode: string) {
    combinedCode.value = newCode
    codeSyncStatus.value = 'dirty'

    if (codeDebounceTimer) clearTimeout(codeDebounceTimer)
    codeDebounceTimer = setTimeout(() => {
      applyCodeToStore(newCode)
    }, 500)
  }

  function applyCodeToStore(code: string) {
    const { tools: parsedBlocks, warnings } = parseCodeToTools(code)
    codeWarnings.value = warnings

    if (parsedBlocks.length === 0 && warnings.length > 0) {
      // Parse failed completely, don't wipe store
      return
    }

    syncLock.value = 'canvas'

    // Match parsed blocks to existing tools by uid (= tool.id) or by name
    const existingTools = store.allTools
    const matched = new Set<string>()

    for (const block of parsedBlocks) {
      // Try to match by uid first
      let tool = existingTools.find((t) => t.id === block.uid)

      // Fall back to matching by function name
      if (!tool) {
        tool = existingTools.find(
          (t) => t.definition.function.name === block.name && !matched.has(t.id),
        )
      }

      if (tool) {
        matched.add(tool.id)
        const patch = blockToWorkshopToolPatch(block, tool)
        store.updateTool(tool.id, patch)
      } else {
        // New tool from code
        store.addTool({
          definition: {
            type: 'function',
            function: {
              name: block.name,
              description: block.description,
              parameters: { type: 'object', properties: {}, required: [] },
            },
          },
          implementation: { mode: 'code', blocks: [], code: block.body },
        })
      }
    }

    schemas.value = generateToolSchemas(parsedBlocks)
    codeSyncStatus.value = 'synced'

    nextTick(() => {
      syncLock.value = null
    })
  }

  // --- Live execution overlays ---

  watch(
    () => {
      const sid = sessionStore.activeSessionId
      if (!sid) return null
      return toolCallStore.getToolCalls(sid)
    },
    (calls) => {
      if (!calls) {
        executionOverlays.value = new Map()
        return
      }

      const newOverlays = new Map<string, ExecutionOverlay>()

      for (const call of calls) {
        const tool = store.findByFunctionName(call.functionName)
        if (!tool) continue

        const existing = newOverlays.get(tool.id)
        // Keep most recent call state per tool
        if (
          !existing ||
          call.startedAt > (calls.find((c) => c.functionName === existing.status)?.startedAt ?? 0)
        ) {
          if (call.status === 'pending' || call.status === 'executing') {
            newOverlays.set(tool.id, { status: 'executing' })
          } else if (call.status === 'completed') {
            newOverlays.set(tool.id, {
              status: 'completed',
              result: call.result,
              durationMs: call.durationMs,
            })
          } else if (call.status === 'failed') {
            newOverlays.set(tool.id, {
              status: 'failed',
              result: call.error,
              durationMs: call.durationMs,
            })
          }
        }
      }

      executionOverlays.value = newOverlays

      // Update node data with overlay info
      for (const node of flowNodes.value) {
        const overlay = newOverlays.get(node.id)
        const d = node.data as Record<string, unknown>
        if (overlay) {
          d.executionStatus = overlay.status
          d.lastResult = overlay.result
          d.lastDurationMs = overlay.durationMs
        } else if (d.executionStatus !== 'idle') {
          d.executionStatus = 'idle'
          d.lastResult = undefined
          d.lastDurationMs = undefined
        }
      }
    },
    { deep: true },
  )

  // --- Auto-clear completed overlays after 5s ---

  watch(() => executionOverlays.value, (overlays) => {
    for (const [toolId, overlay] of overlays) {
      if (overlay.status === 'completed' || overlay.status === 'failed') {
        setTimeout(() => {
          const current = executionOverlays.value.get(toolId)
          if (current === overlay) {
            executionOverlays.value.delete(toolId)
            // Reset node
            const node = (flowNodes.value as Array<{ id: string; data: Record<string, unknown> }>).find((n) => n.id === toolId)
            if (node) {
              node.data.executionStatus = 'idle'
            }
          }
        }, 5000)
      }
    }
  }, { deep: true })

  return {
    flowNodes,
    flowEdges,
    executionOverlays,
    combinedCode,
    codeWarnings,
    codeSyncStatus,
    schemas,
    onNodeDragStop,
    onCodeEdit,
    addNewTool,
    handleBlockUpdate,
  }
}
