<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ToolCategory } from '@/types/tool-workshop'
import { useToolWorkshopStore } from '@/stores/tool-workshop-store'
import type { OllamaToolDefinition } from '@/types/ollama'
import ToolCanvasView from '@/components/tool-canvas/ToolCanvasView.vue'

const store = useToolWorkshopStore()
const showTemplateModal = ref(false)

// --- Templates ---

interface ToolTemplate {
  name: string
  description: string
  category: ToolCategory
  definition: OllamaToolDefinition
  code: string
}

const templates: ToolTemplate[] = [
  {
    name: 'Current Time',
    description: 'Returns the current date and time',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: 'Get the current date and time in ISO format',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    code: 'return new Date().toISOString()',
  },
  {
    name: 'Web Fetch',
    description: 'Fetch readable text or JSON from a URL',
    category: 'api',
    definition: {
      type: 'function',
      function: {
        name: 'fetch_url',
        description: 'Fetch the content of a web page or API endpoint. Returns extracted text for HTML pages, or raw JSON for API responses.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to fetch' },
          },
          required: ['url'],
        },
      },
    },
    code: `const res = await fetch(args.url)
const contentType = res.headers.get('content-type') || ''
if (contentType.includes('application/json')) {
  return await res.json()
}
const text = await res.text()
// Extract readable text from HTML
if (contentType.includes('text/html') || text.trimStart().startsWith('<')) {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  // Remove non-content elements
  doc.querySelectorAll('script,style,nav,footer,header,aside,iframe,noscript,svg').forEach(el => el.remove())
  const title = doc.querySelector('title')?.textContent?.trim() || ''
  const body = doc.body?.textContent?.replace(/\\s+/g, ' ')?.trim() || ''
  return (title ? title + '\\n\\n' : '') + body.slice(0, 8000)
}
return text`,
  },
  {
    name: 'Calculator',
    description: 'Evaluate a math expression',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Evaluate a mathematical expression and return the result',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'The math expression to evaluate (e.g., "2 + 3 * 4")' },
          },
          required: ['expression'],
        },
      },
    },
    code: `// Safe math evaluation (no eval)\nconst expr = String(args.expression)\nconst fn = new Function('return ' + expr.replace(/[^0-9+\\-*/().\\s]/g, ''))\nreturn fn()`,
  },
  {
    name: 'JSON Formatter',
    description: 'Pretty-print a JSON string',
    category: 'data',
    definition: {
      type: 'function',
      function: {
        name: 'format_json',
        description: 'Format a JSON string with proper indentation for readability',
        parameters: {
          type: 'object',
          properties: {
            json_string: { type: 'string', description: 'The JSON string to format' },
          },
          required: ['json_string'],
        },
      },
    },
    code: `return JSON.stringify(JSON.parse(String(args.json_string)), null, 2)`,
  },
  {
    name: 'Password Generator',
    description: 'Generate a secure random password',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'generate_password',
        description: 'Generate a cryptographically secure random password with configurable length and character types',
        parameters: {
          type: 'object',
          properties: {
            length: { type: 'number', description: 'Password length (default 16)' },
            include_symbols: { type: 'boolean', description: 'Include special characters like !@#$% (default true)' },
          },
          required: [],
        },
      },
    },
    code: `const len = Number(args.length) || 16
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const lower = 'abcdefghijklmnopqrstuvwxyz'
const digits = '0123456789'
const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const chars = upper + lower + digits + (args.include_symbols !== false ? symbols : '')
const arr = new Uint32Array(len)
crypto.getRandomValues(arr)
return Array.from(arr, v => chars[v % chars.length]).join('')`,
  },
  {
    name: 'UUID Generator',
    description: 'Generate one or more random UUIDs (v4)',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'generate_uuid',
        description: 'Generate random UUID v4 identifiers',
        parameters: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of UUIDs to generate (default 1)' },
          },
          required: [],
        },
      },
    },
    code: `const n = Math.min(Number(args.count) || 1, 100)
const uuids = Array.from({ length: n }, () => crypto.randomUUID())
return n === 1 ? uuids[0] : uuids`,
  },
  {
    name: 'Base64 Encode/Decode',
    description: 'Encode text to Base64 or decode Base64 to text',
    category: 'data',
    definition: {
      type: 'function',
      function: {
        name: 'base64',
        description: 'Encode a string to Base64 or decode a Base64 string back to text',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text to encode or decode' },
            action: { type: 'string', description: '"encode" or "decode" (default "encode")' },
          },
          required: ['text'],
        },
      },
    },
    code: `if (args.action === 'decode') {
  return atob(String(args.text))
}
return btoa(String(args.text))`,
  },
  {
    name: 'Hash Text (SHA-256)',
    description: 'Compute the SHA-256 hash of a text string',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'hash_sha256',
        description: 'Compute the SHA-256 cryptographic hash of the given text, returned as a hex string',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text to hash' },
          },
          required: ['text'],
        },
      },
    },
    code: `const data = new TextEncoder().encode(String(args.text))
const hash = await crypto.subtle.digest('SHA-256', data)
return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')`,
  },
  {
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human-readable dates',
    category: 'data',
    definition: {
      type: 'function',
      function: {
        name: 'convert_timestamp',
        description: 'Convert a Unix timestamp (seconds or milliseconds) to a human-readable date, or convert a date string to a Unix timestamp',
        parameters: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'A Unix timestamp (e.g. "1710000000") or a date string (e.g. "2024-03-09T16:00:00Z")' },
          },
          required: ['value'],
        },
      },
    },
    code: `const v = String(args.value).trim()
const num = Number(v)
if (!isNaN(num) && v.length > 0) {
  // It's a number — treat as timestamp
  const ms = num > 1e12 ? num : num * 1000
  const d = new Date(ms)
  return { iso: d.toISOString(), local: d.toLocaleString(), unix_s: Math.floor(ms / 1000), unix_ms: ms }
}
// It's a date string
const d = new Date(v)
if (isNaN(d.getTime())) return { error: 'Could not parse date: ' + v }
return { iso: d.toISOString(), local: d.toLocaleString(), unix_s: Math.floor(d.getTime() / 1000), unix_ms: d.getTime() }`,
  },
  {
    name: 'Word & Character Counter',
    description: 'Count words, characters, sentences, and lines in text',
    category: 'data',
    definition: {
      type: 'function',
      function: {
        name: 'count_text',
        description: 'Analyze text and return counts of characters, words, sentences, lines, and paragraphs',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text to analyze' },
          },
          required: ['text'],
        },
      },
    },
    code: `const t = String(args.text)
const words = t.trim() ? t.trim().split(/\\s+/).length : 0
const chars = t.length
const chars_no_spaces = t.replace(/\\s/g, '').length
const sentences = (t.match(/[.!?]+(?=\\s|$)/g) || []).length
const lines = t.split(/\\r?\\n/).length
const paragraphs = t.split(/\\n\\s*\\n/).filter(p => p.trim()).length || (t.trim() ? 1 : 0)
return { words, characters: chars, characters_no_spaces: chars_no_spaces, sentences, lines, paragraphs }`,
  },
  {
    name: 'Text Transform',
    description: 'Transform text: uppercase, lowercase, title case, slug, reverse',
    category: 'utility',
    definition: {
      type: 'function',
      function: {
        name: 'transform_text',
        description: 'Transform text using a specified operation: uppercase, lowercase, title_case, slug, reverse, trim, or remove_duplicates',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text to transform' },
            operation: { type: 'string', description: 'One of: uppercase, lowercase, title_case, slug, reverse, trim, remove_duplicates' },
          },
          required: ['text', 'operation'],
        },
      },
    },
    code: `const t = String(args.text)
switch (String(args.operation)) {
  case 'uppercase': return t.toUpperCase()
  case 'lowercase': return t.toLowerCase()
  case 'title_case': return t.replace(/\\b\\w/g, c => c.toUpperCase())
  case 'slug': return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  case 'reverse': return t.split('').reverse().join('')
  case 'trim': return t.replace(/\\s+/g, ' ').trim()
  case 'remove_duplicates': return [...new Set(t.split(/\\n/))].join('\\n')
  default: return 'Unknown operation: ' + args.operation
}`,
  },
  {
    name: 'Regex Tester',
    description: 'Test a regex pattern against text and return matches',
    category: 'data',
    definition: {
      type: 'function',
      function: {
        name: 'test_regex',
        description: 'Test a regular expression pattern against text. Returns all matches with their positions.',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'The regex pattern (without delimiters)' },
            text: { type: 'string', description: 'The text to search' },
            flags: { type: 'string', description: 'Regex flags like "gi" (default "g")' },
          },
          required: ['pattern', 'text'],
        },
      },
    },
    code: `const re = new RegExp(String(args.pattern), String(args.flags || 'g'))
const matches = []
let m
while ((m = re.exec(String(args.text))) !== null) {
  matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
  if (!re.global) break
}
return { pattern: String(args.pattern), flags: re.flags, match_count: matches.length, matches }`,
  },
  // --- Google Templates (require Google account connection in Settings) ---
  {
    name: 'List Calendar Events',
    description: 'List upcoming events from Google Calendar',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'list_calendar_events',
        description: 'List upcoming events from the user\'s Google Calendar. Returns event titles, times, descriptions, and locations.',
        parameters: {
          type: 'object',
          properties: {
            days_ahead: { type: 'number', description: 'Number of days ahead to look (default 7)' },
            max_results: { type: 'number', description: 'Maximum number of events to return (default 10)' },
          },
          required: [],
        },
      },
    },
    code: `const token = await getGoogleToken()
const now = new Date()
const future = new Date(now.getTime() + (Number(args.days_ahead) || 7) * 86400000)
const params = new URLSearchParams({
  timeMin: now.toISOString(),
  timeMax: future.toISOString(),
  maxResults: String(Number(args.max_results) || 10),
  singleEvents: 'true',
  orderBy: 'startTime',
})
const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params, {
  headers: { Authorization: 'Bearer ' + token }
})
if (!res.ok) throw new Error('Calendar API error: ' + res.status)
const data = await res.json()
return (data.items || []).map(e => ({
  title: e.summary || '(no title)',
  start: e.start?.dateTime || e.start?.date,
  end: e.end?.dateTime || e.end?.date,
  description: e.description || '',
  location: e.location || '',
  id: e.id,
}))`,
  },
  {
    name: 'Create Calendar Event',
    description: 'Create a new event on Google Calendar',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'create_calendar_event',
        description: 'Create a new event on the user\'s Google Calendar. Returns the created event details and a link to view it.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Event title/summary' },
            start_time: { type: 'string', description: 'Start time in ISO 8601 format (e.g. "2025-03-15T14:00:00+01:00")' },
            end_time: { type: 'string', description: 'End time in ISO 8601 format (e.g. "2025-03-15T15:00:00+01:00")' },
            description: { type: 'string', description: 'Event description (optional)' },
            location: { type: 'string', description: 'Event location (optional)' },
          },
          required: ['title', 'start_time', 'end_time'],
        },
      },
    },
    code: `const token = await getGoogleToken()
const event = {
  summary: args.title,
  start: { dateTime: args.start_time },
  end: { dateTime: args.end_time },
  description: args.description || '',
  location: args.location || '',
}
const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify(event),
})
if (!res.ok) throw new Error('Failed to create event: ' + (await res.text()))
const created = await res.json()
return { id: created.id, title: created.summary, start: created.start, end: created.end, link: created.htmlLink }`,
  },
  {
    name: 'Delete Calendar Event',
    description: 'Delete an event from Google Calendar by its ID',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'delete_calendar_event',
        description: 'Delete an event from the user\'s Google Calendar. Use list_calendar_events first to get event IDs.',
        parameters: {
          type: 'object',
          properties: {
            event_id: { type: 'string', description: 'The ID of the event to delete' },
          },
          required: ['event_id'],
        },
      },
    },
    code: `const token = await getGoogleToken()
const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + encodeURIComponent(String(args.event_id)), {
  method: 'DELETE',
  headers: { Authorization: 'Bearer ' + token },
})
if (!res.ok && res.status !== 204) throw new Error('Failed to delete event: ' + res.status)
return { success: true, deleted_event_id: args.event_id }`,
  },
  {
    name: 'List Recent Emails',
    description: 'List recent emails from Gmail with subject, sender, and snippet',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'list_emails',
        description: 'List recent emails from the user\'s Gmail inbox. Returns subject, sender, date, and a short snippet for each email.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Gmail search query (e.g. "is:unread", "from:amazon.com", "subject:invoice"). Default: "is:unread"' },
            max_results: { type: 'number', description: 'Maximum number of emails to return (default 10)' },
          },
          required: [],
        },
      },
    },
    code: `const token = await getGoogleToken()
const q = String(args.query || 'is:unread')
const max = Math.min(Number(args.max_results) || 10, 20)
const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?' + new URLSearchParams({ q, maxResults: String(max) }), {
  headers: { Authorization: 'Bearer ' + token }
})
if (!listRes.ok) throw new Error('Gmail API error: ' + listRes.status)
const list = await listRes.json()
if (!list.messages || list.messages.length === 0) return { count: 0, emails: [] }
const emails = []
for (const msg of list.messages.slice(0, max)) {
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + msg.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date', {
    headers: { Authorization: 'Bearer ' + token }
  })
  if (!r.ok) continue
  const detail = await r.json()
  const headers = detail.payload?.headers || []
  emails.push({
    id: detail.id,
    subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
    from: headers.find(h => h.name === 'From')?.value || '',
    date: headers.find(h => h.name === 'Date')?.value || '',
    snippet: detail.snippet || '',
    labels: detail.labelIds || [],
  })
}
return { count: emails.length, emails }`,
  },
  {
    name: 'Send Email',
    description: 'Send an email via Gmail',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Send an email from the user\'s Gmail account.',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'Email body text (plain text)' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
    code: `const token = await getGoogleToken()
// Build RFC 2822 message
const message = [
  'To: ' + args.to,
  'Subject: ' + args.subject,
  'Content-Type: text/plain; charset=utf-8',
  '',
  args.body,
].join('\\r\\n')
// Base64url encode
const encoded = btoa(unescape(encodeURIComponent(message))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')
const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ raw: encoded }),
})
if (!res.ok) throw new Error('Failed to send email: ' + (await res.text()))
const sent = await res.json()
return { success: true, message_id: sent.id, to: args.to, subject: args.subject }`,
  },
  {
    name: 'Trash Email',
    description: 'Move an email to trash by its ID',
    category: 'google',
    definition: {
      type: 'function',
      function: {
        name: 'trash_email',
        description: 'Move an email to the trash in Gmail. Use list_emails first to get message IDs.',
        parameters: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'The ID of the email to trash' },
          },
          required: ['message_id'],
        },
      },
    },
    code: `const token = await getGoogleToken()
const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(String(args.message_id)) + '/trash', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token },
})
if (!res.ok) throw new Error('Failed to trash email: ' + res.status)
return { success: true, trashed_message_id: args.message_id }`,
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  utility: 'Utility',
  api: 'API',
  data: 'Data',
  google: 'Google (Calendar & Gmail)',
  custom: 'Custom',
}

