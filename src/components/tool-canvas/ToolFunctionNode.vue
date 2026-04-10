<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { probeApiAdvanced, discoverOpenApiSpec } from '@/services/probe'
import type { ProbeAdvancedResult, DiscoveryResult } from '@/services/probe'
import { generateProbeBody, generateMappings, generateReturnSchema } from '@/services/path-to-code'
import { parseOpenApiSpec } from '@/services/openapi-parser'
import type { ParsedSpec, Endpoint } from '@/services/openapi-parser'
import type { ToolMapping, ProbeConfig } from '@/types/tool-canvas'
import { useCanvasAiStore } from '@/stores/canvas-ai-store'
import { canvasAiDB } from '@/services/canvas-ai-db'
import {
  generateDraft,
  analyzeToolCode,
  suggestMappings as suggestMappingsAi,
  generateFix,
} from '@/services/canvas-ai'
import type { AiInsight } from '@/types/canvas-ai'
import JsonTreeNode from '@/components/tool-optimizer/JsonTreeNode.vue'
import CodeEditor from './CodeEditor.vue'
import AiDiffView from './AiDiffView.vue'

const aiStore = useCanvasAiStore()

const props = defineProps<{
  data: {
    uid: string
    name: string
    description: string
    parameters: Array<{ name: string; type: string }>
    body: string
    mappings?: ToolMapping[]
    probeConfig?: ProbeConfig
    executionStatus?: 'idle' | 'executing' | 'completed' | 'failed'
    lastResult?: unknown
    lastDurationMs?: number
    lastCallArguments?: Record<string, unknown>
    lastCallError?: string
    onUpdate?: (field: string, value: unknown) => void
  }
}>()

function emitField(field: string, value: unknown) {
  props.data.onUpdate?.(field, value)
}

// --- Parameters ---

function updateParam(index: number, key: 'name' | 'type', value: string) {
  const updated = props.data.parameters.map((p, i) =>
    i === index ? { ...p, [key]: value } : { ...p },
  )
  emitField('parameters', updated)
}

function addParam() {
  emitField('parameters', [...props.data.parameters, { name: 'arg', type: 'string' }])
}

function removeParam(index: number) {
  emitField('parameters', props.data.parameters.filter((_, i) => i !== index))
}

// --- Stale mapping detection ---

const staleMappings = computed(() => {
  const mappings = props.data.mappings
  if (!mappings || mappings.length === 0) return []
  const body = props.data.body
  return mappings.filter((m) => !body.includes(m.returnKey))
})

const hasStaleMappings = computed(() => staleMappings.value.length > 0)

// --- Execution overlay ---

const showResult = ref(false)

// --- AI Draft ---

const intentOpen = ref(false)
const intentText = ref(aiStore.getIntent(props.data.uid) ?? '')

const draft = computed(() => aiStore.drafts.get(props.data.uid))
const isDraftLoading = computed(() => draft.value?.loading ?? false)

async function handleDraftGenerate() {
  if (!intentText.value.trim() || !aiStore.effectiveModel) return

  aiStore.setIntent(props.data.uid, intentText.value)

  aiStore.setDraft(props.data.uid, {
    toolId: props.data.uid,
    phase: 'draft',
    code: '',
    explanation: '',
    loading: true,
    intentText: intentText.value,
  })

  const result = await generateDraft({
    model: aiStore.effectiveModel,
    toolName: props.data.name,
    description: props.data.description,
    parameters: props.data.parameters,
    probeResponseSample: probeData.value ?? undefined,
    intent: intentText.value,
  })

  if (result.error) {
    aiStore.setDraft(props.data.uid, {
      toolId: props.data.uid,
      phase: 'draft',
      code: '',
      explanation: '',
      loading: false,
      error: result.error,
      intentText: intentText.value,
    })
  } else {
    aiStore.setDraft(props.data.uid, {
      toolId: props.data.uid,
      phase: 'draft',
      code: result.code,
      explanation: result.explanation,
      loading: false,
      trainingPairId: result.trainingPairId,
      intentText: intentText.value,
    })
  }
}

function acceptDraft() {
  const d = draft.value
  if (!d || !d.code) return
  emitField('body', d.code)
  if (d.trainingPairId) {
    canvasAiDB.updateAccepted(d.trainingPairId)
  }
  aiStore.clearDraft(props.data.uid)
}

function dismissDraft() {
  aiStore.clearDraft(props.data.uid)
}

// --- AI Insights ---

const toolInsights = computed(() => aiStore.insights.get(props.data.uid))
const expandedInsight = ref<AiInsight | null>(null)
const insightsLoading = ref(false)

// Clear insights when code changes (stale detection)
watch(
  () => props.data.body,
  () => {
    const existing = aiStore.insights.get(props.data.uid)
    if (existing) {
      aiStore.clearInsights(props.data.uid)
      expandedInsight.value = null
    }
  },
)

