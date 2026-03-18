<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { nanoid } from 'nanoid'
import { Pencil, Trash2, Plus, Download, X, Sparkles, Square, CheckSquare } from 'lucide-vue-next'
import type { BenchmarkQuestion, BenchmarkSuite } from '@/types/benchmark'
import QuestionEditor from './QuestionEditor.vue'
import { useModelStore } from '@/stores/model-store'
import { buildGenerationPrompt, parseGeneratedQuestions } from '@/utils/benchmark-generator'
import type { GenerateOptions } from '@/utils/benchmark-generator'

const props = defineProps<{
  editSuite?: BenchmarkSuite
}>()

const emit = defineEmits<{
  close: []
  saved: [suite: BenchmarkSuite]
}>()

const { t } = useI18n()
const modelStore = useModelStore()

const suiteName = ref('')
const suiteDescription = ref('')
const defaultCategory = ref('custom')
const questions = ref<BenchmarkQuestion[]>([])
const editingIndex = ref<number | null>(null) // null = not editing, -1 = adding new

// AI generation state
const aiTopic = ref('')
const aiCount = ref(10)
const aiDifficulty = ref<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')
const aiModel = ref('')
const isGenerating = ref(false)
const generationProgress = ref('')
const generationThinking = ref('')
const generatedPreview = ref<BenchmarkQuestion[]>([])
const selectedGenerated = ref<Set<number>>(new Set())
const generationErrors = ref<string[]>([])
const abortController = ref<AbortController | null>(null)

onMounted(() => {
  aiModel.value = modelStore.chatModelNames[0] ?? ''
})

// Pre-populate from editSuite
watch(
  () => props.editSuite,
  (suite) => {
    if (suite) {
      suiteName.value = suite.name
      suiteDescription.value = suite.description
      questions.value = suite.questions.map((q) => ({ ...q }))
      // Infer default category from first question
      if (suite.questions.length > 0 && suite.questions[0]) {
        defaultCategory.value = suite.questions[0].category
      }
    }
  },
  { immediate: true },
)

const dialogTitle = computed(() =>
  props.editSuite ? t('benchmark.builder.editTitle') : t('benchmark.builder.createTitle'),
)

const canSave = computed(() => suiteName.value.trim().length > 0 && questions.value.length > 0)

const canGenerate = computed(
  () => aiTopic.value.trim().length > 0 && aiModel.value.length > 0 && !isGenerating.value,
)

const selectedCount = computed(() => selectedGenerated.value.size)

function startAddQuestion() {
  editingIndex.value = -1
}

function startEditQuestion(index: number) {
  editingIndex.value = index
}

function onQuestionSave(question: BenchmarkQuestion) {
  if (editingIndex.value === -1) {
    // Adding new
    questions.value.push(question)
  } else if (editingIndex.value !== null && editingIndex.value >= 0) {
    // Editing existing
    questions.value.splice(editingIndex.value, 1, question)
  }
  editingIndex.value = null
}

function onQuestionCancel() {
  editingIndex.value = null
}

function deleteQuestion(index: number) {
  questions.value.splice(index, 1)
  if (editingIndex.value === index) {
    editingIndex.value = null
  } else if (editingIndex.value !== null && editingIndex.value > index) {
    editingIndex.value--
  }
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// AI generation
async function generateQuestions() {
  if (!canGenerate.value) return

  isGenerating.value = true
  generationProgress.value = ''
  generationThinking.value = ''
  generatedPreview.value = []
  selectedGenerated.value = new Set()
  generationErrors.value = []

  const controller = new AbortController()
  abortController.value = controller

  const options: GenerateOptions = {
    topic: aiTopic.value.trim(),
    count: aiCount.value,
    difficulty: aiDifficulty.value,
    model: aiModel.value,
    category: defaultCategory.value,
  }

  const prompt = buildGenerationPrompt(options)

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: options.model, prompt, stream: true }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let inThinking = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n').filter(Boolean)) {
        const json = JSON.parse(line)
        if (json.response) {
          fullText += json.response

          // Parse <think> blocks
          if (fullText.includes('<think>') && !fullText.includes('</think>')) {
            inThinking = true
            generationThinking.value = fullText.split('<think>').pop() ?? ''
          } else if (inThinking && fullText.includes('</think>')) {
            inThinking = false
            generationThinking.value = ''
            const afterThink = fullText.split('</think>').pop()?.trim() ?? ''
            generationProgress.value = afterThink
          } else if (!inThinking) {
            const clean = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
            generationProgress.value = clean
          }
        }
      }
    }

    // Parse final result
    const category = defaultCategory.value || options.topic.toLowerCase().replace(/\s+/g, '_')
    const { questions: parsed, errors } = parseGeneratedQuestions(fullText, category)

    generatedPreview.value = parsed
    generationErrors.value = errors

    // Select all by default
    selectedGenerated.value = new Set(parsed.map((_, i) => i))

    if (parsed.length === 0 && errors.length === 0) {
      generationErrors.value = [t('benchmark.builder.aiGenerate.noResults')]
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      // User cancelled
    } else {
      generationErrors.value = [(e as Error).message]
    }
  } finally {
    isGenerating.value = false
    abortController.value = null
  }
}

