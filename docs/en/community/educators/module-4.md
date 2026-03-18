# Module 4: What Does the Model See?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**The Explorer** — Map meaning in vector space

**Duration:** 45 min | **Difficulty:** Intermediate | **Prerequisite:** [Module 1](./module-1), [Module 3](./module-3)

</div>

## The Aha Moment

> Embeddings capture topic, not sentiment — "I love this" and "I hate this" are similar to the model because they share the same topic.

This insight breaks the intuition that opposite feelings must mean opposite representations. Students expect that flipping the emotion of a sentence would send its embedding to the other side of vector space. Instead, they discover that embedding models encode **what a text is about** — the shared subject, the domain, the context — far more strongly than **how the author feels** about it. The vector for "I love this movie" sits close to "I hate this movie" because both are about movies and personal reactions to them.

Understanding this changes how students think about search, retrieval, and recommendation systems. When a RAG system finds documents "similar" to your query, it is matching on topic and context — not on agreement or sentiment. A search for "benefits of remote work" will also retrieve documents about "problems with remote work" because they share the same semantic neighborhood.

---

## Conceptual Background

### What are embeddings?

An **embedding** is a fixed-length vector of floating-point numbers that represents the meaning of a piece of text. When you pass a sentence to an embedding model, it returns something like:

```
"The cat sat on the mat" → [0.023, -0.187, 0.541, ..., -0.092]
                            ← 768 or 1024 dimensions →
```

This vector is not human-readable. You cannot look at dimension 347 and say "this is the cat-ness dimension." But collectively, the pattern of activations across all dimensions encodes semantic information — topic, register, grammatical structure, domain — in a way that allows mathematical comparison.

Embeddings are the bridge between human language and machine computation. Text is messy, variable-length, and ambiguous. Vectors are fixed-length, numerical, and can be compared with simple arithmetic.

![How Embeddings Work](/educators/embedding-pipeline.svg)

### Why vectors? Similarity as distance

The power of embeddings comes from a simple principle: **similar meanings produce similar vectors**. This is measured using **cosine similarity** — the cosine of the angle between two vectors in high-dimensional space.

| Cosine similarity | Interpretation |
|---|---|
| **1.0** | Identical meaning (same text or paraphrase) |
| **0.7 - 0.9** | Closely related (same topic, similar context) |
| **0.4 - 0.7** | Somewhat related (overlapping themes) |
| **0.0 - 0.4** | Unrelated (different topics entirely) |
| **Negative** | Rare in practice with modern models |

This makes embeddings the foundation of:
- **Semantic search** — find documents by meaning, not keywords
- **RAG (Retrieval-Augmented Generation)** — feed relevant context to a generative model
- **Clustering** — group similar documents automatically
- **Anomaly detection** — find the document that doesn't belong

### Topic vs sentiment — the key insight

Here is where intuition fails. Consider these three sentences:

1. "I love this movie, the acting was brilliant"
2. "I hate this movie, the acting was terrible"
3. "The cat sat on the mat"

Most people expect (1) and (2) to be **far apart** because the sentiments are opposite. But embedding models place (1) and (2) **close together** — and both far from (3).

Why? Because cosine similarity captures **shared context**: both sentences are about movies, about acting quality, about personal evaluation of entertainment. They share vocabulary ("movie", "acting"), grammatical structure (subject + opinion + reason), and domain (film critique). The single word "love" vs "hate" contributes far less to the overall vector than the overwhelming topical overlap.

This is not a flaw. Embedding models are trained on objectives like "predict whether these two sentences appeared near each other in a document" or "are these two texts about the same thing." These objectives optimize for **topical relatedness**, not sentiment polarity.

![Topic vs Sentiment in Vector Space](/educators/topic-vs-sentiment.svg)

::: warning Sentiment analysis requires different tools
If you need to detect sentiment, you need a model trained specifically for that task (a classifier), or you need to prompt a generative model to reason about sentiment explicitly. General-purpose embedding models are not designed to separate "love" from "hate" — they are designed to separate "movies" from "cats."
:::

### Dimensionality — what each dimension "means"

Embedding models produce vectors with hundreds or thousands of dimensions:

| Model | Dimensions |
|---|---|
| all-minilm | 384 |
| nomic-embed-text | 768 |
| mxbai-embed-large | 1024 |
| bge-m3 | 1024 |

A natural question: what does each dimension represent? The answer is: **nothing individually, everything collectively**. Each dimension is a learned numerical feature that, in isolation, has no interpretable meaning. But the pattern across all dimensions together encodes rich semantic information.

This is analogous to how RGB values work in images. Knowing that a pixel has R=200 tells you almost nothing. But the combination R=200, G=100, B=50 tells you it's a warm orange. Similarly, any single dimension of an embedding is meaningless, but the full vector encodes meaning.

Some dimensions will activate strongly for certain concepts (you might notice dimension 142 tends to be high for legal text and low for cooking recipes), but these are **distributed representations** — meaning is spread across many dimensions, and each dimension participates in representing many different concepts.