const insightsError = ref<string | null>(null)

// Animated thinking words
const THINKING_WORDS = [
  'Thinking', 'Cogitating', 'Analyzing', 'Flexing', 'Scrutinizing',
  'Neuroticizing', 'Polarizing', 'Rasterizing', 'Criticizing',
  'Parameterizing', 'Inspecting', 'Evaluating', 'Dissecting',
  'Probing', 'Examining', 'Parsing', 'Reviewing', 'Synthesizing',
]
const thinkingWordIndex = ref(0)
let thinkingInterval: ReturnType<typeof setInterval> | null = null
const thinkingWord = computed(() => THINKING_WORDS[thinkingWordIndex.value % THINKING_WORDS.length])

function startThinkingAnimation() {
  thinkingWordIndex.value = 0
  thinkingInterval = setInterval(() => {
    thinkingWordIndex.value++
  }, 1500)
}

function stopThinkingAnimation() {
  if (thinkingInterval) {
    clearInterval(thinkingInterval)
    thinkingInterval = null
  }
}

function applyInsightFix() {
  if (!expandedInsight.value?.suggestedCode) {
    console.warn('[Insight] No suggestedCode to apply')
    return
  }
  const code = expandedInsight.value.suggestedCode
  console.log('[Insight] Applying fix, code length:', code.length)
  emitField('body', code)
  expandedInsight.value = null
}

async function handleAnalyze() {
  if (!aiStore.effectiveModel) {
    insightsError.value = 'No AI model selected. Choose one in the Canvas AI model selector.'
    return
  }

  insightsLoading.value = true
  insightsError.value = null
  expandedInsight.value = null
  startThinkingAnimation()

  const result = await analyzeToolCode({
    model: aiStore.effectiveModel,
    toolName: props.data.name,
    code: props.data.body,
    parameters: props.data.parameters,
  })

  insightsLoading.value = false
  stopThinkingAnimation()

  if (result.error) {
    insightsError.value = result.error
  } else {
    aiStore.setInsights(props.data.uid, {
      toolId: props.data.uid,
      insights: result.insights,
      codeHash: props.data.body,
    })
  }
}

// --- AI Auto-Map ---

const autoMapLoading = ref(false)
const autoMapReasoning = ref('')

async function handleAutoMap() {
  if (!aiStore.effectiveModel || !probeData.value) return

  autoMapLoading.value = true
  autoMapReasoning.value = ''

  const result = await suggestMappingsAi({
    model: aiStore.effectiveModel,
    toolName: props.data.name,
    description: props.data.description,
    probeResponseSample: probeData.value,
  })

  autoMapLoading.value = false

  if (!result.error && result.paths.length > 0) {
    autoMapReasoning.value = result.reasoning
    // Pre-populate selected paths
    selectedPaths.value = new Set(result.paths)
  }
}

// --- AI Fix ---

const fixLoading = ref(false)

async function handleAiFix() {
  if (!aiStore.effectiveModel) return

  fixLoading.value = true

  const originalIntent = aiStore.getIntent(props.data.uid)

  const result = await generateFix({
    model: aiStore.effectiveModel,
    toolName: props.data.name,
    code: props.data.body,
    parameters: props.data.parameters,
    error: props.data.lastCallError ?? 'Unknown error',
    arguments: props.data.lastCallArguments ?? {},
    originalIntent,
  })

  fixLoading.value = false

  if (!result.error && result.fixedCode) {
    aiStore.setDraft(props.data.uid, {
      toolId: props.data.uid,
      phase: 'fix',
      code: result.fixedCode,
      explanation: result.explanation,
      loading: false,
      trainingPairId: result.trainingPairId,
    })
  }
}

// --- Probe State ---

type ProbePhase = 'idle' | 'discovering' | 'diagnosed' | 'picked'

const probeOpen = ref(false)
const probePhase = ref<ProbePhase>('idle')
const probeUrl = ref(props.data.probeConfig?.url ?? '')
const httpMethod = ref(props.data.probeConfig?.method ?? 'GET')
const probeResult = ref<ProbeAdvancedResult | null>(null)
const discoveryResult = ref<DiscoveryResult | null>(null)
const parsedSpec = ref<ParsedSpec | null>(null)

const customHeaders = ref<Array<{ key: string; value: string }>>(
  props.data.probeConfig?.headers
    ? Object.entries(props.data.probeConfig.headers).map(([key, value]) => ({ key, value }))
    : [],
)

const secretHeaderKeys = ref<Set<string>>(
  new Set(props.data.probeConfig?.secretHeaders ?? []),
)

