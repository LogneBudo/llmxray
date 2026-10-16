/**
 * The tool-call fidelity suite: can a local model call a tool the way an agent
 * framework needs? Every case is a real request shape an agent sends, with
 * what a correct answer must contain. The scoring is in services/tool-fidelity.ts.
 *
 * Born from a measured failure (2026-10-15): gemma4 dropped the required `path`
 * argument whenever the `content` argument was long. Case `long-content` is that.
 */
import type { OllamaToolDefinition } from '@/types/ollama'

export type ArgRule =
  | { kind: 'present' }
  | { kind: 'equals'; value: unknown }
  | { kind: 'contains'; value: string }
  | { kind: 'minLength'; value: number }
  | { kind: 'type'; value: 'string' | 'number' | 'boolean' | 'object' | 'array' }
  | { kind: 'oneOf'; value: unknown[] }

export interface ToolCase {
  id: string
  title: string
  /** What the case is about, for the person reading the results. */
  why: string
  system?: string
  user: string
  tools: OllamaToolDefinition[]
  /** The tool a correct answer calls; null when a correct answer calls nothing. */
  expectCall: string | null
  /** Rules per argument of the expected call. */
  args?: Record<string, ArgRule[]>
  /** When set, a correct answer makes exactly this many calls (parallel calls). */
  expectCalls?: number
}

const READ_FILE: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read a text file and return its contents.',
    parameters: { type: 'object', properties: { path: { type: 'string', description: 'Path of the file' } }, required: ['path'] },
  },
}

const WRITE_FILE: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'write_file',
    description: 'Write text to a file, replacing it.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path of the file' }, content: { type: 'string', description: 'The full text to write' } },
      required: ['path', 'content'],
    },
  },
}

const SEARCH: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'search_web',
    description: 'Search the web and return the top results.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, max_results: { type: 'integer', description: 'How many results, 1 to 10' } },
      required: ['query'],
    },
  },
}

const WEATHER: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Current weather for a city.',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' }, unit: { type: 'string', enum: ['celsius', 'fahrenheit'] } },
      required: ['city', 'unit'],
    },
  },
}

const CALENDAR: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'create_event',
    description: 'Create a calendar event.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        when: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM, 24h' } }, required: ['date', 'time'] },
        attendees: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'when'],
    },
  },
}

