import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getClientId,
  setClientId as setClientIdService,
  isConnected as isConnectedService,
  getCachedEmail,
  getStoredTokens,
  startGoogleAuth,
  handleCallback,
  getAccessToken,
  getUserEmail,
  clearTokens,
} from '@/services/google-auth'

export const useGoogleAuthStore = defineStore('google-auth', () => {
  const connected = ref(false)
  const userEmail = ref<string | null>(null)
  const tokenExpiresAt = ref<number | null>(null)
  const isAuthenticating = ref(false)
  const clientId = ref('')
  const error = ref<string | null>(null)

  // --- Hydrate from localStorage on creation ---

  function loadState() {
    clientId.value = getClientId() ?? ''
    connected.value = isConnectedService()
    userEmail.value = getCachedEmail()
    const tokens = getStoredTokens()
    tokenExpiresAt.value = tokens?.expires_at ?? null
  }

  loadState()

  // --- Actions ---

  function updateClientId(id: string) {
    setClientIdService(id)
    clientId.value = id.trim()
  }

  async function connect() {
    if (!clientId.value) {
      error.value = 'Please enter a Google Client ID first.'
      return
    }
    error.value = null
    await startGoogleAuth()
    // Page will redirect — no further code runs
  }

  async function handleOAuthCallback(code: string) {
    isAuthenticating.value = true
    error.value = null
    try {
      const tokens = await handleCallback(code)
      tokenExpiresAt.value = tokens.expires_at
      connected.value = true

      const email = await getUserEmail()
      userEmail.value = email
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      connected.value = false
    } finally {
      isAuthenticating.value = false
    }
  }

  function disconnect() {
    clearTokens()
    connected.value = false
    userEmail.value = null
    tokenExpiresAt.value = null
    error.value = null
  }

  async function getToken(): Promise<string> {
    try {
      const token = await getAccessToken()
      connected.value = true
      // Update expiry from storage after potential refresh
      const tokens = getStoredTokens()
      if (tokens) tokenExpiresAt.value = tokens.expires_at
      return token
    } catch (err) {
      connected.value = false
      throw err
    }
  }

  return {
    connected,
    userEmail,
    tokenExpiresAt,
    isAuthenticating,
    clientId,
    error,
    updateClientId,
    connect,
    handleOAuthCallback,
    disconnect,
    getToken,
  }
})
