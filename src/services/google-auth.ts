// --- Google OAuth2 PKCE Service ---
// Pure TypeScript, no framework dependencies.
// Handles the entire OAuth2 Authorization Code flow with PKCE for SPAs.

const TOKENS_KEY = 'llmxray-google-tokens'
const CLIENT_ID_KEY = 'llmxray-google-client-id'
const EMAIL_KEY = 'llmxray-google-email'
const VERIFIER_KEY = 'llmxray-google-pkce-verifier'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
  'openid',
  'email',
]

export interface GoogleTokens {
  access_token: string
  refresh_token: string | null
  expires_at: number
  scope: string
  token_type: string
}

// --- PKCE Helpers ---

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  return base64url(bytes.buffer)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64url(hash)
}

// --- Client ID ---

export function getClientId(): string | null {
  return localStorage.getItem(CLIENT_ID_KEY)
}

export function setClientId(id: string): void {
  localStorage.setItem(CLIENT_ID_KEY, id.trim())
}

// --- Token Storage ---

export function getStoredTokens(): GoogleTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GoogleTokens
  } catch {
    return null
  }
}

function storeTokens(tokens: GoogleTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

// --- Connection Status ---

export function isConnected(): boolean {
  const tokens = getStoredTokens()
  if (!tokens) return false
  // Connected if we have a refresh token OR access token hasn't expired
  return tokens.refresh_token !== null || Date.now() < tokens.expires_at
}

// --- Email ---

export function getCachedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}

export async function getUserEmail(): Promise<string | null> {
  try {
    const token = await getAccessToken()
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { email?: string }
    const email = data.email ?? null
    if (email) localStorage.setItem(EMAIL_KEY, email)
    return email
  } catch {
    return null
  }
}

// --- OAuth2 Flow ---

export async function startGoogleAuth(): Promise<void> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Google Client ID not configured. Go to Settings to set it up.')

  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  // Store verifier in sessionStorage (ephemeral — only needed during redirect round-trip)
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const redirectUri = window.location.origin + '/auth/google/callback'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`
}

export async function handleCallback(code: string): Promise<GoogleTokens> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Google Client ID not found')

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('PKCE verifier not found. Please restart the authentication flow.')

  const redirectUri = window.location.origin + '/auth/google/callback'

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    token_type: data.token_type,
  }

  storeTokens(tokens)
  sessionStorage.removeItem(VERIFIER_KEY)

  return tokens
}

// --- Token Access ---

export async function getAccessToken(): Promise<string> {
  const tokens = getStoredTokens()
  if (!tokens) throw new Error('Google account not connected. Go to Settings to connect.')

  // Return current token if still valid (with 60s buffer)
  if (Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token
  }

  // Try to refresh
  if (tokens.refresh_token) {
    return await refreshAccessToken(tokens.refresh_token)
  }

  throw new Error('Google token expired and no refresh token available. Please reconnect in Settings.')
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Google Client ID not found')

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    // Refresh failed — clear tokens so UI shows disconnected
    clearTokens()
    throw new Error('Failed to refresh Google token. Please reconnect in Settings.')
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    scope: string
    token_type: string
  }

  // Update stored tokens (keep existing refresh_token — Google doesn't always return a new one)
  const updated: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    token_type: data.token_type,
  }

  storeTokens(updated)
  return updated.access_token
}

// --- Disconnect ---

export function clearTokens(): void {
  localStorage.removeItem(TOKENS_KEY)
  localStorage.removeItem(EMAIL_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
}