function toggleSecret(index: number) {
  const key = customHeaders.value[index]!.key.trim()
  if (!key) return
  const next = new Set(secretHeaderKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  secretHeaderKeys.value = next
}
const requestBody = ref('')

const probeData = ref<unknown>(null)
const selectedPaths = ref(new Set<string>())

const endpointSearch = ref('')
const selectedEndpoint = ref<Endpoint | null>(null)

const filteredEndpoints = computed(() => {
  if (!parsedSpec.value) return []
  const q = endpointSearch.value.toLowerCase()
  if (!q) return parsedSpec.value.endpoints
  return parsedSpec.value.endpoints.filter(
    (ep) =>
      ep.path.toLowerCase().includes(q) ||
      ep.summary?.toLowerCase().includes(q) ||
      ep.operationId?.toLowerCase().includes(q),
  )
})

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-success)'
  if (status >= 300 && status < 400) return 'var(--color-warning, #f9e2af)'
  return 'var(--color-error)'
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return 'var(--color-accent)'
    case 'POST': return 'var(--color-success)'
    case 'PUT': return 'var(--color-warning, #f9e2af)'
    case 'DELETE': return 'var(--color-error)'
    case 'PATCH': return '#cba6f7'
    default: return 'var(--color-text-muted)'
  }
}

// --- Probe Actions ---

async function runProbe() {
  const url = probeUrl.value.trim()
  if (!url) return

  probePhase.value = 'discovering'
  probeResult.value = null
  discoveryResult.value = null
  parsedSpec.value = null
  probeData.value = null
  selectedPaths.value = new Set()
  selectedEndpoint.value = null

  const headers: Record<string, string> = {}
  for (const h of customHeaders.value) {
    if (h.key.trim()) headers[h.key.trim()] = h.value
  }

  const [probeRes, discoverRes] = await Promise.allSettled([
    probeApiAdvanced(url, {
      method: httpMethod.value,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body:
        httpMethod.value === 'POST' || httpMethod.value === 'PUT'
          ? requestBody.value || undefined
          : undefined,
    }),
    discoverOpenApiSpec(url),
  ])

  if (probeRes.status === 'fulfilled') {
    probeResult.value = probeRes.value
    if (probeRes.value.data) {
      probeData.value = probeRes.value.data
    }
    if (probeRes.value.authHint && customHeaders.value.length === 0) {
      if (probeRes.value.authHint.type === 'bearer') {
        customHeaders.value = [{ key: 'Authorization', value: 'Bearer ' }]
      } else if (probeRes.value.authHint.type === 'apikey') {
        customHeaders.value = [{ key: 'X-API-Key', value: '' }]
      } else if (probeRes.value.authHint.type === 'basic') {
        customHeaders.value = [{ key: 'Authorization', value: 'Basic ' }]
      }
    }
  }

  if (discoverRes.status === 'fulfilled' && discoverRes.value.spec) {
    discoveryResult.value = discoverRes.value
    parsedSpec.value = parseOpenApiSpec(discoverRes.value.spec)
  }

  probePhase.value = 'diagnosed'
}