function cancelGeneration() {
  abortController.value?.abort()
}

function toggleSelected(index: number) {
  const s = new Set(selectedGenerated.value)
  if (s.has(index)) {
    s.delete(index)
  } else {
    s.add(index)
  }
  selectedGenerated.value = s
}

function selectAll() {
  selectedGenerated.value = new Set(generatedPreview.value.map((_, i) => i))
}

function deselectAll() {
  selectedGenerated.value = new Set()
}

function addSelectedQuestions() {
  const baseIndex = questions.value.length
  const toAdd = generatedPreview.value
    .filter((_, i) => selectedGenerated.value.has(i))
    .map((q, i) => ({
      ...q,
      id: `gen_${nanoid(6)}_${baseIndex + i}`,
    }))
  questions.value.push(...toAdd)
  // Clear preview
  generatedPreview.value = []
  selectedGenerated.value = new Set()
  generationProgress.value = ''
  generationErrors.value = []
}

function saveSuite() {
  if (!canSave.value) return
  const suite: BenchmarkSuite = {
    id: props.editSuite?.id ?? `custom_${nanoid(8)}`,
    name: suiteName.value.trim(),
    description: suiteDescription.value.trim(),
    builtIn: false,
    questions: questions.value.map((q, i) => ({
      ...q,
      id: q.id || `${suiteName.value.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
    })),
  }
  emit('saved', suite)
}

function downloadJson() {
  const suite = {
    name: suiteName.value.trim(),
    description: suiteDescription.value.trim(),
    builtIn: false,
    questions: questions.value.map((q, i) => ({
      ...q,
      id: q.id || `${suiteName.value.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
    })),
  }
  const blob = new Blob([JSON.stringify(suite, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${suiteName.value.trim().replace(/\s+/g, '-').toLowerCase() || 'benchmark-suite'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('close')">
      <div class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border-default bg-surface-raised shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
          <h3 class="text-sm font-medium text-text-primary">{{ dialogTitle }}</h3>
          <button
            class="text-text-muted hover:text-text-primary transition-colors"
            @click="$emit('close')"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <!-- Suite Name -->
          <div>
            <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.suiteName') }}</label>
            <input
              v-model="suiteName"
              type="text"
              class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              :placeholder="$t('benchmark.builder.suiteNamePlaceholder')"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.description') }}</label>
            <input
              v-model="suiteDescription"
              type="text"
              class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              :placeholder="$t('benchmark.builder.descriptionPlaceholder')"
            />
          </div>

          <!-- Default Category -->
          <div>
            <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.defaultCategory') }}</label>
            <input
              v-model="defaultCategory"
              type="text"
              class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="custom"
            />
          </div>

          <!-- AI Generate (collapsible) -->
          <details class="rounded-lg border border-accent/20 bg-accent/5">
            <summary class="flex items-center gap-2 px-4 py-3 text-sm font-medium text-accent cursor-pointer select-none">
              <Sparkles :size="14" />
              {{ $t('benchmark.builder.aiGenerate.title') }}
            </summary>
            <div class="px-4 pb-4 space-y-3">
              <!-- Topic -->
              <div>
                <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.aiGenerate.topic') }}</label>
                <input
                  v-model="aiTopic"
                  type="text"
                  class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  :placeholder="$t('benchmark.builder.aiGenerate.topicPlaceholder')"
                />
              </div>

              <!-- Count + Difficulty row -->
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.aiGenerate.count') }}</label>
                  <input
                    v-model.number="aiCount"
                    type="number"
                    min="5"
                    max="50"
                    class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.aiGenerate.difficulty') }}</label>
                  <select
                    v-model="aiDifficulty"
                    class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                  >
                    <option value="mixed">{{ $t('benchmark.builder.aiGenerate.mixed') }}</option>
                    <option value="easy">{{ $t('benchmark.builder.easy') }}</option>
                    <option value="medium">{{ $t('benchmark.builder.medium') }}</option>
                    <option value="hard">{{ $t('benchmark.builder.hard') }}</option>
                  </select>
                </div>
              </div>

              <!-- Model -->
              <div>
                <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.aiGenerate.model') }}</label>
                <select
                  v-model="aiModel"
                  class="w-full rounded-md border border-border-default bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option v-for="m in modelStore.chatModelNames" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>

              <!-- Generate / Cancel button -->
              <div class="flex gap-2">
                <button
                  v-if="!isGenerating"
                  :disabled="!canGenerate"
                  class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="
                    canGenerate
                      ? 'bg-accent text-surface hover:bg-accent-hover cursor-pointer'
                      : 'bg-surface-overlay text-text-muted cursor-not-allowed'
                  "
                  @click="generateQuestions"
                >
                  <Sparkles :size="12" />
                  {{ $t('benchmark.builder.aiGenerate.generate') }}
                </button>
                <button
                  v-else
                  class="inline-flex items-center gap-1.5 rounded-md border border-error/50 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
                  @click="cancelGeneration"
                >
                  <X :size="12" />
                  {{ $t('benchmark.builder.aiGenerate.cancel') }}
                </button>
              </div>

              <!-- Thinking display -->
              <div
                v-if="isGenerating && generationThinking"
                class="rounded-md bg-surface px-2.5 py-2 text-xs text-text-muted italic border border-warning/30 max-h-24 overflow-y-auto"
              >
                <span class="text-[10px] text-warning font-medium not-italic">Thinking...</span>
                <p class="mt-1 whitespace-pre-wrap">{{ generationThinking }}</p>
              </div>

              <!-- Generation progress -->
              <div
                v-if="isGenerating && generationProgress && !generationThinking"
                class="rounded-md bg-surface px-2.5 py-2 text-xs text-text-secondary border border-accent/20 max-h-32 overflow-y-auto font-mono"
              >
                {{ generationProgress.slice(0, 500) }}{{ generationProgress.length > 500 ? '...' : '' }}
              </div>

              <!-- Waiting indicator -->
              <div
                v-if="isGenerating && !generationThinking && !generationProgress"
                class="flex items-center gap-2 rounded-md bg-surface px-2.5 py-3 text-xs text-text-muted border border-border-default/50"
              >
                <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                {{ $t('benchmark.builder.aiGenerate.generating') }}
              </div>

              <!-- Generated preview -->
              <div v-if="generatedPreview.length > 0" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-text-primary">
                    {{ $t('benchmark.builder.aiGenerate.preview') }}
                    <span class="ml-1 text-text-muted">({{ generatedPreview.length }})</span>
                  </span>
                  <div class="flex gap-2">
                    <button
                      class="text-[10px] text-accent hover:underline"
                      @click="selectAll"
                    >
                      {{ $t('benchmark.builder.aiGenerate.selectAll') }}
                    </button>
                    <button
                      class="text-[10px] text-text-muted hover:underline"
                      @click="deselectAll"
                    >
                      {{ $t('benchmark.builder.aiGenerate.deselectAll') }}
                    </button>
                  </div>
                </div>

                <div class="max-h-48 overflow-y-auto space-y-1">
                  <div
                    v-for="(q, idx) in generatedPreview"
                    :key="idx"
                    class="flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors"
                    :class="
                      selectedGenerated.has(idx)
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border-default hover:border-accent/20'
                    "
                    @click="toggleSelected(idx)"
                  >
                    <component
                      :is="selectedGenerated.has(idx) ? CheckSquare : Square"
                      :size="14"
                      class="mt-0.5 shrink-0"
                      :class="selectedGenerated.has(idx) ? 'text-accent' : 'text-text-muted'"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-text-primary truncate">{{ q.question }}</p>
                      <p class="text-[10px] text-text-muted mt-0.5">
                        {{ q.choices.length }} choices — {{ $t('benchmark.builder.correctAnswer') }}: {{ q.correctAnswer }}
                        <span v-if="q.difficulty" class="ml-1 text-accent/70">{{ q.difficulty }}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Add Selected button -->
                <button
                  :disabled="selectedCount === 0"
                  class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="
                    selectedCount > 0
                      ? 'bg-accent text-surface hover:bg-accent-hover cursor-pointer'
                      : 'bg-surface-overlay text-text-muted cursor-not-allowed'
                  "
                  @click="addSelectedQuestions"
                >
                  <Plus :size="12" />
                  {{ $t('benchmark.builder.aiGenerate.addSelected') }} ({{ selectedCount }})
                </button>
              </div>

              <!-- Errors -->
              <div v-if="generationErrors.length > 0" class="rounded-md border border-error/30 bg-error/5 px-3 py-2">
                <p class="text-[10px] font-medium text-error mb-1">{{ $t('benchmark.builder.aiGenerate.errors') }}</p>
                <ul class="space-y-0.5">
                  <li v-for="(err, i) in generationErrors" :key="i" class="text-[10px] text-error/80">{{ err }}</li>
                </ul>
              </div>
            </div>
          </details>

          <!-- Divider -->
          <div class="border-t border-border-default" />

          <!-- Questions header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-text-primary">{{ $t('benchmark.builder.questions') }}</span>
              <span
                v-if="questions.length > 0"
                class="inline-flex items-center justify-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
              >
                {{ questions.length }}
              </span>
            </div>
            <button
              v-if="editingIndex === null"
              class="inline-flex items-center gap-1 rounded-md border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
              @click="startAddQuestion"
            >
              <Plus :size="12" />
              {{ $t('benchmark.builder.addQuestion') }}
            </button>
          </div>

          <!-- Question Editor (inline) -->
          <QuestionEditor
            v-if="editingIndex !== null"
            :question="editingIndex >= 0 ? questions[editingIndex] : undefined"
            :default-category="defaultCategory"
            @save="onQuestionSave"
            @cancel="onQuestionCancel"
          />

          <!-- Question List -->
          <div v-if="editingIndex === null" class="max-h-64 overflow-y-auto">
            <div v-if="questions.length === 0" class="rounded-lg border border-dashed border-border-default px-4 py-8 text-center">
              <p class="text-xs text-text-muted">{{ $t('benchmark.builder.noQuestions') }}</p>
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="(q, index) in questions"
                :key="index"
                class="flex items-center gap-3 rounded-md border border-border-default px-3 py-2 hover:border-accent/30 transition-colors"
              >
                <span class="w-5 text-xs font-medium text-text-muted">{{ index + 1 }}</span>
                <span class="flex-1 truncate text-xs text-text-primary">{{ truncate(q.question, 60) }}</span>
                <span class="rounded-full bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-muted">
                  {{ $t('benchmark.builder.choiceCount', { count: q.choices.length }) }}
                </span>
                <span class="w-5 text-center text-xs font-medium text-green-500">{{ q.correctAnswer }}</span>
                <button
                  class="text-text-muted hover:text-text-primary transition-colors"
                  @click="startEditQuestion(index)"
                >
                  <Pencil :size="13" />
                </button>
                <button
                  class="text-text-muted hover:text-error transition-colors"
                  @click="deleteQuestion(index)"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-border-default px-6 py-4">
          <button
            class="inline-flex items-center gap-1 rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
            @click="downloadJson"
          >
            <Download :size="13" />
            JSON
          </button>
          <div class="flex gap-2">
            <button
              class="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              @click="$emit('close')"
            >
              {{ $t('common.actions.cancel') }}
            </button>
            <button
              :disabled="!canSave"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                canSave
                  ? 'bg-accent text-surface hover:bg-accent-hover cursor-pointer'
                  : 'bg-surface-overlay text-text-muted cursor-not-allowed'
              "
              @click="saveSuite"
            >
              {{ $t('benchmark.builder.saveSuite') }} ({{ questions.length }})
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
