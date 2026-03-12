<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGoogleAuthStore } from '@/stores/google-auth-store'

const route = useRoute()
const router = useRouter()
const store = useGoogleAuthStore()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const code = route.query.code as string | undefined
  const error = route.query.error as string | undefined

  if (error) {
    status.value = 'error'
    errorMessage.value = `Google authorization was denied: ${error}`
    return
  }

  if (!code) {
    status.value = 'error'
    errorMessage.value = 'No authorization code received from Google.'
    return
  }

  try {
    await store.handleOAuthCallback(code)
    status.value = 'success'
    // Redirect to settings after a brief pause so user sees success
    setTimeout(() => router.replace('/settings'), 1500)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
})
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <div class="rounded-xl border border-border-default bg-surface-raised p-8 shadow-lg w-[400px] text-center">
      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="inline-block h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <h3 class="text-sm font-medium text-text-primary">Connecting Google Account</h3>
        <p class="text-xs text-text-muted mt-2">Exchanging authorization code for tokens...</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="inline-flex items-center justify-center h-10 w-10 rounded-full bg-success/10 mb-4">
          <span class="text-success text-lg">&#10003;</span>
        </div>
        <h3 class="text-sm font-medium text-text-primary">Google Account Connected</h3>
        <p class="text-xs text-text-muted mt-2">
          Connected as <span class="text-text-primary font-medium">{{ store.userEmail ?? 'unknown' }}</span>
        </p>
        <p class="text-[10px] text-text-muted mt-3">Redirecting to Settings...</p>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="inline-flex items-center justify-center h-10 w-10 rounded-full bg-error/10 mb-4">
          <span class="text-error text-lg">&#10007;</span>
        </div>
        <h3 class="text-sm font-medium text-text-primary">Connection Failed</h3>
        <p class="text-xs text-error mt-2">{{ errorMessage }}</p>
        <button
          class="mt-4 rounded-lg bg-surface-overlay px-4 py-2 text-xs text-text-primary hover:bg-border-default transition-colors"
          @click="router.push('/settings')"
        >
          Back to Settings
        </button>
      </template>
    </div>
  </div>
</template>
