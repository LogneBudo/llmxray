# Community Benchmarks

LLMxRay ships with 5 built-in benchmark suites (ARC, GSM8K, HellaSwag, MMLU-Pro, TruthfulQA). Community members can contribute additional suites to test models on specialized topics.

## How to Contribute

1. **Fork** the [LLMxRay repository](https://github.com/LogneBudo/llmxray)
2. Create a JSON file in the `community-benchmarks/` directory
3. Follow the schema defined in [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/SCHEMA.md)
4. Submit a Pull Request

## Requirements

- Minimum **20 questions** per suite
- All questions must have **verifiable correct answers**
- Exactly **4 answer choices** per question (A, B, C, D)
- Set `"builtIn": false`
- Include a mix of difficulty levels when applicable

## JSON Format

```json
{
  "id": "my-suite",
  "name": "My Custom Suite",
  "description": "What this suite tests",
  "builtIn": false,
  "questions": [
    {
      "id": "my-suite_001",
      "category": "my-suite",
      "subcategory": "topic",
      "question": "The question text?",
      "choices": [
        "A) First option",
        "B) Second option",
        "C) Third option",
        "D) Fourth option"
      ],
      "correctAnswer": "B",
      "difficulty": "medium"
    }
  ]
}
```

## Suite Ideas

Looking for inspiration? Here are some areas not covered by the built-in suites:

- **Programming** — Code comprehension and debugging questions
- **Logic puzzles** — Formal logic and deductive reasoning
- **Language understanding** — Idioms, ambiguity, pragmatics
- **Domain-specific** — Medical, legal, financial, or engineering knowledge
- **Multilingual** — Questions in languages other than English

## Community Suites

*No community suites submitted yet. Be the first!*

See the [example suite](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/_example.json) for a working reference.
