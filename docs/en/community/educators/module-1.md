# Module 1: What Is a Token?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**The Observer** — See the invisible

**Duration:** 45 min | **Difficulty:** Beginner | **Prerequisite:** None

</div>

## The Aha Moment

> AI doesn't think in words. It thinks in tokens. And tokens aren't what you expect.

This is the foundational insight that changes everything about how students understand language models. Every concept that follows — temperature, context windows, embeddings, tool calling — depends on understanding what tokens really are.

---

## Conceptual Background

### What is a token?

A **token** is the smallest unit of text that a language model processes. Tokens are not words, not characters, not syllables — they are **subword units** determined by a statistical algorithm trained on a large corpus.

The dominant algorithm is **Byte-Pair Encoding (BPE)**, introduced to NLP by Sennrich et al. (2016). BPE starts with individual characters and iteratively merges the most frequent adjacent pairs until reaching a target vocabulary size (typically 32,000-128,000 tokens).

For example, the word "understanding" might be tokenized as:
- `["under", "stand", "ing"]` (3 tokens)

While "AI" might be:
- `["AI"]` (1 token — it's common enough to be a single entry)

### Why does tokenization matter?

Every aspect of LLM behavior is measured in tokens:

| Aspect | Token impact |
|---|---|
| **Cost** | API pricing is per-token |
| **Speed** | Models generate one token per inference step |
| **Context window** | The maximum number of tokens the model can see at once |
| **Quality** | Token boundaries affect what the model can "see" within a word |
| **Fairness** | Languages with fewer tokens in the vocabulary require more tokens per sentence |

### How BPE works (simplified)

1. Start with all individual bytes (256 base tokens)
2. Count all adjacent pairs in the training corpus
3. Merge the most frequent pair into a new token
4. Repeat until reaching the target vocabulary size

This means:
- Common words become single tokens: `"the"`, `"and"`, `"is"`
- Rare words are split into pieces: `"tokenization"` → `["token", "ization"]`
- Very rare words go down to individual characters

The LLaMA 3 family uses a BPE tokenizer with a 128,000-token vocabulary, trained primarily on English text (Grattafiori et al., 2024).

---

## Hands-On Exercises

### Exercise 1: See tokens arrive in real-time

**What to do:**

1. Open **Chat Diagnostics** in LLMxRay and select a model (e.g., `llama3.2`)
2. Send: *"Explain what gravity is in one sentence"*
3. Watch the tokens stream in one by one — each token appears as the model produces it
4. Open the **Stream** tab — see each token with its timestamp and inter-token latency
5. Notice the **confidence coloring**: green tokens arrived fast (high confidence), orange/red tokens arrived slowly (lower confidence)

**What to observe:**

- Tokens are not always complete words. You'll see partial words, punctuation, and spaces as separate tokens.
- Some tokens arrive almost instantly (the model was very certain). Others take longer (the model was "choosing" between options).
- The first token takes the longest (Time to First Token / TTFT) — this is when the model processes your entire prompt.

::: info What is confidence coloring?
LLMxRay approximates token confidence from **inter-token latency**. Faster generation suggests the model had a dominant next-token prediction. This is a practical approximation — for mathematically precise confidence, the Benchmark feature uses real logprobs from the OpenAI-compatible endpoint. See Module 3 for the full story on confidence vs truth.
:::

---

### Exercise 2: The tokenizer shock

**What to do:**

1. In chat, ask: *"Count the letters in the word 'strawberry'"*
2. The model will likely say 10 — but `strawberry` has 10 letters with 3 r's. Many models count 2 r's, not 3.
3. Now ask: *"How many words are in this sentence: The quick brown fox jumps over the lazy dog"*
4. The model gets this right (9 words) — word counting is easier than letter counting

**Why this happens:**

The word `strawberry` is tokenized as something like `["str", "aw", "berry"]` — the model never sees the individual letters. It processes these chunks as atomic units. Counting letters requires character-level reasoning, but the model operates at the token level.

This is not a bug — it's a fundamental consequence of subword tokenization. The model literally cannot "see" individual letters within a token.

::: tip Try it yourself
Visit the [Tiktokenizer playground](https://tiktokenizer.vercel.app/) or the [HuggingFace Tokenizer Playground](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) to visualize how different models tokenize the same text. Compare how `llama` and `gpt-4` tokenize `"strawberry"` — they may split it differently.
:::

**Research context:** Fu et al. (2024) conducted a systematic study of this phenomenon in their paper *"Why Do Large Language Models Struggle to Count Letters?"* They found that errors correlate strongly with letter frequency and word length, not with how often the word appears in training data — confirming that the limitation is architectural (tokenization), not a knowledge gap.

---

### Exercise 3: Language bias in tokenization

**What to do:**

1. Send this prompt to the model: *"Say hello in one sentence"*
2. Open the **Stream** tab and count the tokens in the response
3. Now send: *"Dis bonjour en une phrase"* (same request in French)
4. Count the tokens again — the French response will likely use more tokens
5. Try the same in German, Spanish, Chinese, Arabic, or any other language you know
6. Record the token counts for each language

**What you'll discover:**

The same semantic content requires **significantly more tokens** in non-English languages. This isn't because French is "more complex" — it's because the tokenizer's vocabulary was built primarily from English text.

| Language | Typical token ratio vs English |
|---|---|
| English | 1.0x (baseline) |
| French | 1.3-1.5x |
| German | 1.4-1.6x |
| Chinese | 1.5-2.0x |
| Arabic | 2.0-3.0x |
| Some African languages | Up to 5-15x |

**Why this matters in practice:**

- A French user hits the context window limit **30-50% sooner** than an English user
- API costs are **proportionally higher** for non-English languages
- Generation is **slower** (more tokens to produce for the same content)
- Quality may degrade because the model has fewer "thinking tokens" available

::: warning This is an active area of research
Petrov et al. (2023) showed in their NeurIPS paper *"Language Model Tokenizers Introduce Unfairness Between Languages"* that the same text can require up to **15x more tokens** in some languages compared to English, across 17 different tokenizers. This is not just a theoretical concern — it has real cost, latency, and quality implications.

Explore their [interactive demo](https://aleksandarpetrov.github.io/tokenization-fairness/) to see the disparity across languages.
:::

---

### Exercise 4: Speed and confidence

**What to do:**

1. Have several conversations with the model on different topics
2. For each response, observe the confidence coloring in the token stream
3. Notice patterns:
   - Common phrases ("I think", "The answer is") → green (fast, confident)
   - Technical terms, numbers, proper nouns → more orange (slower, less certain)
   - Creative or unusual phrasing → most orange/red (slowest, least certain)
4. Open two Stream tabs side by side (from different sessions) and compare latency distributions

**What to reflect on:**

- Speed (inter-token latency) is a **proxy** for confidence, not a direct measure
- The model generates "obvious" continuations faster than surprising ones
- This mirrors how the softmax probability distribution works: when one token has much higher probability than the alternatives, the computation resolves faster
- For **precise** confidence measurement, you need actual logprobs — which LLMxRay provides through the Benchmark feature (Module 3)

---

## Key Takeaways

1. **Tokens are the atomic unit** of LLM computation — not words, not characters
2. **BPE tokenization** creates a vocabulary from statistical patterns, not linguistic rules
3. **Token boundaries** determine what the model can and cannot reason about (letter counting, character manipulation)
4. **Language bias** in tokenizers creates measurable unfairness in cost, speed, and quality across languages
5. **Speed correlates with confidence** but is not identical — it's a useful approximation

---

## Discussion Questions

For classroom or seminar discussion:

1. If tokenizers are trained on English-dominated corpora, what would a "fair" multilingual tokenizer look like? Is it even possible with a fixed vocabulary size?
2. The "strawberry" problem shows that models can't reason about characters within tokens. What other seemingly simple tasks might be affected by token boundaries?
3. Should AI companies disclose their tokenizer's language bias? How would this change how non-English-speaking users interact with AI?
4. If you were designing a tokenizer for a specific domain (medical, legal, code), how would you modify the training process?

---

## Further Reading

### Academic Papers

| Paper | Authors | Year | Link |
|---|---|---|---|
| Neural Machine Translation of Rare Words with Subword Units | Sennrich, Haddow, Birch | 2016 | [arXiv:1508.07909](https://arxiv.org/abs/1508.07909) |
| SentencePiece: A simple and language independent subword tokenizer | Kudo, Richardson | 2018 | [arXiv:1808.06226](https://arxiv.org/abs/1808.06226) |
| Language Model Tokenizers Introduce Unfairness Between Languages | Petrov, La Malfa, Torr, Bibi | 2023 | [arXiv:2305.15425](https://arxiv.org/abs/2305.15425) |
| Why Do Large Language Models Struggle to Count Letters? | Fu, Ferrando, Conde, Arriaga, Reviriego | 2024 | [arXiv:2412.18626](https://arxiv.org/abs/2412.18626) |
| Attention Is All You Need | Vaswani et al. | 2017 | [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) |
| The Llama 3 Herd of Models | Grattafiori et al. (Meta AI) | 2024 | [arXiv:2407.21783](https://arxiv.org/abs/2407.21783) |

### Tutorials and Visual Explanations

| Resource | Author | Link |
|---|---|---|
| Let's build the GPT Tokenizer (video, 2h13m) | Andrej Karpathy | [YouTube](https://www.youtube.com/watch?v=zduSFxRajkE) |
| The Illustrated Transformer | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-transformer/) |
| HuggingFace NLP Course, Chapter 6: Tokenizers | Hugging Face | [huggingface.co/learn](https://huggingface.co/learn/llm-course/en/chapter6/5) |
| LLM Sampling Parameters Explained | Let's Data Science | [letsdatascience.com](https://letsdatascience.com/blog/llm-sampling-temperature-top-k-top-p-and-min-p-explained) |

### Interactive Tools

| Tool | Link | What it does |
|---|---|---|
| Tiktokenizer | [tiktokenizer.vercel.app](https://tiktokenizer.vercel.app/) | Visualize GPT tokenization with color coding |
| HuggingFace Tokenizer Playground | [huggingface.co/spaces/Xenova](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) | Compare tokenization across open models (LLaMA, Mistral, etc.) |
| OpenAI Tokenizer | [platform.openai.com/tokenizer](https://platform.openai.com/tokenizer) | Official OpenAI token visualizer |

### Related University Courses

| Course | Institution | Link |
|---|---|---|
| CS224N: NLP with Deep Learning | Stanford | [web.stanford.edu/class/cs224n](https://web.stanford.edu/class/cs224n/) |
| 11-711: Advanced NLP | CMU | [phontron.com/class/anlp2024](https://www.phontron.com/class/anlp2024/) |

---

## Assessment

**Option A — Written reflection (individual, 300 words):**
Describe one thing about tokenization that surprised you, with evidence from your LLMxRay experiments (include screenshots).

**Option B — Data analysis (individual or pairs, 1 page):**
Tokenize the same paragraph in 4+ languages using the HuggingFace Tokenizer Playground. Present a table of token counts, calculate the ratios vs English, and discuss the fairness implications.

**Option C — Presentation (groups of 2-3, 5 minutes):**
Design and present a "tokenization challenge" — a task that LLMs should be able to do but can't because of token boundaries. Demonstrate it live in LLMxRay and explain why the tokenizer is the bottleneck.

---

## What's Next

In **[Module 2: How Does Temperature Work?](./module-2)**, you'll use what you learned about tokens to understand how the model *chooses* between them. Temperature controls the probability distribution over the vocabulary — and you'll discover that it's not a linear dial but a phase transition.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 1 of 8** in the LLMxRay Educators Kit
[Back to Curriculum Overview](./index) | [Next: Module 2 — How Does Temperature Work? &rarr;](./module-2)

</div>
