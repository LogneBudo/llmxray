/**
 * Feedback submission service.
 *
 * Submits user feedback to a Google Form endpoint.
 * The form fields are mapped by entry IDs — update these
 * when you create/recreate the Google Form.
 *
 * To set up:
 * 1. Create a Google Form with these fields (all "Short answer" or "Paragraph"):
 *    - Type (short answer)
 *    - Message (paragraph)
 *    - Email (short answer)
 *    - Metadata (paragraph) — JSON blob with all silent context
 * 2. Get the form's POST URL: https://docs.google.com/forms/d/e/FORM_ID/formResponse
 * 3. Get each field's entry ID (inspect the form HTML or use prefilled link)
 * 4. Update FORM_ID and ENTRY_IDS below
 */

// ── Configuration ────────────────────────────────────────────────
// Replace with your actual Google Form values
const FORM_ID = '1FAIpQLSfM5TaAGHGi8mUdUpQbegxlNv_6yftYOidb1ZlCZP_ZXvBD9g'
const ENTRY_IDS = {
  type: 'entry.1352630437',
  message: 'entry.650654162',
  email: 'entry.192445165',
  metadata: 'entry.2099403794',
}

const FORM_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`

// ── Types ────────────────────────────────────────────────────────

export type FeedbackType = 'bug' | 'idea' | 'question' | 'other'

export interface FeedbackMetadata {
  timestamp: string
  route: string
  selectedModel: string
  ollamaConnected: boolean
  installedModels: string[]
  os: string
  browser: string
  screenResolution: string
  appVersion: string
}

export interface FeedbackPayload {
  type: FeedbackType
  message: string
  email: string
  metadata: FeedbackMetadata
}

// ── Metadata collectors ──────────────────────────────────────────

function detectBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) return `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0]}`
  if (ua.includes('Edg/')) return `Edge ${ua.split('Edg/')[1]?.split(' ')[0]}`
  if (ua.includes('Chrome/')) return `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0]}`
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return `Safari ${ua.split('Version/')[1]?.split(' ')[0]}`
  return ua.slice(0, 80)
}

function detectOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows NT 10')) return 'Windows 10/11'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X')) {
    const ver = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.')
    return `macOS ${ver ?? ''}`
  }
  if (ua.includes('Linux')) return 'Linux'
  return navigator.platform || 'Unknown'
}

export function collectMetadata(route: string, selectedModel: string, ollamaConnected: boolean, installedModels: string[]): FeedbackMetadata {
  return {
    timestamp: new Date().toISOString(),
    route,
    selectedModel,
    ollamaConnected,
    installedModels,
    os: detectOS(),
    browser: detectBrowser(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    appVersion: '1.0.0',
  }
}

// ── Submission ───────────────────────────────────────────────────

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const formData = new URLSearchParams()
  formData.append(ENTRY_IDS.type, payload.type)
  formData.append(ENTRY_IDS.message, payload.message)
  if (payload.email) {
    formData.append(ENTRY_IDS.email, payload.email)
  }
  formData.append(ENTRY_IDS.metadata, JSON.stringify(payload.metadata))

  // Google Forms returns a redirect on success — we use no-cors mode
  // to fire-and-forget without CORS issues
  await fetch(FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })
}
