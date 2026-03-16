# AI Training

The AI Training page lets you collect, curate, and export training data pairs for fine-tuning language models.

**Sidebar item:** AI Training
**Route:** `/training`

## What Are Training Pairs?

A training pair consists of a **user prompt** and a **model response**. By collecting high-quality pairs, you build a dataset that can be used to fine-tune a model to behave the way you want.

## How Pairs Are Collected

Training pairs are automatically captured from your interactions with the **Canvas AI** feature in the Tool Workshop. When the AI generates tool code, drafts improvements, or provides insights, each interaction becomes a training pair stored in IndexedDB.

## Curating Data

The main interface shows a table of all collected training pairs. For each pair you can:

### Accept or Reject
- **Accept** — Mark the pair as high-quality training data
- **Reject** — Mark it as unsuitable (bad output, hallucination, etc.)

### Edit Responses
Click on any response to edit it. This is useful when the model's output was close but needs correction — you get the right answer without starting from scratch.

### Tagging
Add tags to organize pairs by topic, quality level, or any custom category. Tags help you filter and export specific subsets.

### Bulk Operations
Select multiple pairs to:
- **Bulk accept/reject** — Set status for many pairs at once
- **Bulk add tags** — Apply a tag to all selected pairs
- **Delete** — Remove unwanted pairs

## Filtering

Filter the training pair list by:
- **Status** — Accepted, rejected, or unreviewed
- **Tags** — Show only pairs with specific tags
- **Search** — Free-text search across prompts and responses

## Exporting

Select the pairs you want to export (or use filters to narrow down), then click **Export**. The exported dataset can be used with fine-tuning tools and frameworks.

## Statistics

The page header shows aggregate stats:
- Total pairs collected
- Accepted vs. rejected counts
- Tag distribution

## Tips

- **Quality over quantity** — A small dataset of carefully curated pairs produces better fine-tuning results than a large noisy dataset.
- **Edit, don't discard** — If a response is 80% correct, editing it is more efficient than regenerating from scratch.
- **Use tags strategically** — Tag by capability (e.g., "code-gen", "api-tools", "explanation") to create focused training subsets.
