<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { nanoid } from 'nanoid'
import { useModelStore } from '@/stores/model-store'
import { generateSlotLabel } from '@/utils/slot-labels'
import type { ComparisonSlot } from '@/types/comparison'

const modelStore = useModelStore()

const slots = defineModel<ComparisonSlot[]>('slots', { default: () => [] })

// Local reactive state — not a defineModel (Set is not reactive through v-model)
const expandedSlots = ref<Record<string, boolean>>({})

function addSlot() {
  if (slots.value.length >= 4) return
  const firstModel = modelStore.chatModelNames[0] ?? ''
  const slot: ComparisonSlot = {
    slotId: nanoid(),
    model: firstModel,
    label: '',
    system: '',
    options: { temperature: 0.7 },
  }
  const next = [...slots.value, slot]
  slots.value = assignLabels(next)
}

function removeSlot(slotId: string) {
  delete expandedSlots.value[slotId]
  const next = slots.value.filter((s) => s.slotId !== slotId)
  slots.value = assignLabels(next)
}

function clearAll() {
  expandedSlots.value = {}
  slots.value = []
}

function updateSlot(slotId: string, patch: Partial<ComparisonSlot>) {
  const next = slots.value.map((s) =>
    s.slotId === slotId ? { ...s, ...patch } : s,
  )
  slots.value = assignLabels(next)
}

function updateSlotOptions(slotId: string, optPatch: Record<string, unknown>) {
  const next = slots.value.map((s) =>
    s.slotId === slotId ? { ...s, options: { ...s.options, ...optPatch } } : s,
  )
  slots.value = assignLabels(next)
}

function assignLabels(list: ComparisonSlot[]): ComparisonSlot[] {
  return list.map((s) => ({
    ...s,
    label: generateSlotLabel(s, list),
  }))
}

function toggleExpanded(slotId: string) {
  expandedSlots.value[slotId] = !expandedSlots.value[slotId]
}

function applyPreset(preset: 'temp-sweep' | 'deterministic-pair') {
  const model = modelStore.chatModelNames[0] ?? ''
  if (!model) return

  let next: ComparisonSlot[]
  if (preset === 'temp-sweep') {
    next = [0.2, 0.7, 1.2].map((t) => ({
      slotId: nanoid(),
      model,
      label: '',
      system: '',
      options: { temperature: t },
    }))
  } else {
    const seed = Math.floor(Math.random() * 100000)
    next = [0.3, 1.0].map((t) => ({
      slotId: nanoid(),
      model,
      label: '',
      system: '',
      options: { temperature: t, seed },
    }))
  }
  slots.value = assignLabels(next)
}

function settingsSummary(slot: ComparisonSlot): string {
  const parts: string[] = []
  const t = slot.options.temperature
  if (t != null) parts.push(`temp ${t.toFixed(2)}`)
  if (slot.options.top_p != null) parts.push(`top_p ${slot.options.top_p}`)
  if (slot.options.seed != null) parts.push(`seed ${slot.options.seed}`)
  if (slot.system) parts.push('system prompt')
  return parts.join(', ') || 'defaults'
}

onMounted(async () => {
  if (modelStore.models.length === 0) {
    await modelStore.fetchModels()
  }
})
</script>

