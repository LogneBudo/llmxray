# Local AI History

LLMxRay automatically records every experiment you run — benchmarks, comparisons, chats, training. Your research archive, queryable and exportable.

## What Gets Recorded

Every interaction with a model produces a history entry. The table below shows what data is captured for each type.

| Entry Type | Data Captured |
|---|---|
| Benchmark | Suite name, model, questions, answers, accuracy scores, per-category breakdown, duration |
| Compare | Prompt, models compared, outputs, Token Tax, latency, confidence scores |
| Language Compare | Prompt, languages tested, model, outputs per language, quality metrics |
| Chat Session | Full conversation (all turns), model, timestamps, token counts, latency per token |
| Training | Dataset name, model, training parameters, loss curve, epoch count, duration |
| Embedding | Input text, model, vector dimensions, similarity scores |
| Tool Workshop | Tool definitions, test inputs, model responses, execution results |

Entries are timestamped and tagged with the model name automatically.

## Finding Your Data

The History page provides filters to narrow down your archive.

- **Type** — Show only benchmarks, chats, comparisons, or any other entry type.
- **Model** — Filter by the model used (e.g., `llama3`, `deepseek-r1`, `phi4`).
- **Language** — For language comparisons, filter by the languages tested.
- **Date range** — Pick a start and end date to focus on a specific period.
- **Tags** — Custom tags you have applied to entries for your own organization.

Filters combine with AND logic — selecting both a model and a type shows only entries matching both criteria.

## Trend Analysis

The History page includes an activity chart that visualizes your experimentation over time.

- **Activity over time** — A timeline showing how many experiments you ran per day or week. Spot gaps or bursts in your research.
- **Models used** — A breakdown of which models you tested most. Useful for seeing whether you are over-relying on a single model or exploring broadly.
- **Patterns to look for:**
  - Accuracy improvements across successive benchmark runs on the same model.
  - Latency changes after model updates or parameter adjustments.
  - Which model consistently wins comparisons for your use case.
  - Training loss curves flattening — a sign that more epochs will not help.

## Exporting

History entries can be exported in two formats.

- **JSON** — Exports all entries with full structured data. Includes every field: timestamps, model names, prompts, outputs, scores, parameters, and tags. Use for scripting, backup, or reimporting.
- **CSV** — Exports the currently filtered view as flat tabular data. Columns include entry type, model, date, summary metrics (accuracy, latency, token count), and tags. Open in Excel, Google Sheets, or pandas.

To export:

1. Apply filters if you want a subset (or leave unfiltered for everything).
2. Click the **Export** button.
3. Choose JSON or CSV — the file downloads immediately.

## Managing Storage

History is stored in IndexedDB in your browser. It costs nothing and requires no server.

- **Retention settings** — Configure how long entries are kept. Options range from 30 days to unlimited. Older entries beyond the retention window are pruned automatically.
- **Clearing history** — Use the **Clear History** action to delete all entries, or delete individual entries from the list. This action is irreversible.
- **Size estimates** — A typical benchmark entry is 2-5 KB. A full chat session is 5-50 KB depending on length. Thousands of entries fit comfortably within browser storage limits (typically 50 MB+).

## Privacy

> All history data is stored locally in your browser's IndexedDB. Nothing is sent to any cloud service. History entries are kept in their own data store, separate from the original benchmark results, chat sessions, and training data. Clearing history does not affect your other data stores.