### How embedding models differ from generative models

This is a common source of confusion. The models you chat with (llama3, mistral, deepseek) and the models that produce embeddings (nomic-embed-text, bge-m3) are architecturally different:

| Aspect | Generative model | Embedding model |
|---|---|---|
| **Architecture** | Decoder-only transformer | Encoder-only or encoder-decoder |
| **Training objective** | Predict the next token | Produce similar vectors for related texts |
| **Output** | One token at a time (streaming) | One fixed-length vector per input |
| **Input processing** | Sees tokens left-to-right | Sees all tokens simultaneously (bidirectional) |
| **Use case** | Conversation, generation, reasoning | Search, retrieval, clustering, classification |

Embedding models are typically much smaller and faster than generative models. Producing an embedding for a paragraph takes milliseconds, not seconds. This is why RAG systems can search through thousands of documents in real time — the heavy computation (embedding each document) is done once, and comparison is just arithmetic.

![Embedding Model Comparison](/educators/embedding-models.svg)

---

## Hands-On Exercises

### Exercise 1: The sentiment trap

**What to do:**

1. Open the **Embeddings** page in LLMxRay and go to the **Similarity Calculator**
2. Make sure you have an embedding model pulled in Ollama (nomic-embed-text is recommended)
3. Compare these two sentences:
   - Text A: *"I love this movie"*
   - Text B: *"I hate this movie"*
4. Record the cosine similarity score
5. Now compare:
   - Text A: *"I love this movie"*
   - Text B: *"The cat sat on the mat"*
6. Record the cosine similarity score

::: warning You need an embedding model pulled in Ollama
Before starting these exercises, make sure you have at least one embedding model available. Run `ollama pull nomic-embed-text` in your terminal. For Exercise 3, you will also want `ollama pull bge-m3` for multilingual comparison.
:::

**What you'll discover:**

The similarity between "I love this movie" and "I hate this movie" will be **surprisingly high** (typically 0.85-0.95). The similarity between "I love this movie" and "The cat sat on the mat" will be **much lower** (typically 0.2-0.4).

This is the aha moment: the model sees these sentences as "both about movies" vs "one about movies, one about cats." Sentiment barely moves the needle.

**Try more pairs:**
- "This restaurant is amazing" vs "This restaurant is terrible" (high similarity)
- "This restaurant is amazing" vs "Quantum mechanics describes particle behavior" (low similarity)
- "I'm happy" vs "I'm sad" (higher than you expect)

---

### Exercise 2: Embedding a single word

**What to do:**

1. Go to the **Embed Playground** in the Embeddings page
2. Embed each of these words individually:
   - *"king"*
   - *"queen"*
   - *"man"*
   - *"woman"*
3. For each word, observe the **vector visualization** — the bar chart showing positive (blue) and negative (red) activations across dimensions
4. Note the statistics displayed: dimensionality, L2 norm, sparsity percentage, inference time

**What to observe:**

- The visualizations for "king" and "queen" share visible patterns — clusters of dimensions that activate similarly, reflecting shared "royalty" semantics
- "man" and "woman" also share patterns — reflecting shared "human/person" semantics
- The sparsity stat tells you what percentage of dimensions are near zero. Most dimensions carry some signal; embeddings are **dense** representations
- Individual dimensions spike positive or negative, but no single spike means anything on its own — it's the full pattern that matters

**Reflection:**

The famous Word2Vec result `king - man + woman ≈ queen` demonstrated that embeddings encode **relational structure**. Modern embedding models are far more sophisticated, but the principle holds: semantic relationships are geometric relationships in vector space.

---

### Exercise 3: Cross-language similarity

**What to do:**

1. In the **Similarity Calculator**, select **bge-m3** as your embedding model (a multilingual model)
2. Compare:
   - Text A: *"The weather is nice today"*
   - Text B: *"Il fait beau aujourd'hui"* (French equivalent)
3. Record the cosine similarity score
4. Now switch to **nomic-embed-text** (primarily English) and run the same comparison
5. Record the second score and compare

**What you'll discover:**

With bge-m3 (multilingual), the English and French sentences will have **high similarity** (typically 0.75-0.90) because the model was trained on parallel text across languages and learned that these sentences mean the same thing.

With nomic-embed-text (English-focused), the similarity will be **noticeably lower** because the model has less training signal to align French and English representations.

**Try more pairs:**
- "Good morning" vs "Bonjour" (greeting concept)
- "Machine learning is transforming industry" vs "L'apprentissage automatique transforme l'industrie"
- Try a language more distant from English — German, Chinese, Arabic — and see if the gap widens

**Why this matters:**

Multilingual embedding models are the foundation of cross-language search. A user searching in French can find relevant English documents — not through translation, but because the model maps both languages into a shared semantic space. This is how multilingual RAG systems work.

---

### Exercise 4: Model comparison

**What to do:**

