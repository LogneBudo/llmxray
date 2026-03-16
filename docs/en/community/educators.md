# Educators Kit

LLMxRay is built for learning. This kit helps educators integrate LLMxRay into AI/ML courses with ready-to-use lab exercises, deployment guides, and assessment ideas.

## Why LLMxRay for Teaching?

| Advantage | Details |
|---|---|
| **Free** | No API keys, no cloud costs, no student subscriptions. Zero budget required. |
| **Local** | All data stays on the student's machine. No privacy concerns, no institutional data policies to navigate. |
| **Visual** | Students see tokens stream in real time, watch confidence coloring, explore attention patterns. Abstract concepts become tangible. |
| **Safe** | No risk of students accidentally running up cloud bills or exposing sensitive data. |
| **Cross-platform** | Runs on Windows, macOS, and Linux. Deploy via npm, Docker, or git clone. |

## Course Integration

LLMxRay fits naturally into:
- **Introduction to AI/ML** — Understanding how language models generate text
- **Natural Language Processing** — Token analysis, embeddings, semantic similarity
- **Software Engineering** — API integration, tool calling, prompt engineering
- **Data Science** — Benchmarking methodology, statistical analysis of model outputs
- **AI Ethics** — Exploring model biases through TruthfulQA results and hallucination detection

---

## Lab Exercises

### Lab 1: Token Exploration

**Objective:** Understand how temperature affects model output.

**Duration:** 45 minutes

**Setup:** Any chat-capable model (e.g., `llama3.2`)

**Instructions:**
1. Open Chat Diagnostics and select a model
2. Send the prompt: "Write a short poem about the ocean"
3. Observe the token stream — note the confidence coloring (green = confident, orange = uncertain)
4. Open the Stream tab to see inter-token latency
5. Now go to **Compare** and set up a Temperature Sweep (3 slots: 0.1, 0.7, 1.5)
6. Run the same prompt across all three temperatures
7. Compare the outputs in Grid View, then switch to Diff View

**Questions for students:**
- How does the output change at higher temperatures?
- Which tokens show lower confidence at temperature 1.5 vs 0.1?
- Is the "best" output always at the lowest temperature? Why or why not?

---

### Lab 2: Model Comparison

**Objective:** Analyze quality vs speed tradeoffs across model sizes.

**Duration:** 60 minutes

**Setup:** Two models of different sizes (e.g., `llama3.2:1b` and `llama3.2:3b`)

**Instructions:**
1. Open **Compare** and create 2 slots, one per model, both at temperature 0.7
2. Use this prompt: "Explain how a neural network learns, in simple terms"
3. Run and observe streaming side by side
4. Check the **Metrics Bar**: compare TTFT, tokens/sec, and total tokens
5. Repeat with a harder prompt: "Write a Python function to find all prime factors of a number, then explain your approach step by step"
6. Record metrics for both prompts

**Questions for students:**
- Which model is faster? By how much?
- Does the larger model produce meaningfully better answers?
- At what point does the quality difference justify the speed cost?
- How would you choose a model for a production chatbot vs a coding assistant?

---

### Lab 3: Benchmark Your Models

**Objective:** Run standardized evaluations and interpret results.

**Duration:** 90 minutes

**Setup:** One or two models, ARC and TruthfulQA suites

**Instructions:**
1. Open the **Benchmark** page
2. Select a model and run the ARC-Challenge suite
3. While it runs, observe the live progress and per-question results
4. After completion, analyze the results:
   - Overall accuracy
   - Per-category breakdown (which subjects are strongest?)
   - Confidence distribution (does high confidence correlate with correctness?)
5. Run TruthfulQA on the same model
6. Compare the radar charts between suites
7. If time permits, run the same suites on a second model

**Questions for students:**
- Which categories does the model perform best/worst on?
- Is the model more accurate on "easy" questions? Check the logprob data.
- How does TruthfulQA accuracy compare to ARC? What does this tell you about different types of knowledge?
- If you were deploying this model, which weaknesses would concern you most?

---

### Lab 4: Embedding Spaces

**Objective:** Explore how models represent meaning as vectors.

**Duration:** 45 minutes

**Setup:** An embedding model (e.g., `nomic-embed-text`)

