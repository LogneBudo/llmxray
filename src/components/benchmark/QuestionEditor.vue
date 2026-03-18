<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { BenchmarkQuestion } from '@/types/benchmark'

const props = defineProps<{
  question?: BenchmarkQuestion
  defaultCategory?: string
}>()

const emit = defineEmits<{
  save: [question: BenchmarkQuestion]
  cancel: []
}>()

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const category = ref(props.question?.category ?? props.defaultCategory ?? 'custom')
const difficulty = ref(props.question?.difficulty ?? '')
const questionText = ref(props.question?.question ?? '')
const choices = ref<string[]>(props.question?.choices?.length ? [...props.question.choices] : ['', ''])
const correctIndex = ref<number | null>(
  props.question?.correctAnswer
    ? LETTERS.indexOf(props.question.correctAnswer)
    : null,
)

// Re-initialize when question prop changes
watch(
  () => props.question,
  (q) => {
    category.value = q?.category ?? props.defaultCategory ?? 'custom'
    difficulty.value = q?.difficulty ?? ''
    questionText.value = q?.question ?? ''
    choices.value = q?.choices?.length ? [...q.choices] : ['', '']
    correctIndex.value = q?.correctAnswer ? LETTERS.indexOf(q.correctAnswer) : null
  },
)

const canAddChoice = computed(() => choices.value.length < 6)
const canRemoveChoice = computed(() => choices.value.length > 2)

const isValid = computed(() => {
  if (!questionText.value.trim()) return false
  if (choices.value.some((c) => !c.trim())) return false
  if (correctIndex.value === null || correctIndex.value < 0 || correctIndex.value >= choices.value.length) return false
  return true
})

function addChoice() {
  if (canAddChoice.value) {
    choices.value.push('')
  }
}

function removeChoice(index: number) {
  if (!canRemoveChoice.value) return
  choices.value.splice(index, 1)
  // Adjust correct index
  if (correctIndex.value !== null) {
    if (correctIndex.value === index) {
      correctIndex.value = null
    } else if (correctIndex.value > index) {
      correctIndex.value--
    }
  }
}

function save() {
  if (!isValid.value || correctIndex.value === null) return
  const q: BenchmarkQuestion = {
    id: props.question?.id ?? '',
    category: category.value.trim() || 'custom',
    difficulty: difficulty.value || '',
    question: questionText.value.trim(),
    choices: choices.value.map((c) => c.trim()),
    correctAnswer: LETTERS[correctIndex.value] ?? 'A',
  }
  emit('save', q)
}
</script>

<template>
  <div class="space-y-4 rounded-lg border border-border-default bg-surface p-4">
    <!-- Category + Difficulty row -->
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.category') }}</label>
        <input
          v-model="category"
          type="text"
          class="w-full rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          placeholder="custom"
        />
      </div>
      <div class="w-36">
        <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.difficulty') }}</label>
        <select
          v-model="difficulty"
          class="w-full rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">--</option>
          <option value="easy">{{ $t('benchmark.builder.easy') }}</option>
          <option value="medium">{{ $t('benchmark.builder.medium') }}</option>
          <option value="hard">{{ $t('benchmark.builder.hard') }}</option>
        </select>
      </div>
    </div>

    <!-- Question text -->
    <div>
      <label class="mb-1 block text-xs text-text-muted">{{ $t('benchmark.builder.questionText') }}</label>
      <textarea
        v-model="questionText"
        rows="3"
        class="w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
        :placeholder="$t('benchmark.builder.questionPlaceholder')"
      />
    </div>

    <!-- Choices -->
    <div>
      <label class="mb-2 block text-xs text-text-muted">{{ $t('benchmark.builder.choices') }}</label>
      <div class="space-y-2">
        <div
          v-for="(_choice, index) in choices"
          :key="index"
          class="flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors"
          :class="correctIndex === index ? 'border-green-500/50 bg-green-500/5' : 'border-border-default'"
        >
          <input
            type="radio"
            :name="'choice-radio'"
            :checked="correctIndex === index"
            class="h-3.5 w-3.5 accent-green-500 cursor-pointer"
            @change="correctIndex = index"
          />
          <span class="w-5 text-xs font-medium text-text-muted">{{ LETTERS[index] }}</span>
          <input
            :value="choices[index]"
            type="text"
            class="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            :placeholder="`Choice ${LETTERS[index]}...`"
            @input="choices[index] = ($event.target as HTMLInputElement).value"
          />
          <button
            :disabled="!canRemoveChoice"
            class="text-text-muted transition-colors"
            :class="canRemoveChoice ? 'hover:text-error cursor-pointer' : 'opacity-30 cursor-not-allowed'"
            @click="removeChoice(index)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
      <button
        :disabled="!canAddChoice"
        class="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-xs transition-colors"
        :class="canAddChoice ? 'border-border-default text-text-secondary hover:border-accent hover:text-text-primary cursor-pointer' : 'border-border-default text-text-muted cursor-not-allowed'"
        @click="addChoice"
      >
        <Plus :size="12" />
        {{ $t('benchmark.builder.addChoice') }}
      </button>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 border-t border-border-default pt-3">
      <button
        class="rounded-md border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        @click="$emit('cancel')"
      >
        {{ $t('common.actions.cancel') }}
      </button>
      <button
        :disabled="!isValid"
        class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="
          isValid
            ? 'bg-accent text-surface hover:bg-accent-hover cursor-pointer'
            : 'bg-surface-overlay text-text-muted cursor-not-allowed'
        "
        @click="save"
      >
        {{ question ? $t('benchmark.builder.editQuestion') : $t('benchmark.builder.addQuestion') }}
      </button>
    </div>
  </div>
</template>
