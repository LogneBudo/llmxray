# Community Tool Templates

Contribute tool templates for LLMxRay's Tool Workshop. Community tools appear alongside the built-in templates.

## How to Contribute

1. **Fork** the repository
2. Create a JSON file in this directory following the schema below
3. Name it `<tool-name>.json` (lowercase, hyphens, no spaces)
4. Submit a **Pull Request** to `master`

## Requirements

- Tool must have a clear, useful purpose
- Include a `testInput` example so reviewers can verify it works
- No tools that make requests to untrusted external domains
- No filesystem access or system-level operations
- Set a meaningful `category`

## JSON Schema

```json
{
  "name": "tool_name",
  "description": "What this tool does — helps the model decide when to call it",
  "category": "utility",
  "parameters": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Description of this parameter"
      }
    },
    "required": ["input"]
  },
  "implementation": "function tool_name({ input }) {\n  return input.toUpperCase();\n}",
  "testInput": {
    "input": "hello world"
  }
}
```

See [SCHEMA.md](SCHEMA.md) for full field descriptions and `_example.json` for a working sample.

## Categories

- `api` — Tools that call external APIs
- `data` — Data transformation and processing
- `utility` — General-purpose utilities
- `custom` — Anything else