const CATEGORY_ORDER = ['utility', 'api', 'data', 'google', 'custom']

const templatesByCategory = computed(() => {
  const groups: { category: string; label: string; items: ToolTemplate[] }[] = []
  const map = new Map<string, ToolTemplate[]>()
  for (const t of templates) {
    const cat = t.category
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(t)
  }
  for (const cat of CATEGORY_ORDER) {
    const items = map.get(cat)
    if (items && items.length > 0) {
      groups.push({ category: cat, label: CATEGORY_LABELS[cat] ?? cat, items })
    }
  }
  return groups
})

function addTemplate(template: ToolTemplate) {
  const id = store.addTool({
    definition: structuredClone(template.definition),
    implementation: { mode: 'code', blocks: [], code: template.code },
    category: template.category,
  })
  store.selectTool(id)
  showTemplateModal.value = false
}
</script>

<template>
  <div class="flex h-full overflow-hidden flex-col">
    <!-- Canvas -->
    <ToolCanvasView class="flex-1" @add-template="showTemplateModal = true" />

    <!-- Template Modal -->
    <Teleport to="body">
      <div
        v-if="showTemplateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showTemplateModal = false"
      >
        <div class="bg-surface-raised rounded-xl border border-border-default shadow-xl w-[480px] max-h-[70vh] overflow-hidden">
          <div class="p-4 border-b border-border-default">
            <h3 class="text-sm font-medium text-text-primary">Tool Templates</h3>
            <p class="text-[10px] text-text-muted mt-0.5">Start with a working template and customize it</p>
          </div>
          <div class="p-3 space-y-4 overflow-y-auto max-h-[50vh]">
            <div v-for="group in templatesByCategory" :key="group.category">
              <h4 class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">{{ group.label }}</h4>
              <div class="space-y-1.5">
                <button
                  v-for="t in group.items"
                  :key="t.name"
                  class="w-full text-left rounded-lg border border-border-default hover:border-accent/50 p-3 transition-colors"
                  @click="addTemplate(t)"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-text-primary">{{ t.name }}</span>
                  </div>
                  <p class="text-[10px] text-text-muted mt-1">{{ t.description }}</p>
                </button>
              </div>
            </div>
          </div>
          <div class="p-3 border-t border-border-default">
            <button
              class="w-full rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              @click="showTemplateModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
