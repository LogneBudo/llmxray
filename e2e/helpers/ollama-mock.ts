import type { Page } from '@playwright/test'

/**
 * Intercepts Ollama API calls so E2E tests run without a real Ollama instance.
 */
export async function mockOllamaApi(page: Page, options: MockOptions = {}) {
  const models = options.models ?? [
    { name: 'llama3:latest', size: 4_000_000_000, modified_at: '2024-01-01T00:00:00Z' },
    { name: 'mistral:latest', size: 3_000_000_000, modified_at: '2024-01-01T00:00:00Z' },
  ]

  // Mock /api/tags — model list
  await page.route('**/api/tags', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models }),
    })
  })

  // Mock /api/show — model details
  await page.route('**/api/show', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modelfile: 'FROM llama3',
        parameters: 'temperature 0.7',
        template: '{{ .Prompt }}',
        details: {
          format: 'gguf',
          family: 'llama',
          parameter_size: '8B',
          quantization_level: 'Q4_0',
        },
      }),
    })
  })

  // Mock /api/embed — embeddings
  await page.route('**/api/embed', async (route) => {
    const body = await route.request().postDataJSON()
    const inputs = Array.isArray(body.input) ? body.input : [body.input]
    const embeddings = inputs.map(() =>
      Array.from({ length: 384 }, () => Math.random() * 2 - 1),
    )
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ embeddings }),
    })
  })

  // Mock /api/chat — streaming NDJSON response
  await page.route('**/api/chat', async (route) => {
    const body = await route.request().postDataJSON()
    const userMsg = [...body.messages].reverse().find((m: { role: string }) => m.role === 'user')
    const prompt = userMsg?.content ?? ''

    const responseText = options.chatResponse?.(prompt) ?? getDefaultResponse(prompt)
    const tokens = tokenize(responseText)

    const ndjsonLines = tokens.map((token, i) =>
      JSON.stringify({
        model: body.model,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: token },
        done: false,
      }),
    )

    // Final "done" line
    ndjsonLines.push(
      JSON.stringify({
        model: body.model,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: '' },
        done: true,
        total_duration: 1_000_000_000,
        load_duration: 100_000_000,
        prompt_eval_count: 20,
        prompt_eval_duration: 200_000_000,
        eval_count: tokens.length,
        eval_duration: 500_000_000,
      }),
    )

    route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: ndjsonLines.join('\n') + '\n',
    })
  })
}

/**
 * Mock /api/chat to return a response with <think> blocks.
 */
export async function mockOllamaWithThinking(page: Page) {
  await mockOllamaApi(page, {
    chatResponse: () =>
      '<think>Let me analyze this step by step.\n\nFirst, I need to consider the key factors.\n\nThe answer should be comprehensive.</think>Based on my analysis, the answer is 42.',
  })
}

/**
 * Mock /api/chat with native thinking field (Ollama's format for DeepSeek R1, QwQ, etc.)
 */
export async function mockOllamaWithNativeThinking(page: Page) {
  await mockOllamaApi(page)
  // Override the /api/chat route with native thinking field support
  await page.route('**/api/chat', async (route) => {
    const thinkingTokens = tokenize(
      'Let me work through this carefully. The question requires analysis. I should provide a clear answer.',
    )
    const contentTokens = tokenize('Based on my analysis, the answer is 42.')

    const lines: string[] = []

    // Thinking phase: content is empty, thinking field has text
    for (const token of thinkingTokens) {
      lines.push(
        JSON.stringify({
          model: 'deepseek-r1:8b',
          created_at: new Date().toISOString(),
          message: { role: 'assistant', content: '', thinking: token },
          done: false,
        }),
      )
    }

    // Content phase: thinking field absent, content has text
    for (const token of contentTokens) {
      lines.push(
        JSON.stringify({
          model: 'deepseek-r1:8b',
          created_at: new Date().toISOString(),
          message: { role: 'assistant', content: token },
          done: false,
        }),
      )
    }

    // Final done line
    lines.push(
      JSON.stringify({
        model: 'deepseek-r1:8b',
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: '' },
        done: true,
        eval_count: thinkingTokens.length + contentTokens.length,
        eval_duration: 500_000_000,
      }),
    )

    route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: lines.join('\n') + '\n',
    })
  })
}

/**
 * Mock /api/chat with a tool call response.
 */
export async function mockOllamaWithToolCall(page: Page) {
  await page.route('**/api/tags', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        models: [{ name: 'llama3:latest', size: 4_000_000_000, modified_at: '2024-01-01T00:00:00Z' }],
      }),
    })
  })

  await page.route('**/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body:
        JSON.stringify({
          model: 'llama3:latest',
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'get_weather',
                  arguments: { city: 'Paris' },
                },
              },
            ],
          },
          done: true,
          eval_count: 10,
          eval_duration: 200_000_000,
        }) + '\n',
    })
  })
}

interface MockOptions {
  models?: Array<{ name: string; size: number; modified_at: string }>
  chatResponse?: (prompt: string) => string
}

function getDefaultResponse(prompt: string): string {
  if (prompt.toLowerCase().includes('hello'))
    return 'Hello! How can I help you today?'
  if (prompt.toLowerCase().includes('weather'))
    return 'I cannot check the weather directly, but you can check a weather service.'
  return 'This is a mock response from the test harness. The model is not actually running.'
}

/** Splits text into word-level tokens to simulate streaming. */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  const parts = text.split(/(\s+)/)
  for (const part of parts) {
    if (part) tokens.push(part)
  }
  return tokens
}
