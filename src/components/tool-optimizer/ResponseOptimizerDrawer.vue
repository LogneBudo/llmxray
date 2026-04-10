<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import type { ToolCallEntry } from '@/types/toolcall'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import { optimizeToolCode } from '@/services/optimize-tool-code'
import { generateMappings } from '@/services/path-to-code'
import JsonTreeNode from './JsonTreeNode.vue'

const props = defineProps<{
  entry: ToolCallEntry
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const workshopStore = useToolWorkshopStore()

const selectedPaths = ref<Set<string>>(new Set())
const toolName = ref(`${props.entry.functionName}_optimized`)
const toolDescription = ref('')
const editableCode = ref('')
const userEdited = ref(false)
const created = ref(false)
const createdToolId = ref<string | null>(null)

const originalTool = computed(() =>
  workshopStore.findByFunctionName(props.entry.functionName),
)

const originalCode = computed(() => originalTool.value?.implementation.code ?? '')

const pathsArray = computed(() => Array.from(selectedPaths.value))

// Auto-generate description from selected paths
watch(pathsArray, (paths) => {
  if (paths.length > 0) {
    const fields = paths.map(p => p.split('.').pop() ?? p).join(', ')
    toolDescription.value = `Optimized ${props.entry.functionName} returning only: ${fields}`
  } else {
    toolDescription.value = ''
  }
})

// Auto-generate code when paths change (unless user has manually edited)
watch(pathsArray, (paths) => {
  if (!userEdited.value) {
    editableCode.value = generateCode(paths)
  }
})

function generateCode(paths: string[]): string {
  if (paths.length === 0) return originalCode.value
  if (originalCode.value) {
    return optimizeToolCode(originalCode.value, paths)
  }
  // No original code — generate a standalone filter
  const mappings = generateMappings(paths)
  const lines = mappings.map(m => `    ${m.returnKey}: args.${m.jsonPath}`)
  return `  // No original code found — filtering raw result\n  const fullResult = await args\n  return {\n${lines.join(',\n')}\n  }`
}

function togglePath(path: string) {
  const next = new Set(selectedPaths.value)
  if (next.has(path)) {
    next.delete(path)
  } else {
    next.add(path)
  }
  selectedPaths.value = next
}

function removePath(path: string) {
  const next = new Set(selectedPaths.value)
  next.delete(path)
  selectedPaths.value = next
}

function onCodeInput(e: Event) {
  editableCode.value = (e.target as HTMLTextAreaElement).value
  userEdited.value = true
}

function regenerateCode() {
  editableCode.value = generateCode(pathsArray.value)
  userEdited.value = false
}

function createOptimizedTool() {
  const original = originalTool.value
  const definition = original
    ? JSON.parse(JSON.stringify(original.definition))
    : {
        type: 'function' as const,
        function: {
          name: toolName.value,
          description: toolDescription.value,
          parameters: { type: 'object', properties: {}, required: [] },
        },
      }

  definition.function.name = toolName.value
  definition.function.description = toolDescription.value

  const id = workshopStore.addTool({
    definition,
    implementation: {
      mode: 'code',
      blocks: [],
      code: editableCode.value,
    },
    category: original?.category ?? 'custom',
    optimizedFrom: {
      originalToolName: props.entry.functionName,
      selectedPaths: pathsArray.value,
      sampleResponse: props.entry.result,
    },
  } as any)

  createdToolId.value = id
  created.value = true
}

function goToWorkshop() {
  if (createdToolId.value) {
    workshopStore.selectTool(createdToolId.value)
  }
  router.push('/tools')
  emit('close')
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex justify-end" @click.self="close">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50" @click="close" />

      <!-- Drawer panel -->
      <div
        class="relative flex h-full w-full max-w-2xl flex-col border-s border-border-default bg-bg-base shadow-xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border-default px-5 py-4">
          <h3 class="text-base font-semibold text-text-primary">
            Optimize: {{ entry.functionName }}
          </h3>
          <button
            class="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary transition-colors"
            @click="close"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Success state -->
        <template v-if="created">
          <div class="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div class="text-4xl">&#10003;</div>
            <p class="text-lg font-medium text-text-primary">Tool created successfully</p>
            <p class="text-sm text-text-secondary">
              <span class="font-mono text-accent">{{ toolName }}</span> has been added to your workshop.
            </p>
            <div class="mt-4 flex gap-3">
              <button
                class="rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-surface-overlay transition-colors"
                @click="close"
              >
                Stay Here
              </button>
              <button
                class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                @click="goToWorkshop"
              >
                Go to Workshop
              </button>
            </div>
          </div>
        </template>

        <!-- Editor state -->
        <template v-else>
          <div class="flex-1 overflow-y-auto">
            <!-- Response tree + Selected fields -->
            <div class="grid grid-cols-3 gap-0 border-b border-border-default">
              <!-- JSON Tree (2/3 width) -->
              <div class="col-span-2 border-e border-border-default p-4">
                <div class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Response (click fields to select)
                </div>
                <div class="max-h-64 overflow-auto rounded-lg border border-border-default bg-surface-raised p-3">
                  <JsonTreeNode
                    label="result"
                    :value="entry.result"
                    path=""
                    :selected-paths="selectedPaths"
                    @toggle-path="togglePath"
                  />
                </div>
              </div>

              <!-- Selected paths (1/3 width) -->
              <div class="p-4">
                <div class="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Selected ({{ selectedPaths.size }})
                </div>
                <div v-if="selectedPaths.size === 0" class="text-xs text-text-muted italic">
                  Click fields in the tree to select them
                </div>
                <div v-else class="space-y-1">
                  <div
                    v-for="path in pathsArray"
                    :key="path"
                    class="flex items-center justify-between rounded px-2 py-1 text-xs font-mono bg-surface-raised"
                  >
                    <span class="truncate text-text-secondary" :title="path">{{ path }}</span>
                    <button
                      class="ms-2 flex-shrink-0 text-text-muted hover:text-error transition-colors"
                      aria-label="Remove path"
                      @click="removePath(path)"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Editable code preview -->
            <div class="border-b border-border-default p-4">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Code (editable)
                </span>
                <button
                  v-if="userEdited"
                  class="rounded px-2 py-0.5 text-xs text-accent hover:bg-surface-overlay transition-colors"
                  @click="regenerateCode"
                >
                  Regenerate
                </button>
              </div>
              <textarea
                :value="editableCode"
                @input="onCodeInput"
                class="w-full rounded-lg border border-border-default bg-surface-raised p-3 font-mono text-xs text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-y"
                rows="10"
                spellcheck="false"
                placeholder="Select fields above to generate code..."
              />
            </div>

            <!-- Tool name & description -->
            <div class="space-y-3 p-4">
              <div>
                <label class="mb-1 block text-xs font-medium text-text-muted">Tool Name</label>
                <input
                  v-model="toolName"
                  class="w-full rounded-lg border border-border-default bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-text-muted">Description</label>
                <input
                  v-model="toolDescription"
                  class="w-full rounded-lg border border-border-default bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
                  placeholder="What does this optimized tool return?"
                />
              </div>
              <div v-if="!originalTool" class="rounded-lg bg-warning/10 p-3 text-xs text-warning">
                Original tool "{{ entry.functionName }}" not found in workshop.
                The optimized tool will be created with a blank parameter schema.
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-border-default px-5 py-4">
            <button
              class="rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-surface-overlay transition-colors"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="selectedPaths.size === 0 || !toolName.trim()"
              @click="createOptimizedTool"
            >
              Create Optimized Tool
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
