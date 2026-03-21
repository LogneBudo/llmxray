# Analytics

The Analytics page provides deep insight into your LLM usage patterns, performance characteristics, and response quality over time.

**Sidebar item:** Analytics
**Route:** `/analytics`

## Sections

### Response Quality

**Quality Over Turns** shows how response quality evolves across a multi-turn conversation. Each assistant response is scored on a 0-5 scale based on:

- **Word count** (40% weight) &mdash; longer responses score higher, capped at 50 words
- **Vocabulary diversity** (30% weight) &mdash; ratio of unique words to total words
- **Non-repetition** (30% weight) &mdash; lower 4-gram repetition scores higher

Points are color-coded: green (3.5+), yellow (2-3.5), red (< 2).

### Latency Analysis

Three charts analyzing request performance:

- **Request Latency P50/P95/P99** &mdash; windowed percentiles of `totalDurationMs` over sessions
- **TTFT P50/P95/P99** &mdash; same treatment for time-to-first-token
- **Inter-Token Latency Distribution** &mdash; histogram of token-to-token timing with OTel-recommended bucket boundaries

### Reliability

- **Error Rate by Model** &mdash; stacked bar chart showing errors by category per model
- **Error Timeline** &mdash; daily error count over time
- **Load Duration Trend** &mdash; model load times with cold start indicators (orange dots when > 500ms)

Error categories: connection, timeout, model not found, context exceeded, out of memory, tool error, cancelled.

### Usage Patterns

- **Request Volume** &mdash; daily bar chart of request count
- **Model Distribution** &mdash; doughnut chart showing proportion of requests per model
- **Active Hours Heatmap** &mdash; 7-day x 24-hour grid colored by request density

### Settings Impact

Scatter plot showing correlation between temperature and tokens/sec. Each dot is a session. Requires at least 2 sessions with explicit temperature settings.

### Model Memory

Timeline of recent model load events showing load duration and cold/warm start status. Cold starts (> 500ms) are highlighted in orange.

## Data Source

All analytics are computed client-side from `SessionMetrics` already stored in IndexedDB. No additional data collection is needed. Charts update reactively when new sessions are recorded.
