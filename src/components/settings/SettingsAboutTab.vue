<script setup lang="ts">
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl font-bold text-accent">xR</span>
        <div>
          <h3 class="text-sm font-semibold text-text-primary">LLMxRay</h3>
          <p class="text-xs text-text-muted">Local LLM Observatory</p>
        </div>
      </div>

      <div class="grid grid-cols-[auto_1fr] gap-y-2 gap-x-4 text-xs">
        <span class="text-text-muted">Version</span>
        <span class="text-text-primary">1.0.0</span>
        <span class="text-text-muted">License</span>
        <span class="text-text-primary">Apache 2.0</span>
        <span class="text-text-muted">Repository</span>
        <a
          href="https://github.com/LogneBudo/llmxray"
          target="_blank"
          rel="noopener"
          class="text-accent hover:underline"
        >
          github.com/LogneBudo/llmxray
        </a>
      </div>
    </div>

    <div class="rounded-lg border border-border-default bg-surface-raised p-5 space-y-3">
      <h3 class="text-sm font-medium text-text-primary">Tech Stack</h3>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">Vue 3.5</p>
          <p class="text-[10px] text-text-muted">Composition API + TypeScript</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">Vite 7</p>
          <p class="text-[10px] text-text-muted">Build tooling + dev server</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">Tailwind CSS 4</p>
          <p class="text-[10px] text-text-muted">Utility-first styling</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">Pinia 3</p>
          <p class="text-[10px] text-text-muted">State management</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">Ollama</p>
          <p class="text-[10px] text-text-muted">Local LLM runtime</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">IndexedDB</p>
          <p class="text-[10px] text-text-muted">Browser-native persistence</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">D3.js + Chart.js</p>
          <p class="text-[10px] text-text-muted">Data visualization</p>
        </div>
        <div class="rounded-lg bg-surface p-2.5">
          <p class="font-medium text-text-primary">pdfjs + mammoth</p>
          <p class="text-[10px] text-text-muted">Document parsing</p>
        </div>
      </div>
    </div>
  </div>
</template>