1. Go to the **Model Comparison** tab in the Embeddings page
2. Enter the text: *"Artificial intelligence is changing how we work and live"*
3. Select two models: **nomic-embed-text** and **mxbai-embed-large**
4. Run the embedding and compare:
   - **Dimensions**: How many numbers does each model produce?
   - **L2 norm**: How "long" is each vector?
   - **Sparsity**: What percentage of dimensions are near zero?
   - **Inference time**: How long did each model take?

**What to observe:**

| Metric | What it tells you |
|---|---|
| **Dimensions** | Higher dimensions can capture more nuance, but cost more storage and computation |
| **L2 norm** | Some models normalize vectors (L2 norm ≈ 1.0), others don't. Normalized vectors make cosine similarity equivalent to dot product. |
| **Sparsity** | Low sparsity means most dimensions carry signal. High sparsity could indicate the model is "wasting" capacity. |
| **Inference time** | Larger models take longer. For real-time search, speed matters. |

**Discussion:**

- Is a 1024-dimension embedding "better" than a 768-dimension one?
- If you were building a search system over 10 million documents, would you prefer fewer dimensions (faster) or more dimensions (potentially more accurate)?
- Does the inference time difference matter for batch processing vs real-time queries?

---

## Key Takeaways

1. **Embeddings are dense vectors** that encode the meaning of text in a format computers can compare mathematically.
2. **Cosine similarity captures topical relatedness**, not sentiment. Opposite opinions on the same topic produce similar embeddings.
3. **No single dimension has meaning** — semantic information is distributed across all dimensions collectively.
4. **Multilingual models map languages into a shared space**, enabling cross-language search and retrieval without translation.
5. **Embedding models are not generative models** — they are smaller, faster, bidirectional encoders designed for representation, not generation.

---

## Discussion Questions

1. If embeddings capture topic but not sentiment, how should a product review system be designed? Can you combine embeddings with something else to get both?
2. A company wants to build a multilingual customer support search system. Based on your experiments, would you recommend one large multilingual model or separate models per language? What are the trade-offs?
3. Embedding dimensions are often 768 or 1024. Why not 10,000? Why not 50? What constraints determine the "right" dimensionality?
4. The famous `king - man + woman = queen` analogy works in embedding space. Can you think of an analogy that would NOT work? What would that tell you about the model's training data?
5. RAG systems use embeddings to find relevant documents. Given that embeddings capture topic but not sentiment, what failure modes should you expect when a user asks a sentiment-sensitive question like "What do customers dislike about our product?"

---

## Further Reading

### Academic Papers

| Paper | Authors | Year | Link |
|---|---|---|---|
| Efficient Estimation of Word Representations in Vector Space | Mikolov, Chen, Corrado, Dean | 2013 | [arXiv:1301.3781](https://arxiv.org/abs/1301.3781) |
| GloVe: Global Vectors for Word Representation | Pennington, Socher, Manning | 2014 | [aclanthology.org](https://aclanthology.org/D14-1162/) |
| Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks | Reimers, Gurevych | 2019 | [arXiv:1908.10084](https://arxiv.org/abs/1908.10084) |
| MTEB: Massive Text Embedding Benchmark | Muennighoff et al. | 2023 | [arXiv:2210.07316](https://arxiv.org/abs/2210.07316) |
| Matryoshka Representation Learning | Kusupati et al. | 2022 | [arXiv:2205.13147](https://arxiv.org/abs/2205.13147) |

### Tutorials and Visual Explanations

| Resource | Author | Link |
|---|---|---|
| The Illustrated Word2Vec | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-word2vec/) |
| Some Intuition on Word Embeddings | Lilian Weng | [lilianweng.github.io](https://lilianweng.github.io/posts/2017-10-15-word-embedding/) |

---

## Assessment

**Option A — Exploration report (individual, 1 page):**
Using the Similarity Calculator, test 10 sentence pairs of your choosing — mix topics, sentiments, and languages. Present a table of pairs and their cosine similarity scores. For each pair, explain whether the score matched your intuition and why it did or didn't.

**Option B — Model evaluation (pairs, 1 page):**
Embed the same set of 10 sentences with two different models (e.g., nomic-embed-text vs bge-m3). Compare the similarity matrices. Where do the models agree? Where do they disagree? Hypothesize why, based on what you know about each model's training.

**Option C — System design (groups of 2-3, 5-minute presentation):**
Design a document search system for a university library. Specify which embedding model you would use, how you would handle multilingual documents, and what limitations you would warn users about (hint: topic vs sentiment). Present your architecture and justify every choice with evidence from your LLMxRay experiments.

---

## What's Next

In **[Module 5: When Does the Model Forget?](./module-5)**, you'll explore the context window — the finite amount of text a model can "see" at once. You'll discover what happens when a conversation exceeds the limit, why models lose track of instructions buried in long prompts, and how context length shapes what LLMs can and cannot do.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 4 of 8** in the LLMxRay Educators Kit
[&larr; Module 3: Can AI Lie?](./module-3) | [Back to Curriculum](./index) | [Module 5: When Does the Model Forget? &rarr;](./module-5)

</div>