function selectEndpoint(ep: Endpoint) {
  selectedEndpoint.value = ep

  const baseUrl = parsedSpec.value?.info.baseUrl ?? ''
  const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${ep.path}` : ep.path
  probeUrl.value = fullUrl
  httpMethod.value = ep.method

  const fnName =
    ep.operationId ?? ep.path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  emitField('name', fnName)
  if (ep.summary || ep.description) {
    emitField('description', ep.summary ?? ep.description ?? '')
  }

  const toolParams = ep.parameters
    .filter((p) => p.in === 'query' || p.in === 'path')
    .map((p) => ({ name: p.name, type: p.type }))
  if (toolParams.length > 0) {
    emitField('parameters', toolParams)
  }
}

function addHeader() {
  customHeaders.value = [...customHeaders.value, { key: '', value: '' }]
}

function removeHeader(index: number) {
  customHeaders.value = customHeaders.value.filter((_, i) => i !== index)
}

function togglePath(path: string) {
  const next = new Set(selectedPaths.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  selectedPaths.value = next
}

function applySelection() {
  const paths = Array.from(selectedPaths.value)
  if (paths.length === 0) return

  const headers: Record<string, string> = {}
  for (const h of customHeaders.value) {
    if (h.key.trim()) headers[h.key.trim()] = h.value
  }

  const secrets = Array.from(secretHeaderKeys.value)

  const { body, addedParams } = generateProbeBody(probeUrl.value.trim(), paths, {
    method: httpMethod.value !== 'GET' ? httpMethod.value : undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body:
      httpMethod.value === 'POST' || httpMethod.value === 'PUT'
        ? requestBody.value || undefined
        : undefined,
    secretHeaders: secrets.length > 0 ? secrets : undefined,
  })

  emitField('body', body)

  const mappings = generateMappings(paths)
  emitField('mappings', mappings)

  if (probeData.value) {
    const returnSchema = generateReturnSchema(mappings, probeData.value)
    emitField('returnSchema', returnSchema)
  }

  const probeConfig: ProbeConfig = {
    url: probeUrl.value.trim(),
    method: httpMethod.value,
    headers,
    ...(secrets.length > 0 ? { secretHeaders: secrets } : {}),
  }
  emitField('probeConfig', probeConfig)

  if (addedParams.length > 0) {
    const existing = props.data.parameters.map((p) => p.name)
    const newParams = addedParams.filter((p) => !existing.includes(p.name))
    if (newParams.length > 0) {
      emitField('parameters', [...props.data.parameters, ...newParams])
    }
  }

  probePhase.value = 'picked'
}
</script>

<template>
  <div
    class="tool-block"
    :class="{
      executing: data.executionStatus === 'executing',
      completed: data.executionStatus === 'completed',
      failed: data.executionStatus === 'failed',
    }"
  >
    <Handle type="target" :position="Position.Top" />

    <!-- Header -->
    <div class="block-header">
      <span class="block-badge">{{ $t('tools.node.badge') }}</span>
      <input
        class="block-name-input"
        :value="data.name"
        @change="(e: Event) => emitField('name', (e.target as HTMLInputElement).value)"
        :placeholder="$t('tools.node.functionNamePlaceholder')"
      />
      <button
        class="ai-header-btn"
        :class="{ active: intentOpen }"
        :disabled="isDraftLoading"
        :title="$t('tools.node.draftWithAi')"
        @click.stop="intentOpen = !intentOpen"
      >
        {{ isDraftLoading ? '...' : '&#10024;' }}
      </button>
      <button
        class="ai-header-btn ai-analyze"
        :disabled="insightsLoading || !data.body.trim()"
        :title="$t('tools.node.aiInsights')"
        @click.stop="handleAnalyze"
      >
        {{ insightsLoading ? '...' : '&#128269;' }}
      </button>
    </div>

    <!-- AI Thinking indicator -->
    <div v-if="insightsLoading" class="thinking-bar nodrag">
      <span class="thinking-dot" />
      <span class="thinking-text">{{ thinkingWord }}...</span>
    </div>

    <!-- AI Insight error -->
    <div v-if="insightsError" class="insights-row">
      <span class="insight-badge error" @click.stop="insightsError = null">{{ insightsError }}</span>
    </div>

    <!-- AI Insight badges -->
    <div v-if="toolInsights?.insights.length" class="insights-row">
      <span
        v-for="(insight, idx) in toolInsights.insights"
        :key="idx"
        class="insight-badge"
        :class="insight.severity"
        @click.stop="expandedInsight = expandedInsight === insight ? null : insight"
      >
        {{ insight.title }}
      </span>
    </div>

    <!-- Expanded insight -->
    <div v-if="expandedInsight" class="insight-detail nodrag nowheel">
      <p class="insight-desc">{{ expandedInsight.description }}</p>
      <template v-if="expandedInsight.suggestedCode">
        <p class="insight-suggestion-label">{{ $t('tools.node.insightSuggestionLabel') }}</p>
        <CodeEditor
          :model-value="expandedInsight.suggestedCode"
          language="typescript"
          :readonly="true"
          min-height="60px"
        />
      </template>
      <div class="insight-actions" @mousedown.stop>
        <button
          v-if="expandedInsight.suggestedCode"
          class="insight-apply"
          @click.stop.prevent="applyInsightFix"
        >
          {{ $t('tools.node.applyFix') }}
        </button>
        <button class="insight-close" @click.stop="expandedInsight = null">&times; {{ $t('tools.node.closeInsight') }}</button>
      </div>
    </div>

    <!-- Execution badge -->
    <div
      v-if="data.executionStatus && data.executionStatus !== 'idle'"
      class="exec-badge-row"
    >
      <span
        v-if="data.executionStatus === 'executing'"
        class="exec-badge exec-executing"
      >
        {{ $t('tools.node.running') }}
      </span>
      <button
        v-else-if="data.executionStatus === 'completed'"
        class="exec-badge exec-completed"
        @click.stop="showResult = !showResult"
      >
        &#10003; {{ data.lastDurationMs != null ? `${data.lastDurationMs}ms` : $t('tools.node.done') }}
      </button>
      <span
        v-else-if="data.executionStatus === 'failed'"
        class="exec-badge exec-failed"
      >
        &#10007; {{ $t('tools.node.failed') }}
      </span>
      <button
        v-if="data.executionStatus === 'failed'"
        class="ai-fix-btn"
        :disabled="fixLoading"
        @click.stop="handleAiFix"
      >
        {{ fixLoading ? '...' : $t('tools.node.aiFix') }}
      </button>
    </div>

    <!-- Execution result panel -->
    <div v-if="showResult && data.lastResult !== undefined" class="exec-result-panel nodrag nowheel">
      <JsonTreeNode
        label="result"
        :value="data.lastResult"
        path=""
        :selected-paths="new Set()"
        :depth="0"
        @toggle-path="() => {}"
      />
    </div>

    <!-- Description -->
    <div class="block-section">
      <label>{{ $t('tools.node.description') }}</label>
      <input
        class="block-input"
        :value="data.description"
        @change="(e: Event) => emitField('description', (e.target as HTMLInputElement).value)"
        :placeholder="$t('tools.node.descriptionPlaceholder')"
      />
    </div>

    <!-- AI Intent input -->
    <div v-if="intentOpen" class="block-section nodrag nowheel">
      <label>{{ $t('tools.node.intent') }}</label>
      <textarea
        v-model="intentText"
        class="intent-textarea"
        :placeholder="$t('tools.node.intentPlaceholder')"
        rows="2"
      />
      <div class="intent-actions">
        <button
          class="intent-generate-btn"
          :disabled="isDraftLoading || !intentText.trim()"
          @click="handleDraftGenerate"
        >
          {{ isDraftLoading ? $t('tools.node.generating') : $t('tools.node.generate') }}
        </button>
      </div>
      <div v-if="draft?.error" class="intent-error">{{ draft.error }}</div>
    </div>

    <!-- Parameters -->
    <div class="block-section">
      <div class="param-header">
        <label>{{ $t('tools.node.parameters') }}</label>
        <button class="param-add-btn" @click="addParam">{{ $t('tools.node.addParam') }}</button>
      </div>
      <div v-for="(param, i) in data.parameters" :key="i" class="param-row">
        <input
          class="param-name"
          :value="param.name"
          @change="(e: Event) => updateParam(i, 'name', (e.target as HTMLInputElement).value)"
          :placeholder="$t('tools.node.paramNamePlaceholder')"
        />
        <input
          class="param-type"
          :value="param.type"
          @change="(e: Event) => updateParam(i, 'type', (e.target as HTMLInputElement).value)"
          :placeholder="$t('tools.node.paramTypePlaceholder')"
        />
        <button class="param-remove-btn" aria-label="Remove parameter" @click="removeParam(i)">&times;</button>
      </div>
      <div v-if="data.parameters.length === 0" class="param-empty">{{ $t('tools.node.noParameters') }}</div>
    </div>

    <!-- Probe & Pick -->
    <div class="block-section probe-section">
      <div class="probe-toggle" @click="probeOpen = !probeOpen">
        <span class="toggle-arrow" :class="{ open: probeOpen }">&#9654;</span>
        <label>{{ $t('tools.node.probeAndPick') }}</label>
        <span class="probe-badge">{{ $t('tools.node.apiBadge') }}</span>
      </div>

      <div v-if="probeOpen" class="probe-panel nodrag nowheel">
        <!-- URL + Method -->
        <div class="probe-url-row">
          <select v-model="httpMethod" class="method-select">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input
            v-model="probeUrl"
            class="block-input probe-url"
            :placeholder="$t('tools.node.urlPlaceholder')"
            @keydown.enter="runProbe"
          />
          <button
            class="probe-btn"
            :disabled="probePhase === 'discovering' || !probeUrl.trim()"
            @click="runProbe"
          >
            {{ probePhase === 'discovering' ? '...' : $t('tools.node.probe') }}
          </button>
        </div>

        <!-- Diagnostics -->
        <template v-if="probeResult && probePhase !== 'idle'">
          <div class="diag-row">
            <span class="diag-status" :style="{ background: statusColor(probeResult.status) }">
              {{ probeResult.status }}
            </span>
            <span v-if="probeResult.headers['content-type']" class="diag-tag">
              {{ probeResult.headers['content-type'].split(';')[0] }}
            </span>
            <span v-if="probeResult.headers.server" class="diag-tag">
              {{ probeResult.headers.server }}
            </span>
            <span v-if="parsedSpec" class="diag-tag diag-openapi">
              OpenAPI &middot; {{ parsedSpec.endpoints.length }} endpoints
            </span>
          </div>

          <div v-if="probeResult.authHint" class="diag-auth">
            <span class="diag-auth-icon">&#x1F512;</span>
            <span>{{ probeResult.authHint.message }}</span>
          </div>
        </template>

        <!-- Custom Headers -->
        <div class="config-section">
          <div class="config-header">
            <span class="config-label">{{ $t('tools.node.headers') }}</span>
            <button class="param-add-btn" @click="addHeader">{{ $t('tools.node.addHeader') }}</button>
          </div>
          <div v-for="(_h, i) in customHeaders" :key="i" class="param-row">
            <input class="param-name" v-model="customHeaders[i]!.key" :placeholder="$t('tools.node.headerNamePlaceholder')" />
            <input
              class="param-type"
              :class="{ 'secret-masked': secretHeaderKeys.has(customHeaders[i]!.key.trim()) }"
              v-model="customHeaders[i]!.value"
              :placeholder="$t('tools.node.headerValuePlaceholder')"
            />
            <button
              class="secret-toggle-btn"
              :class="{ active: secretHeaderKeys.has(customHeaders[i]!.key.trim()) }"
              @click="toggleSecret(i)"
              :title="$t('tools.node.markAsSecret')"
            >
              &#x1F512;
            </button>
            <button class="param-remove-btn" aria-label="Remove header" @click="removeHeader(i)">&times;</button>
          </div>
        </div>

        <!-- Request body for POST/PUT -->
        <div v-if="httpMethod === 'POST' || httpMethod === 'PUT'" class="config-section">
          <span class="config-label">{{ $t('tools.node.requestBody') }}</span>
          <CodeEditor
            v-model="requestBody"
            language="json"
            min-height="60px"
            placeholder='{"key": "value"}'
          />
        </div>

        <!-- Endpoint Picker -->
        <template v-if="parsedSpec && parsedSpec.endpoints.length > 0">
          <div class="ep-section">
            <span class="config-label">{{ $t('tools.node.endpoints') }}</span>
            <input
              v-model="endpointSearch"
              class="block-input ep-search"
              :placeholder="$t('tools.node.searchEndpoints')"
            />
            <div class="ep-list">
              <div
                v-for="ep in filteredEndpoints"
                :key="ep.method + ep.path"
                class="ep-row"
                :class="{ selected: selectedEndpoint === ep }"
                @click="selectEndpoint(ep)"
              >
                <span class="ep-method" :style="{ background: methodColor(ep.method) }">{{
                  ep.method
                }}</span>
                <span class="ep-path">{{ ep.path }}</span>
                <span v-if="ep.summary" class="ep-summary">{{ ep.summary }}</span>
              </div>
              <div v-if="filteredEndpoints.length === 0" class="param-empty">
                {{ $t('tools.node.noMatchingEndpoints') }}
              </div>
            </div>
          </div>
        </template>

        <!-- JSON Tree -->
        <template v-if="probeData && probeResult && probeResult.ok">
          <!-- AI Suggest -->
          <div class="probe-ai-row">
            <button
              class="ai-suggest-btn"
              :disabled="autoMapLoading"
              @click="handleAutoMap"
            >
              {{ autoMapLoading ? $t('tools.node.thinking') : $t('tools.node.aiSuggest') }}
            </button>
          </div>

          <!-- AI reasoning banner -->
          <div v-if="autoMapReasoning" class="auto-map-reasoning">
            {{ autoMapReasoning }}
          </div>

          <div class="probe-tree">
            <JsonTreeNode
              label="response"
              :value="probeData"
              path=""
              :selected-paths="selectedPaths"
              :depth="0"
              @toggle-path="togglePath"
            />
          </div>

          <div v-if="selectedPaths.size > 0" class="probe-footer">
            <span class="probe-count"
              >{{ selectedPaths.size }} {{ selectedPaths.size !== 1 ? $t('tools.node.fields') : $t('tools.node.field') }}</span
            >
            <button class="probe-apply-btn" @click="applySelection">{{ $t('tools.node.apply') }}</button>
          </div>
        </template>

        <!-- Error / raw text fallback -->
        <div v-if="probeResult && probeResult.error && !probeResult.data" class="probe-error">
          {{ probeResult.error }}
        </div>
        <pre v-if="probeResult?.rawText" class="probe-raw">{{ probeResult.rawText }}</pre>
      </div>
    </div>

    <!-- Mappings indicator -->
    <div
      v-if="data.mappings && data.mappings.length > 0"
      class="block-section mappings-section"
    >
      <div class="mappings-header">
        <label>{{ $t('tools.node.mappings') }}</label>
        <span
          v-if="hasStaleMappings"
          class="stale-badge"
          title="Some mapped fields are missing from the function body"
          >{{ $t('tools.node.outOfSync') }}</span
        >
      </div>
      <div class="mappings-list">
        <span
          v-for="m in data.mappings"
          :key="m.jsonPath"
          class="mapping-tag"
          :class="{ stale: staleMappings.some((s) => s.jsonPath === m.jsonPath) }"
          :title="m.jsonPath"
        >
          {{ m.returnKey }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="block-section nodrag nowheel">
      <label>{{ $t('tools.node.bodyLabel') }}</label>
      <!-- Draft overlay -->
      <template v-if="draft && !draft.loading && draft.code">
        <AiDiffView
          :old-code="data.body"
          :new-code="draft.code"
          :explanation="draft.explanation"
          @accept="acceptDraft"
          @dismiss="dismissDraft"
        />
      </template>
      <!-- Normal editor -->
      <template v-else>
        <CodeEditor
          :model-value="data.body"
          language="typescript"
          min-height="100px"
          :placeholder="$t('tools.node.bodyPlaceholder')"
          @update:model-value="(v: string) => emitField('body', v)"
        />
      </template>
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.tool-block {
  background: var(--color-surface-raised, #1e293b);
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  padding: 0;
  color: var(--color-text-primary);
  width: 420px;
  font-size: 13px;
  overflow: visible;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.tool-block.executing {
  animation: pulse-glow 1s ease-in-out infinite;
  border-color: var(--color-accent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--color-accent) 30%, transparent);
}
.tool-block.completed {
  border-color: var(--color-success);
}
.tool-block.failed {
  border-color: var(--color-error);
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 5px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }
  50% {
    box-shadow: 0 0 25px color-mix(in srgb, var(--color-accent) 50%, transparent);
  }
}

.block-header {
  background: var(--color-surface-overlay, #334155);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-border-default);
  border-radius: 10px 10px 0 0;
}

.block-badge {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: var(--color-accent);
  color: var(--color-surface-base, #0f172a);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  white-space: nowrap;
}

.block-name-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-accent);
  font-size: 15px;
  font-weight: 700;
  font-family: ui-monospace, Consolas, monospace;
  outline: none;
  padding: 0;
}
.block-name-input:focus {
  border-bottom: 1px solid var(--color-accent);
}

/* Execution badges */
.exec-badge-row {
  padding: 4px 12px;
  border-bottom: 1px solid var(--color-border-default);
}
.exec-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: default;
}
.exec-executing {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}
.exec-completed {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
  border: none;
  cursor: pointer;
}
.exec-completed:hover {
  background: color-mix(in srgb, var(--color-success) 25%, transparent);
}
.exec-failed {
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
  color: var(--color-error);
}
.exec-result-panel {
  padding: 6px 12px;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-surface-base, #0f172a);
  max-height: 200px;
  overflow: auto;
}

.block-section {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-default);
}
.block-section:last-child {
  border-bottom: none;
}
.block-section > label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 4px;
}

.block-input {
  width: 100%;
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.block-input:focus {
  border-color: var(--color-accent);
}

/* Parameters */
.param-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.param-header label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  margin-bottom: 0;
}
.param-add-btn {
  background: none;
  border: 1px solid var(--color-border-default);
  color: var(--color-success);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
}
.param-add-btn:hover {
  background: var(--color-surface-overlay);
}
.param-row {
  display: flex;
  gap: 4px;
  margin-bottom: 3px;
}
.param-name,
.param-type {
  flex: 1;
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  outline: none;
  box-sizing: border-box;
}
.param-name:focus,
.param-type:focus {
  border-color: var(--color-accent);
}
.param-type {
  color: var(--color-accent);
}
.param-remove-btn {
  background: none;
  border: none;
  color: var(--color-error);
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.secret-toggle-btn {
  background: none;
  border: none;
  font-size: 11px;
  cursor: pointer;
  padding: 0 3px;
  opacity: 0.35;
  transition: opacity 0.15s;
}
.secret-toggle-btn:hover {
  opacity: 0.7;
}
.secret-toggle-btn.active {
  opacity: 1;
  filter: drop-shadow(0 0 3px var(--color-warning, #f9e2af));
}
.secret-masked {
  -webkit-text-security: disc;
}
.param-empty {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Probe section */
.probe-section {
  padding: 0;
}
.probe-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}
.probe-toggle label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  cursor: pointer;
  margin: 0;
}
.probe-badge {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-accent);
  color: var(--color-surface-base, #0f172a);
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 700;
  margin-left: auto;
}
.toggle-arrow {
  font-size: 8px;
  color: var(--color-text-muted);
  transition: transform 0.15s;
  display: inline-block;
  width: 10px;
  text-align: center;
}
.toggle-arrow.open {
  transform: rotate(90deg);
}

.probe-panel {
  padding: 0 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* URL row */
.probe-url-row {
  display: flex;
  gap: 4px;
}
.probe-url {
  flex: 1;
}
.method-select {
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  color: var(--color-accent);
  padding: 3px 4px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  font-family: ui-monospace, Consolas, monospace;
  outline: none;
  cursor: pointer;
  width: 62px;
}
.probe-btn {
  background: var(--color-accent);
  color: var(--color-surface-base, #0f172a);
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.probe-btn:hover {
  opacity: 0.9;
}
.probe-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Diagnostics */
.diag-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.diag-status {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-surface-base, #0f172a);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: ui-monospace, Consolas, monospace;
}
.diag-tag {
  font-size: 9px;
  color: var(--color-text-secondary);
  background: var(--color-surface-overlay);
  padding: 1px 5px;
  border-radius: 3px;
}
.diag-openapi {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
  font-weight: 600;
}
.diag-auth {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-warning, #f9e2af);
  background: color-mix(in srgb, var(--color-warning, #f9e2af) 8%, transparent);
  padding: 4px 8px;
  border-radius: 4px;
}
.diag-auth-icon {
  font-size: 12px;
}

/* Config sections */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.config-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}
.req-body {
  min-height: 50px;
}

/* Endpoint picker */
.ep-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ep-search {
  font-size: 11px;
}
.ep-list {
  max-height: 180px;
  overflow-y: auto;
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
}
.ep-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-surface-raised, #1e293b);
}
.ep-row:last-child {
  border-bottom: none;
}
.ep-row:hover {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.ep-row.selected {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
}
.ep-method {
  font-size: 8px;
  font-weight: 700;
  color: var(--color-surface-base, #0f172a);
  padding: 1px 4px;
  border-radius: 2px;
  font-family: ui-monospace, Consolas, monospace;
  flex-shrink: 0;
}
.ep-path {
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ep-summary {
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: auto;
}

/* JSON tree */
.probe-tree {
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  padding: 6px;
  max-height: 220px;
  overflow: auto;
}
.probe-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.probe-count {
  font-size: 10px;
  color: var(--color-success);
  font-weight: 600;
}
.probe-apply-btn {
  background: var(--color-success);
  color: var(--color-surface-base, #0f172a);
  border: none;
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.probe-apply-btn:hover {
  opacity: 0.9;
}

/* Error / raw */
.probe-error {
  font-size: 11px;
  color: var(--color-error);
}
.probe-raw {
  font-size: 10px;
  color: var(--color-text-secondary);
  background: var(--color-surface-base, #0f172a);
  padding: 6px;
  border-radius: 4px;
  max-height: 80px;
  overflow: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Mappings */
.mappings-section {
  padding-bottom: 6px;
}
.mappings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.mappings-header label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  margin: 0;
}
.stale-badge {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  padding: 1px 6px;
  border-radius: 3px;
}
.mappings-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.mapping-tag {
  font-size: 10px;
  font-family: ui-monospace, Consolas, monospace;
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success);
  padding: 1px 6px;
  border-radius: 3px;
}
.mapping-tag.stale {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
  color: var(--color-error);
  text-decoration: line-through;
}

/* Body */
.block-body {
  width: 100%;
  min-height: 100px;
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  padding: 8px;
  border-radius: 4px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.block-body:focus {
  border-color: var(--color-accent);
}

/* AI Header buttons */
.ai-header-btn {
  background: none;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-muted);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ai-header-btn:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}
.ai-header-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.ai-header-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.ai-header-btn.ai-analyze {
  font-size: 11px;
}

/* AI Fix button */
.ai-fix-btn {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  margin-left: auto;
}
.ai-fix-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.ai-fix-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Insights badges */
.insights-row {
  padding: 4px 12px;
  border-bottom: 1px solid var(--color-border-default);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.insight-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.insight-badge:hover {
  opacity: 0.8;
}
.insight-badge.info {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}
.insight-badge.warning {
  background: color-mix(in srgb, var(--color-warning, #f9e2af) 15%, transparent);
  color: var(--color-warning, #f9e2af);
}
.insight-badge.error {
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
  color: var(--color-error);
}

/* Expanded insight */
.insight-detail {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-surface-base, #0f172a);
}
.insight-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0 0 6px;
}
/* Thinking animation */
.thinking-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--color-border-default);
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
  background-size: 200% 100%;
  animation: thinking-shimmer 2s ease-in-out infinite;
}
@keyframes thinking-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.thinking-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: thinking-pulse 1s ease-in-out infinite;
}
@keyframes thinking-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.thinking-text {
  font-size: 10px;
  color: var(--color-accent);
  font-style: italic;
  transition: opacity 0.3s;
}

.insight-suggestion-label {
  font-size: 9px;
  color: var(--color-text-muted);
  margin: 4px 0 2px;
  font-style: italic;
}
.insight-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.insight-apply {
  background: var(--color-accent);
  border: none;
  color: white;
  font-size: 10px;
  cursor: pointer;
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 500;
}
.insight-apply:hover {
  opacity: 0.85;
}
.insight-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 10px;
  cursor: pointer;
  padding: 2px 0;
}
.insight-close:hover {
  color: var(--color-text-primary);
}

/* Intent input */
.intent-textarea {
  width: 100%;
  background: var(--color-surface-base, #0f172a);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.intent-textarea:focus {
  border-color: var(--color-accent);
}
.intent-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.intent-generate-btn {
  background: var(--color-accent);
  color: var(--color-surface-base, #0f172a);
  border: none;
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.intent-generate-btn:hover {
  opacity: 0.9;
}
.intent-generate-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.intent-error {
  font-size: 11px;
  color: var(--color-error);
  margin-top: 4px;
}

/* AI Suggest in probe */
.probe-ai-row {
  display: flex;
  justify-content: flex-end;
}
.ai-suggest-btn {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}
.ai-suggest-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.ai-suggest-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.auto-map-reasoning {
  font-size: 10px;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.3;
}
</style>
