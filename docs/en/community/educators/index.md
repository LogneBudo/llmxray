# Educators Kit

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**A progressive curriculum for teaching AI/ML with local models.**

8 modules. From "What is a token?" to "I contributed to real AI research."
Free. Local. Visual. No cloud costs. No student API keys.

</div>

## Why LLMxRay for Teaching?

| Advantage | Details |
|---|---|
| **Free** | No API keys, no cloud costs, no student subscriptions. Zero budget required. |
| **Local** | All data stays on the student's machine. No privacy concerns, no institutional data policies. |
| **Visual** | Students see tokens stream in real time, watch confidence coloring, explore reasoning chains. Abstract concepts become tangible. |
| **Safe** | No risk of students accidentally running up cloud bills or exposing sensitive data. |
| **Cross-platform** | Runs on Windows, macOS, and Linux. Deploy via `npx llmxray`, Docker, or git clone. |
| **Research-ready** | Every experiment is reproducible. Students contribute real findings to the open-source community. |

## Course Integration

LLMxRay fits naturally into:
- **Introduction to AI/ML** — Understanding how language models generate text
- **Natural Language Processing** — Token analysis, embeddings, semantic similarity
- **Software Engineering** — API integration, tool calling, prompt engineering
- **Data Science** — Benchmarking methodology, statistical analysis of model outputs
- **AI Ethics** — Exploring model biases, hallucination detection, language fairness

---

## The Curriculum

### The Journey: See → Measure → Question → Discover → Build → Contribute

Each module builds on the previous one. Students progress from observation to experimentation to original research.

| Module | Title | Duration | Difficulty | The Aha Moment |
|---|---|---|---|---|
| **1** | [What Is a Token?](./module-1) | 45 min | Beginner | AI doesn't think in words — it thinks in tokens |
| **2** | [How Does Temperature Work?](./module-2) | 60 min | Beginner | Temperature isn't a linear dial — it's a phase transition |
| **3** | Can AI Lie? | 90 min | Intermediate | High confidence does not mean truth |
| **4** | What Does the Model See? | 45 min | Intermediate | Embeddings capture topic, not sentiment |
| **5** | When Does the Model Forget? | 60 min | Intermediate | Context isn't memory — it's a sliding window |
| **6** | Can AI Use Tools? | 60 min | Intermediate | Tool calling is pattern matching, not understanding |
| **7** | How Do Models Compare? | 90 min | Advanced | No model is universally best |
| **8** | The Full Picture | 120 min | Advanced | You can contribute to real AI research |

::: info Available Modules
Modules 1 and 2 are available now. Modules 3-8 are coming soon. Each module contains hands-on exercises with LLMxRay, conceptual background grounded in published research, and assessment options.
:::

---

## Quick "Aha Moment" Labs

Standalone 15-minute exercises for any lecture — no curriculum commitment needed:

| Lab | The Surprise | Time |
|---|---|---|
| The Hallucination Lab | Models confidently fabricate history | 15 min |
| The Tokenizer Bias | Same sentence, 5x more tokens in some languages | 15 min |
| The Parrot Test | Models can't repeat text verbatim — they generate, not recall | 15 min |
| The System Prompt Leak | Students extract a "secret" system prompt | 15 min |
| The Temperature Art Gallery | Same prompt at 8 temperatures displayed as a gallery | 15 min |
| The Reasoning Reveal | Watch DeepSeek-R1 think step by step on a math problem | 15 min |

*Detailed guides for these labs are coming soon.*

---

## Hardware Requirements

### Minimum (small models only)
- **RAM:** 8 GB
- **Storage:** 10 GB free
- **GPU:** Not required (CPU inference works)
- **Models:** 1B-3B parameter models (e.g., `llama3.2:1b`)

### Recommended (for all modules)
- **RAM:** 16 GB
- **Storage:** 20 GB free
- **GPU:** 6+ GB VRAM (significantly faster inference)
- **Models:** Up to 7B-8B parameter models

### Computer Lab Setup

**Option A — Per-student install:**
Each machine runs Ollama + LLMxRay independently.

```bash
# On each machine:
ollama pull llama3.2
npx llmxray
```

**Option B — Shared Ollama server:**
One powerful machine runs Ollama, students connect via LLMxRay Settings.

```bash
# On the GPU server:
OLLAMA_HOST=0.0.0.0 ollama serve

# On each student machine:
npx llmxray --ollama-url http://gpu-server:11434
```

**Option C — Docker deployment:**

```bash
docker compose -f docker-compose.example.yml up
```

---

## Assessment Options

Each module includes multiple assessment formats. Choose based on your course:

| Format | Best for | Typical module |
|---|---|---|
| Written reflection (300 words) | Individual, any course level | Modules 1, 4, 5 |
| Data analysis table + report | Data science, NLP courses | Modules 2, 3, 7 |
| Slide deck / presentation | Group work, seminars | Modules 3, 7 |
| Live demo + code review | Software engineering | Module 6 |
| Full research report | Advanced / capstone | Module 8 |

---

## Getting Help

- **[GitHub Discussions — Help](https://github.com/LogneBudo/llmxray/discussions/categories/help)** — Ask questions about setup or usage
- **[Documentation](https://lognebudo.github.io/llmxray/docs/en/guide/)** — Full user guide
- **[Bug Reports](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Report issues with structured templates

---

*Using LLMxRay in your course? We'd love to hear about it. Share your experience in [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions/categories/show-and-tell).*