const LIST_DIR: OllamaToolDefinition = {
  type: 'function',
  function: { name: 'list_dir', description: 'List the files in a folder.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
}
const SEND_EMAIL: OllamaToolDefinition = {
  type: 'function',
  function: { name: 'send_email', description: 'Send an email.', parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] } },
}
const RUN_SQL: OllamaToolDefinition = {
  type: 'function',
  function: { name: 'run_sql', description: 'Run a read-only SQL query.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
}

const LONG_TEXT = Array.from({ length: 220 }, (_, i) => `Line ${i + 1}: the quick brown fox jumps over the lazy dog, again and again, until the file is long enough to matter.`).join('\n')

export const TOOL_CASES: ToolCase[] = [
  {
    id: 'simple-call',
    title: 'One tool, one argument',
    why: 'The floor. A model that fails this cannot drive an agent at all.',
    user: 'Read the file notes/todo.md and tell me what is in it.',
    tools: [READ_FILE],
    expectCall: 'read_file',
    args: { path: [{ kind: 'present' }, { kind: 'contains', value: 'todo.md' }] },
  },
  {
    id: 'long-content',
    title: 'A long argument next to a short one',
    why: 'Measured on gemma4: the short required argument (path) vanished once content was long. Agents write files this way all day.',
    user: `Save the following text to the file logs/run-1.txt exactly as it is, do not shorten it:\n\n${LONG_TEXT}`,
    tools: [WRITE_FILE],
    expectCall: 'write_file',
    args: { path: [{ kind: 'present' }, { kind: 'contains', value: 'run-1.txt' }], content: [{ kind: 'present' }, { kind: 'minLength', value: Math.floor(LONG_TEXT.length * 0.8) }] },
  },
  {
    id: 'enum',
    title: 'An argument restricted to a list',
    why: 'Frameworks validate enums; a value outside the list is a failed call.',
    user: 'What is the weather in Lyon right now? I think in Celsius.',
    tools: [WEATHER],
    expectCall: 'get_weather',
    args: { city: [{ kind: 'contains', value: 'Lyon' }], unit: [{ kind: 'equals', value: 'celsius' }] },
  },
  {
    id: 'number-type',
    title: 'A number must be a number',
    why: 'A quoted "5" fails a typed schema in most frameworks.',
    user: 'Search the web for "Ollama prompt cache" and give me 5 results.',
    tools: [SEARCH],
    expectCall: 'search_web',
    args: { query: [{ kind: 'contains', value: 'prompt cache' }], max_results: [{ kind: 'type', value: 'number' }, { kind: 'equals', value: 5 }] },
  },
  {
    id: 'nested',
    title: 'A nested object argument',
    why: 'Dates and times inside an object; small models flatten them.',
    user: 'Put a meeting called "Budget review" in my calendar on 2026-11-03 at 14:30 with ana@example.com and raj@example.com.',
    tools: [CALENDAR],
    expectCall: 'create_event',
    args: {
      title: [{ kind: 'contains', value: 'Budget' }],
      when: [{ kind: 'type', value: 'object' }],
      attendees: [{ kind: 'type', value: 'array' }],
    },
  },
  {
    id: 'pick-right-tool',
    title: 'Two tools, pick the right one',
    why: 'An agent offers many tools; calling the wrong one is worse than calling none.',
    user: 'Open config/app.yaml and show me the database section.',
    tools: [READ_FILE, WRITE_FILE, SEARCH],
    expectCall: 'read_file',
    args: { path: [{ kind: 'contains', value: 'app.yaml' }] },
  },
  {
    id: 'many-tools',
    title: 'Eight tools on offer, pick the right one',
    why: 'Real agents offer many tools; the schemas crowd the prompt and small models lose the thread.',
    user: 'Add "Dentist" to my calendar for 2026-11-12 at 09:00.',
    tools: [READ_FILE, WRITE_FILE, SEARCH, WEATHER, CALENDAR, LIST_DIR, SEND_EMAIL, RUN_SQL],
    expectCall: 'create_event',
    args: { title: [{ kind: 'contains', value: 'Dentist' }], when: [{ kind: 'type', value: 'object' }] },
  },
  {
    id: 'no-tool-needed',
    title: 'No tool is needed',
    why: 'A model that calls a tool for a greeting wastes a round trip on every turn and can do damage.',
    user: 'Hi! Just checking you are there. Say hello in one line.',
    tools: [READ_FILE, WRITE_FILE, SEARCH],
    expectCall: null,
  },
  {
    id: 'parallel',
    title: 'Two calls in one turn',
    why: 'Agents batch independent reads; a model that serialises them doubles the turns.',
    user: 'Read both files src/a.ts and src/b.ts so we can compare them.',
    tools: [READ_FILE],
    expectCall: 'read_file',
    expectCalls: 2,
    args: { path: [{ kind: 'present' }] },
  },
  {
    id: 'after-result',
    title: 'Answer after a tool result',
    why: 'The second half of every tool loop: use the result instead of calling again.',
    system: 'You are a helpful assistant with tools.',
    user: '__after_result__',
    tools: [READ_FILE],
    expectCall: null,
  },
  {
    id: 'unicode-path',
    title: 'An argument with accents and spaces',
    why: 'Paths are not ASCII; a mangled path is a failed call.',
    user: 'Read the file "Rapports/Été 2026/résumé final.md".',
    tools: [READ_FILE],
    expectCall: 'read_file',
    args: { path: [{ kind: 'contains', value: 'résumé final.md' }] },
  },
  {
    id: 'optional-omitted',
    title: 'Leave an optional argument out',
    why: 'Inventing a value for an optional argument changes what the tool does.',
    user: 'Search the web for the Ollama 0.40 release notes.',
    tools: [SEARCH],
    expectCall: 'search_web',
    args: { query: [{ kind: 'contains', value: '0.40' }] },
  },
  {
    id: 'hallucinated-tool',
    title: 'Only the tools that exist',
    why: 'A call to a tool that was never offered crashes most frameworks.',
    user: 'Delete the file tmp/old.log.',
    tools: [READ_FILE, WRITE_FILE],
    expectCall: null,
  },
]

/** The conversation for the one case that starts after a tool result. */
export const AFTER_RESULT_MESSAGES = [
  { role: 'user' as const, content: 'What is the first line of notes/todo.md?' },
  { role: 'assistant' as const, content: '', tool_calls: [{ function: { name: 'read_file', arguments: { path: 'notes/todo.md' } } }] },
  { role: 'tool' as const, content: 'Buy milk\nCall the bank\nFix the fence' },
]
