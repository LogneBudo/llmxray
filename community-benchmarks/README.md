# Community Benchmark Suites

Contribute your own benchmark suites to LLMxRay. Community suites appear alongside the built-in ones (ARC, GSM8K, HellaSwag, MMLU-Pro, TruthfulQA).

## How to Contribute

1. **Fork** the repository
2. Create a JSON file in this directory following the schema below
3. Name it `<suite-name>.json` (lowercase, hyphens, no spaces)
4. Submit a **Pull Request** to `master`

## Requirements

- Minimum **20 questions** per suite
- All questions must have **verifiable correct answers**
- Include a mix of difficulty levels when applicable
- Set `"builtIn": false`
- Use the exact schema below

## JSON Schema

```json
{
  "id": "my-suite",
  "name": "My Custom Suite",
  "description": "A brief description of what this suite tests",
  "builtIn": false,
  "questions": [
    {
      "id": "my-suite_001",
      "category": "my-suite",
      "subcategory": "topic-area",
      "question": "What is the question?",
      "choices": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctAnswer": "B",
      "difficulty": "medium"
    }
  ]
}
```

See [SCHEMA.md](SCHEMA.md) for full field descriptions and `_example.json` for a working sample.

## Existing Built-in Suites

For reference, see the built-in suites in `src/data/benchmarks/`:
- `arc.json` — Science reasoning (ARC-Challenge)
- `gsm8k.json` — Math word problems
- `hellaswag.json` — Sentence completion / common sense
- `mmlu-pro.json` — Multi-domain academic knowledge
- `truthfulqa.json` — Resistance to common misconceptions
