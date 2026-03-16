# Benchmark Suite Schema

## Suite Object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier, lowercase with hyphens (e.g., `"coding-basics"`) |
| `name` | string | Yes | Display name (e.g., `"Coding Basics"`) |
| `description` | string | Yes | Brief description of what the suite tests |
| `builtIn` | boolean | Yes | Must be `false` for community suites |
| `questions` | array | Yes | Array of question objects (minimum 20) |

## Question Object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique ID within the suite (e.g., `"coding-basics_001"`) |
| `category` | string | Yes | Category for grouping in results (typically matches suite `id`) |
| `subcategory` | string | No | Finer grouping within the category |
| `question` | string | Yes | The question text |
| `choices` | string[] | Yes | Exactly 4 answer options, prefixed with `"A) "`, `"B) "`, `"C) "`, `"D) "` |
| `correctAnswer` | string | Yes | The correct answer letter: `"A"`, `"B"`, `"C"`, or `"D"` |
| `difficulty` | string | No | One of `"easy"`, `"medium"`, `"hard"` |

## Validation Checklist

Before submitting a PR, verify:

- [ ] `id` is unique and not already used by a built-in or other community suite
- [ ] `builtIn` is set to `false`
- [ ] At least 20 questions
- [ ] All questions have exactly 4 choices
- [ ] All `correctAnswer` values are one of A, B, C, D
- [ ] All question `id` values are unique within the suite
- [ ] JSON is valid (no trailing commas, proper encoding)
- [ ] All correct answers are factually verifiable
