<script setup lang="ts">
import { ref } from 'vue'
import { useGoogleAuthStore } from '@/stores/google-auth-store'

const googleAuth = useGoogleAuthStore()
const googleClientIdInput = ref(googleAuth.clientId)
const showSetupGuide = ref(false)

function saveGoogleClientId() {
  googleAuth.updateClientId(googleClientIdInput.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-border-default bg-surface-raised p-4 space-y-4">
      <h3 class="text-sm font-medium text-text-primary">Google Integration</h3>
      <p class="text-[10px] text-text-muted">Connect your Google account to enable Calendar and Gmail tools in the Tool Workshop.</p>

      <div>
        <label class="block text-xs text-text-secondary mb-1">OAuth2 Client ID</label>
        <div class="flex gap-3">
          <input
            v-model="googleClientIdInput"
            class="flex-1 rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none font-mono"
            placeholder="123456789-abcdef.apps.googleusercontent.com"
          />
          <button
            class="rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-primary hover:bg-border-default transition-colors"
            @click="saveGoogleClientId"
          >
            Save
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="{
            'bg-success': googleAuth.connected,
            'bg-error': !googleAuth.connected && !googleAuth.isAuthenticating,
            'bg-warning animate-pulse': googleAuth.isAuthenticating,
          }"
        />
        <span class="text-text-secondary">
          <template v-if="googleAuth.isAuthenticating">Authenticating...</template>
          <template v-else-if="googleAuth.connected">Connected as <span class="text-text-primary font-medium">{{ googleAuth.userEmail ?? 'unknown' }}</span></template>
          <template v-else>Not connected</template>
        </span>
      </div>

      <p v-if="googleAuth.error" class="text-xs text-error">{{ googleAuth.error }}</p>

      <div class="flex gap-3">
        <button
          v-if="!googleAuth.connected"
          class="rounded-lg bg-accent px-4 py-2 text-sm text-surface hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!googleAuth.clientId || googleAuth.isAuthenticating"
          @click="googleAuth.connect()"
        >
          Connect Google Account
        </button>
        <button
          v-if="googleAuth.connected"
          class="rounded-lg border border-error/30 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
          @click="googleAuth.disconnect()"
        >
          Disconnect
        </button>
      </div>

      <div class="border-t border-border-default pt-3">
        <button
          class="text-xs text-accent hover:text-accent-hover transition-colors"
          @click="showSetupGuide = !showSetupGuide"
        >
          {{ showSetupGuide ? 'Hide' : 'Show' }} setup instructions
        </button>

        <div v-if="showSetupGuide" class="mt-3 space-y-2 text-xs text-text-secondary">
          <p class="font-medium text-text-primary">One-time setup (5 minutes):</p>
          <ol class="list-decimal list-inside space-y-2 ml-1">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" class="text-accent hover:underline">Google Cloud Console</a> and create a new project</li>
            <li>Enable the <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener" class="text-accent hover:underline">Google Calendar API</a></li>
            <li>Enable the <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener" class="text-accent hover:underline">Gmail API</a></li>
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener" class="text-accent hover:underline">OAuth consent screen</a>, set up as <strong>External</strong>, add your email as a <strong>test user</strong></li>
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="text-accent hover:underline">Credentials</a>, click <strong>+ Create Credentials</strong> &rarr; <strong>OAuth 2.0 Client ID</strong></li>
            <li>Set application type to <strong>Web application</strong></li>
            <li>Add <strong>Authorized JavaScript origins</strong>: <code class="bg-surface rounded px-1.5 py-0.5 text-[11px] font-mono text-text-primary">http://localhost:5173</code></li>
            <li>Add <strong>Authorized redirect URIs</strong>: <code class="bg-surface rounded px-1.5 py-0.5 text-[11px] font-mono text-text-primary">http://localhost:5173/auth/google/callback</code></li>
            <li>Copy the <strong>Client ID</strong> and paste it above, then click Save</li>
            <li>Click <strong>Connect Google Account</strong> above</li>
          </ol>
          <div class="mt-3 rounded-lg bg-surface-overlay p-3 text-[11px]">
            <p class="font-medium text-text-primary mb-1">Note: "App not verified" warning</p>
            <p>Google will show a warning because your app is in testing mode. Click <strong>Advanced</strong> &rarr; <strong>Go to [your project name] (unsafe)</strong> to proceed.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