**Instructions:**
1. Open the **Embeddings** page
2. Embed these three sentences individually:
   - "The cat sat on the mat"
   - "A feline rested on the rug"
   - "The stock market crashed today"
3. Compare sentence 1 vs 2 (should be high similarity)
4. Compare sentence 1 vs 3 (should be low similarity)
5. Observe the cosine similarity scores
6. Now try edge cases:
   - "I love this movie" vs "I hate this movie" (same topic, opposite sentiment)
   - "Bank of the river" vs "Bank account" (same word, different meaning)

**Questions for students:**
- Why are "cat/mat" and "feline/rug" similar despite using different words?
- Does the model capture sentiment differences? What does the similarity score say?
- How does word ambiguity ("bank") affect embedding similarity?
- How would these embeddings be useful for a search engine?

---

### Lab 5: Build a Tool

**Objective:** Create a custom tool that a language model can call.

**Duration:** 60 minutes

**Setup:** Any tool-capable model (check Model Browser for tool-use badge)

**Instructions:**
1. Open the **Tool Workshop**
2. Start from the "Calculator" template to understand the format
3. Create a new tool from scratch:
   - **Name:** `word_count`
   - **Description:** "Count the number of words in a given text"
   - **Parameters:** `text` (string, required)
   - **Implementation:** Write the JavaScript function
4. View the auto-generated JSON Schema
5. Return to Chat Diagnostics and ask: "How many words are in the sentence: The quick brown fox jumps over the lazy dog?"
6. Observe the tool call in the **Tools** tab

**Questions for students:**
- How does the model decide when to call a tool vs answer directly?
- What happens if the tool description is vague?
- What happens if you change the description to be misleading?
- Why is the JSON Schema important for the model?

---

### Lab 6: Training Data Curation

**Objective:** Build a small curated dataset from AI interactions.

**Duration:** 60 minutes

**Setup:** LLMxRay with some prior chat sessions

**Instructions:**
1. Use Chat Diagnostics to have 5-10 conversations on a specific topic (e.g., "Explain Python concepts")
2. Open the **AI Training** page
3. Review the collected training pairs
4. For each pair, decide: Accept (good response), Reject (bad response), or Edit (fixable response)
5. Tag accepted pairs by subtopic (e.g., "loops", "functions", "classes")
6. Export the curated dataset
7. Examine the exported format

**Questions for students:**
- What makes a "good" training pair vs a "bad" one?
- How would this dataset be used to fine-tune a model?
- What biases might exist in your curated data?
- How many pairs would you need for meaningful fine-tuning?

---

## Hardware Requirements

### Minimum (small models only)
- **RAM:** 8 GB
- **Storage:** 10 GB free
- **GPU:** Not required (CPU inference works)
- **Models:** 1B-3B parameter models (e.g., `llama3.2:1b`)

### Recommended (for all labs)
- **RAM:** 16 GB
- **Storage:** 20 GB free
- **GPU:** 6+ GB VRAM (significantly faster inference)
- **Models:** Up to 7B-8B parameter models

### Computer Lab Setup
- **Per-student install:** Each machine runs Ollama + LLMxRay independently
- **Shared Ollama server:** One powerful machine runs Ollama, students connect via LLMxRay Settings (change Ollama URL). Requires network access on port 11434.
- **Docker deployment:** Use `docker compose` for consistent environments:

```bash
docker compose -f docker-compose.example.yml up
```

## Assessment Ideas

| Lab | Assessment Method |
|---|---|
| Token Exploration | Written report comparing temperature effects with screenshots |
| Model Comparison | Data table with metrics + 500-word analysis |
| Benchmark | Slide deck presenting results with radar charts |
| Embedding Spaces | Jupyter notebook with similarity matrices and analysis |
| Build a Tool | Live demo of working tool + code review |
| Training Data | Exported dataset + reflection on curation decisions |

## Getting Help

- **[GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions/categories/help)** — Post questions in the Help category
- **[Documentation](https://lognebudo.github.io/llmxray/docs/en/guide/)** — Full user guide with feature walkthroughs
- **[Bug Reports](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Report issues with structured templates

---

*Using LLMxRay in your course? We'd love to hear about it. Open a [Model Insights discussion](https://github.com/LogneBudo/llmxray/discussions/categories/model-insights) and share your experience.*
