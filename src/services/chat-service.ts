import { nanoid } from 'nanoid'
import type { OllamaChatMessage, OllamaOptions, OllamaToolDefinition } from '@/types/ollama'
import { useSessionStore } from '@/stores/session-store'
import { usePromptStore } from '@/stores/prompt-store'
import { useToolCallStore } from '@/stores/toolcall-store'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { useAgentStore } from '@/stores/agent-store'
import { ollamaClient } from './ollama-client'
import { executeChatStream } from './stream-handler'
import { executeTool } from './tool-executor'
import { analyzeMessages } from './prompt-analyzer'

const MAX_TOOL_ROUNDS = 5

export async function startChat(params: {
  model: string
  messages: OllamaChatMessage[]
  tools?: OllamaToolDefinition[]
  options?: OllamaOptions
  think?: boolean | 'max'
  format?: 'json' | Record<string, unknown>
}): Promise<{ sessionId: string; abort: () => void }> {
  const sessionStore = useSessionStore()
  const promptStore = usePromptStore()

  const promptText = params.messages.map((m) => `[${m.role}] ${m.content}`).join('\n')

  const sessionId = sessionStore.createSession({
    mode: 'chat',
    model: params.model,
    prompt: promptText,
    messages: params.messages,
    options: params.options,
  })

  sessionStore.setActiveSession(sessionId)

  const anatomy = analyzeMessages(sessionId, params.messages)
  promptStore.setAnatomy(sessionId, anatomy)

  const abortController = new AbortController()

  const streamPromise = runChatWithToolLoop(
    sessionId,
    params.model,
    [...params.messages],
    params.tools,
    params.options,
    abortController.signal,
    params.think,
    params.format,
  ).catch((err) => {
    if (!abortController.signal.aborted) {
      sessionStore.setSessionError(
        sessionId,
        err instanceof Error ? err.message : 'Chat failed',
      )
    }
  })

  void streamPromise

  return {
    sessionId,
    abort: () => {
      abortController.abort()
      sessionStore.cancelSession(sessionId)
    },
  }
}

async function runChatWithToolLoop(
  sessionId: string,
  model: string,
  messages: OllamaChatMessage[],
  tools: OllamaToolDefinition[] | undefined,
  options: OllamaOptions | undefined,
  signal: AbortSignal,
  think: boolean | 'max' | undefined,
  format: 'json' | Record<string, unknown> | undefined,
): Promise<void> {
  const toolCallStore = useToolCallStore()
  const workshopStore = useToolWorkshopStore()
  const agentStore = useAgentStore()

  let round = 0
  let stepIndex = 0

  while (round < MAX_TOOL_ROUNDS) {
    if (signal.aborted) return

    const stream = await ollamaClient.streamChat(
      { model, messages, tools, options, logprobs: true, think, format },
      signal,
    )

    const result = await executeChatStream(sessionId, stream, signal)

    // No tool calls — the model is done responding
    if (result.toolCalls.length === 0) return

    // Model requested tool calls — execute them
    // Add the assistant's tool-call message to the conversation history
    messages.push({
      role: 'assistant',
      content: '',
      tool_calls: result.toolCalls,
    })

    for (const tc of result.toolCalls) {
      const tool = workshopStore.findByFunctionName(tc.function.name)
      const pendingCalls = toolCallStore.getToolCalls(sessionId)
      const callEntry = pendingCalls.find(
        (c) => c.functionName === tc.function.name && c.status === 'pending',
      )

      if (!tool) {
        // No implementation found — send error back to model
        const errorMsg = `Tool "${tc.function.name}" has no implementation`
        agentStore.addNode(sessionId, {
          id: nanoid(),
          type: 'error',
          label: `No impl: ${tc.function.name}`,
          sessionId,
          stepIndex: stepIndex++,
          state: { tool: tc.function.name, error: errorMsg },
          timestamp: Date.now(),
        })
        if (callEntry) {
          toolCallStore.updateToolCall(sessionId, callEntry.id, {
            status: 'failed',
            error: errorMsg,
            completedAt: Date.now(),
          })
        }
        messages.push({
          role: 'tool',
          content: JSON.stringify({ error: errorMsg }),
        })
        continue
      }

      // Mark as executing
      if (callEntry) {
        toolCallStore.updateToolCall(sessionId, callEntry.id, {
          status: 'executing',
        })
      }

      // Execute the tool
      const execResult = await executeTool(tool, tc.function.arguments)

      // Add execution result node to agent graph
      agentStore.addNode(sessionId, {
        id: nanoid(),
        type: execResult.success ? 'output' : 'error',
        label: execResult.success
          ? `Tool Result: ${tc.function.name}`
          : `Tool Failed: ${tc.function.name}`,
        sessionId,
        stepIndex: stepIndex++,
        state: {
          tool: tc.function.name,
          success: execResult.success,
          durationMs: execResult.durationMs,
        },
        timestamp: Date.now(),
      })

      // Update the tool call entry
      if (callEntry) {
        toolCallStore.updateToolCall(sessionId, callEntry.id, {
          status: execResult.success ? 'completed' : 'failed',
          result: execResult.result,
          error: execResult.error,
          completedAt: Date.now(),
          durationMs: execResult.durationMs,
        })
      }

      // Add tool result to conversation for the next round
      const resultContent = execResult.success
        ? (typeof execResult.result === 'string'
            ? execResult.result
            : JSON.stringify(execResult.result))
        : JSON.stringify({ error: execResult.error })

      messages.push({
        role: 'tool',
        content: resultContent,
      })
    }

    // Add node for the follow-up LLM call with tool results
    agentStore.addNode(sessionId, {
      id: nanoid(),
      type: 'llm_call',
      label: `LLM Round ${round + 2} (with tool results)`,
      sessionId,
      stepIndex: stepIndex++,
      state: { round: round + 1 },
      timestamp: Date.now(),
    })

    round++
    // Loop continues — sends messages with tool results back to model
  }
}
