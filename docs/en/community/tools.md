# Community Tools

LLMxRay's Tool Workshop ships with 15+ built-in templates. Community members can contribute additional tool templates to expand the library.

## How to Contribute

1. **Fork** the [LLMxRay repository](https://github.com/LogneBudo/llmxray)
2. Create a JSON file in the `community-tools/` directory
3. Follow the schema defined in [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-tools/SCHEMA.md)
4. Submit a Pull Request

## Requirements

- Tool must have a clear, useful purpose
- Include a `testInput` example for verification
- No calls to untrusted external domains
- No filesystem access or system-level operations
- Valid JavaScript implementation

## JSON Format

```json
{
  "name": "tool_name",
  "description": "What this tool does",
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

## Categories

| Category | Description |
|---|---|
| `api` | Tools that call external APIs |
| `data` | Data transformation and processing |
| `utility` | General-purpose utilities |
| `custom` | Anything else |

## Tool Ideas

- **JSON formatter** — Pretty-print or minify JSON
- **Markdown to HTML** — Convert markdown text
- **URL parser** — Extract components from URLs
- **Base64 encoder/decoder** — Encode and decode strings
- **CSV to JSON** — Transform tabular data
- **Color converter** — HSL to RGB, hex to RGB, etc.

## Community Tools

*No community tools submitted yet. Be the first!*

See the [example tool](https://github.com/LogneBudo/llmxray/blob/master/community-tools/_example.json) for a working reference.