<template>
  <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium text-text-primary">Comparison Slots</h3>
        <p class="text-[11px] text-text-muted mt-0.5">
          Each slot is a model + settings combination. Add the same model multiple times with different settings to compare behavior.
        </p>
      </div>
      <button
        v-if="slots.length > 0"
        class="rounded-md border border-border-default px-2.5 py-1 text-[11px] text-text-muted hover:border-error hover:text-error transition-colors shrink-0 self-start"
        @click="clearAll"
      >
        Clear All
      </button>
    </div>

    <!-- Quick presets -->
    <div class="flex items-center gap-2">
      <span class="text-[11px] text-text-muted">Quick start:</span>
      <button
        class="rounded-md border border-border-default px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
        title="Add 3 slots of the same model at temp 0.2, 0.7, 1.2"
        @click="applyPreset('temp-sweep')"
      >
        Temperature Sweep
      </button>
      <button
        class="rounded-md border border-border-default px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
        title="Add 2 slots of the same model with same seed, different temps"
        @click="applyPreset('deterministic-pair')"
      >
        Deterministic Pair
      </button>
    </div>

    <!-- Slot cards -->
    <div v-for="(slot, idx) in slots" :key="slot.slotId" class="rounded-lg border border-border-default bg-surface p-3 space-y-2">
      <!-- Header row -->
      <div class="flex items-center gap-3">
        <span class="flex items-center justify-center h-5 w-5 rounded-full bg-surface-overlay text-[10px] font-bold text-text-secondary shrink-0">{{ idx + 1 }}</span>
        <select
          :value="slot.model"
          class="flex-1 rounded-lg border border-border-default bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          @change="updateSlot(slot.slotId, { model: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="name in modelStore.chatModelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <button
          class="rounded-md p-1 text-text-muted hover:text-error transition-colors"
          title="Remove slot"
          @click="removeSlot(slot.slotId)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Settings summary (always visible) -->
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          @click="toggleExpanded(slot.slotId)"
        >
          <svg
            class="h-3 w-3 transition-transform"
            :class="expandedSlots[slot.slotId] ? 'rotate-90' : ''"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5l8 7-8 7z" />
          </svg>
          Settings
        </button>
        <span class="text-[10px] text-text-muted">{{ settingsSummary(slot) }}</span>
      </div>

      <!-- Expanded settings -->
      <div v-if="expandedSlots[slot.slotId]" class="space-y-3 pt-1 border-t border-border-default/50">
        <!-- System prompt -->
        <div>
          <label class="text-[11px] text-text-muted block mb-1">System Prompt</label>
          <textarea
            :value="slot.system"
            rows="2"
            class="w-full rounded-md border border-border-default bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-none"
            placeholder="Optional system prompt..."
            @input="updateSlot(slot.slotId, { system: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>

        <!-- Temperature -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-[11px] text-text-muted">Temperature</label>
            <span class="text-[11px] text-text-primary font-medium">{{ (slot.options.temperature ?? 0.7).toFixed(1) }}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            :value="slot.options.temperature ?? 0.7"
            class="w-full"
            @input="updateSlotOptions(slot.slotId, { temperature: parseFloat(($event.target as HTMLInputElement).value) })"
          />
        </div>

        <!-- Top-P -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-[11px] text-text-muted">Top-P</label>
            <span class="text-[11px] text-text-primary font-medium">{{ (slot.options.top_p ?? 0.9).toFixed(2) }}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="slot.options.top_p ?? 0.9"
            class="w-full"
            @input="updateSlotOptions(slot.slotId, { top_p: parseFloat(($event.target as HTMLInputElement).value) })"
          />
        </div>

        <!-- Seed -->
        <div>
          <label class="text-[11px] text-text-muted block mb-1">Seed</label>
          <input
            type="number"
            :value="slot.options.seed ?? ''"
            class="w-full rounded-md border border-border-default bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
            placeholder="Random (leave empty)"
            @input="updateSlotOptions(slot.slotId, { seed: ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : undefined })"
          />
        </div>

        <!-- Advanced (collapsible) -->
        <details class="text-[11px]">
          <summary class="text-text-muted cursor-pointer hover:text-text-secondary">Advanced</summary>
          <div class="mt-2 space-y-2">
            <div class="flex items-center gap-2">
              <label class="text-text-muted w-24 shrink-0">Top-K</label>
              <input
                type="number"
                :value="slot.options.top_k ?? ''"
                class="flex-1 rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                placeholder="40"
                @input="updateSlotOptions(slot.slotId, { top_k: ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : undefined })"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-text-muted w-24 shrink-0">Repeat Penalty</label>
              <input
                type="number"
                step="0.1"
                :value="slot.options.repeat_penalty ?? ''"
                class="flex-1 rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                placeholder="1.1"
                @input="updateSlotOptions(slot.slotId, { repeat_penalty: ($event.target as HTMLInputElement).value ? parseFloat(($event.target as HTMLInputElement).value) : undefined })"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-text-muted w-24 shrink-0">Mirostat</label>
              <select
                :value="slot.options.mirostat ?? 0"
                class="flex-1 rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                @change="updateSlotOptions(slot.slotId, { mirostat: parseInt(($event.target as HTMLSelectElement).value, 10) || undefined })"
              >
                <option :value="0">Off</option>
                <option :value="1">Mirostat 1</option>
                <option :value="2">Mirostat 2</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-text-muted w-24 shrink-0">Max Tokens</label>
              <input
                type="number"
                :value="slot.options.num_predict ?? ''"
                class="flex-1 rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                placeholder="Default"
                @input="updateSlotOptions(slot.slotId, { num_predict: ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : undefined })"
              />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-text-muted w-24 shrink-0">Context Length</label>
              <input
                type="number"
                :value="slot.options.num_ctx ?? ''"
                class="flex-1 rounded-md border border-border-default bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                placeholder="Default"
                @input="updateSlotOptions(slot.slotId, { num_ctx: ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : undefined })"
              />
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="slots.length === 0" class="rounded-lg border border-dashed border-border-default py-8 text-center space-y-3">
      <p class="text-sm text-text-secondary">No slots configured yet</p>
      <p class="text-xs text-text-muted max-w-sm mx-auto">
        Add a slot to pick a model and settings, or use a quick-start preset above to get going.
      </p>
      <button
        class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent-hover transition-colors"
        @click="addSlot"
      >
        + Add First Slot
      </button>
    </div>

    <!-- Add more button (when slots exist but < 4) -->
    <button
      v-else-if="slots.length < 4"
      class="w-full rounded-lg border border-dashed border-border-default py-2.5 text-sm text-text-muted hover:border-accent hover:text-text-primary transition-colors"
      @click="addSlot"
    >
      + Add Slot ({{ slots.length }}/4)
    </button>
  </div>
</template>
