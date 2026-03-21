# Cost Dashboard

The Cost Dashboard tracks token usage across all your sessions and estimates what the same workload would cost on commercial cloud APIs.

**Sidebar item:** Costs
**Route:** `/costs`

## Why Track Costs Locally?

Ollama runs on your machine at zero cost. But understanding the equivalent cloud cost helps you:

- **Quantify savings** &mdash; See how much you're saving by running locally
- **Plan capacity** &mdash; Understand which models consume the most tokens
- **Compare efficiency** &mdash; Identify which models give the best output per token

## Dashboard Sections

### Summary Cards

Four cards at the top showing:

- **Total Tokens** &mdash; Sum of all prompt + completion tokens across sessions
- **Sessions** &mdash; Total number of chat sessions recorded
- **Estimated Cost** &mdash; What the same usage would cost on cloud APIs
- **Avg Cost/Session** &mdash; Average estimated cost per session

### Token Usage by Model

A horizontal stacked bar chart showing prompt (indigo) and completion (purple) tokens for each model you've used. Models are sorted by total token count.

### Daily Usage

A line chart with two axes:

- **Left axis** &mdash; Total tokens per day (filled area)
- **Right axis** &mdash; Estimated cost per day (dashed line)

Hover over any point to see exact values.

### Model Breakdown Table

A detailed table with columns:

| Column | Description |
|--------|-------------|
| Model | The Ollama model name |
| Sessions | Number of chat sessions |
| Prompt | Total prompt tokens |
| Completion | Total completion tokens |
| Total | Combined token count |
| Est. Cost | Estimated cloud-equivalent cost |
| Source | Where the pricing data comes from |

## Pricing Data

Pricing is based on equivalent cloud API rates for common model families:

| Model Family | Input $/1M | Output $/1M | Source |
|-------------|-----------|------------|--------|
| llama3.2 | $0.04 | $0.04 | Together AI |
| llama3.1 | $0.05 | $0.08 | Groq |
| gemma3 | $0.10 | $0.10 | Google |
| mistral | $0.25 | $0.25 | Mistral |
| deepseek-r1 | $0.55 | $2.19 | DeepSeek |
| phi4 | $0.07 | $0.14 | Azure |
| qwen2.5 | $0.15 | $0.15 | Alibaba |

Models not in the pricing table fall back to a generic estimate of $0.10/$0.10 per 1M tokens, labeled as "Estimated".

::: info These are estimates
All costs shown are what equivalent usage would cost on cloud APIs. Ollama runs locally at no cost. The pricing data is a static snapshot and may not reflect current cloud pricing.
:::

## Data Source

The cost dashboard derives all data from the metrics store &mdash; the same session metrics recorded during chat. No additional tracking or storage is needed. The cost store is purely computed (reactive) and recalculates automatically when new sessions are recorded.
