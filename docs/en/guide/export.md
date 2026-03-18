# Exporting Your Data

LLMxRay generates rich data — benchmarks, sessions, conversations, tool definitions, and system reports. Every piece of data you create is exportable. Your data stays local until you choose to share it.

## What Can Be Exported

| Page | Formats | What's Included |
|---|---|---|
| Compare | JSON, Markdown, Share | Prompts, outputs, metrics, Token Tax |
| Benchmark | JSON, CSV, Markdown | Questions, answers, accuracy, per-category results |
| Session | JSON, Markdown, Token CSV | Prompt, response, metrics, per-token latencies |
| Chat | JSON, Markdown, Text | Full conversation with timestamps |
| Tool Workshop | JSON | Tool definitions with implementations |
| System | JSON, Markdown | Hardware, Ollama status, models, storage |

## Export Formats

- **JSON** — Full structured data. Use for scripts, analysis, reimporting.
- **CSV** — Flat tabular data. Open in Excel, Google Sheets, or pandas.
- **Markdown** — Formatted reports. Paste into docs, blogs, or GitHub.
- **JSONL** — Line-delimited JSON for training data export.
- **Text** — Plain conversation transcripts.

## How to Export

1. Look for the **Export** button (download icon) on any results page.
2. Click to see available formats.
3. Select a format — the file downloads immediately.
4. For sharing: choose **"Share to GitHub Discussions"** to post findings.

## Sharing to GitHub Discussions

Available on the Compare and Benchmark pages. The Share feature pre-fills a GitHub Discussion post with your formatted report. You add your own commentary and review everything before posting. Nothing is sent without your explicit action.

1. Click **"Share to GitHub Discussions"** in the Export menu.
2. A dialog opens with a preview of the markdown report.
3. Add your commentary — describe what you discovered.
4. Click **"Open GitHub Discussions"** to be redirected to GitHub with the report pre-filled.
5. You review and submit the post yourself — nothing is posted without your consent.

## Data Privacy

> Your data never leaves your machine unless you choose to share it. All exports download to your local filesystem. The Share feature opens a GitHub URL — you control what gets posted.
