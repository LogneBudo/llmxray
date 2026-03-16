# Tool Template Schema

## Tool Object

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Function name (snake_case, e.g., `"convert_units"`) |
| `description` | string | Yes | What the tool does — this is shown to the model |
| `category` | string | Yes | One of: `"api"`, `"data"`, `"utility"`, `"custom"` |
| `parameters` | object | Yes | JSON Schema defining the tool's input parameters |
| `implementation` | string | Yes | JavaScript function body as a string |
| `testInput` | object | Yes | Example input matching the parameters schema |

## Parameters Object (JSON Schema)

The `parameters` field must be a valid JSON Schema object:

```json
{
  "type": "object",
  "properties": {
    "paramName": {
      "type": "string",
      "description": "What this parameter is for"
    }
  },
  "required": ["paramName"]
}
```

Supported types: `string`, `number`, `boolean`, `array`, `object`.

## Implementation

The `implementation` field is a JavaScript function body string. It receives the parameters as a destructured object:

```javascript
function tool_name({ param1, param2 }) {
  // Your code here
  return result;
}
```

## Security Guidelines

- No `fetch()` calls to untrusted domains
- No `eval()` or dynamic code execution
- No access to `localStorage`, `sessionStorage`, or cookies
- No DOM manipulation
- Pure data transformation is preferred

## Validation Checklist

- [ ] `name` is valid JavaScript identifier (snake_case)
- [ ] `description` clearly explains what the tool does
- [ ] `parameters` is valid JSON Schema
- [ ] `implementation` is valid JavaScript
- [ ] `testInput` matches the `parameters` schema
- [ ] No security violations
- [ ] JSON is valid
