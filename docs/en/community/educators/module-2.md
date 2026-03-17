# Module 2: How Does Temperature Work?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**The Experimenter** — Find the phase transition

**Duration:** 60 min | **Difficulty:** Beginner | **Prerequisite:** [Module 1](./module-1)

</div>

## The Aha Moment

> Temperature isn't a creativity dial — it's a probability redistribution. And it doesn't degrade gradually. There's a cliff.

Students discover that temperature controls a mathematical transformation of the probability distribution over the vocabulary. Small changes near the cliff produce dramatic quality shifts — a phase transition, not a linear scale.

![How Temperature Reshapes the Probability Distribution](/educators/temperature-distribution.svg)

---

## Conceptual Background

### What temperature actually does

After the model computes a score (logit) for every token in the vocabulary, these scores are passed through a **softmax function** to produce probabilities. Temperature modifies this softmax:

**Standard softmax:**
```
P(token_i) = exp(z_i) / sum_j exp(z_j)
```

**Softmax with temperature T:**
```
P(token_i) = exp(z_i / T) / sum_j exp(z_j / T)
```

The effect:
- **T &lt; 1** — Divides logits by a number less than 1, making large logits even larger relative to small ones. The distribution becomes **sharper** (more peaked). The top token dominates.
- **T = 1** — No modification. The distribution is as the model computed it.
- **T &gt; 1** — Divides logits by a number greater than 1, compressing all logits toward zero. The distribution becomes **flatter** (more uniform). All tokens become roughly equally likely.
- **T → 0** — The distribution collapses to a single point. Only the highest-logit token has non-zero probability. This is **greedy decoding**.

### Why this matters

Temperature is the most commonly adjusted parameter when using LLMs, but it's widely misunderstood. People describe it as "creativity vs accuracy" — but that's a simplification. What it actually controls is the **entropy of the sampling distribution**.

Low entropy = predictable, repetitive output. High entropy = diverse, surprising, but potentially nonsensical output. The right setting depends entirely on the task.

### The phase transition

Unlike a volume dial that smoothly goes from quiet to loud, temperature exhibits a **phase transition**. Output quality stays high across a wide range (T=0 to T≈0.8-1.0), then drops off sharply in a narrow band. This is because:

1. At low temperatures, the top token has such high probability that sampling is nearly deterministic regardless
2. At moderate temperatures, the top 3-5 tokens share most of the probability — still reasonable choices
3. At a critical point, enough probability leaks to implausible tokens that the model starts generating incoherent text
4. Beyond the cliff, output becomes essentially random

![The Temperature Cliff](/educators/temperature-cliff.svg)

### Other sampling methods

Temperature is not the only way to control token selection. Modern LLMs support several sampling strategies that can be combined:

![Sampling Methods Compared](/educators/sampling-methods.svg)

| Method | What it does | When to use |
|---|---|---|
| **Greedy (T=0)** | Always picks the highest-probability token | Factual answers, deterministic output |
| **Temperature** | Reshapes the probability distribution | General-purpose control of output variety |
| **Top-k** | Samples from only the k highest-probability tokens | Simple diversity control, fixed candidate set |
| **Top-p (nucleus)** | Samples from the smallest set of tokens whose cumulative probability exceeds p | Adaptive diversity — more options when uncertain, fewer when confident |
| **Min-p** | Removes tokens with probability below a fraction of the top token | Newer alternative to top-p, more intuitive threshold |
| **Mirostat** | Dynamically adjusts sampling to maintain a target perplexity | Consistent "surprise level" regardless of context |
| **Repetition penalty** | Reduces probability of recently generated tokens | Prevents loops and repetitive text |

::: info These methods compose
In practice, multiple methods are applied in sequence: temperature first (reshapes distribution), then top-k or top-p (truncates the distribution), then sampling from what remains. LLMxRay's Compare feature lets you test different combinations side by side.
:::

---

## Hands-On Exercises

### Exercise 1: The temperature sweep

**What to do:**

1. Open **Compare** in LLMxRay
2. Click **Temperature Sweep** preset — this creates 3 slots with temperatures 0.2, 0.7, and 1.2
3. Add a 4th slot manually and set it to 2.0
4. Use this prompt: *"Write a function in Python to check if a number is prime"*
5. Click **Run All** and watch all 4 generate simultaneously
6. Compare the results in **Grid View**

**What to observe:**

- **T=0.2**: Clean, standard implementation. Almost identical if you run it again.
- **T=0.7**: Slight variations in variable names or comments. Still correct.
- **T=1.2**: More creative approaches (maybe a different algorithm), but watch for subtle bugs.
- **T=2.0**: Variable names become strange, logic errors appear, possibly incomplete.

Switch to **Diff View** to see exactly which words changed between the outputs.

**Key question:** Between which two temperatures does the quality drop feel sharpest?

---

### Exercise 2: Finding the cliff

**What to do:**

1. Stay in **Compare**. Set up 4 slots with temperatures: 0.7, 0.9, 1.1, 1.3
2. Prompt: *"Write a function in Python to check if a number is prime"*
3. Run 3 times. For each run, mark whether each slot produced correct code (Yes/No)
4. Record your results in a table:

| Temperature | Run 1 | Run 2 | Run 3 | Correct rate |
|---|---|---|---|---|
| 0.7 | | | | /3 |
| 0.9 | | | | /3 |
| 1.1 | | | | /3 |
| 1.3 | | | | /3 |

5. The cliff is where the correct rate drops sharply — usually between T=0.9 and T=1.2

**Why this matters:**

This demonstrates that temperature isn't a linear trade-off. There's a **narrow band** where output goes from "almost always correct" to "usually wrong." Finding this cliff for your specific model and task is one of the most practical skills in prompt engineering.

---

### Exercise 3: Temperature vs task type

**What to do:**

1. Set up 2 slots: both using the same model, one at T=0.2, the other at T=1.0
2. **Factual prompt:** *"What is the capital of France?"*
   - Run it. Both should say "Paris." Low temperature adds nothing here.
3. **Creative prompt:** *"Write a haiku about debugging code at midnight"*
   - Run it 3 times. Compare the variety.
   - At T=0.2, you'll get nearly the same haiku every time.
   - At T=1.0, you'll get genuinely different creative expressions.
4. **Reasoning prompt:** *"A farmer has 15 sheep. All but 8 run away. How many sheep does the farmer have left?"*
   - This is a trick question (answer: 8, not 7). Test at both temperatures.
   - Does temperature affect reasoning accuracy?

**Discussion:** Why is there no single "best" temperature? What temperature would you choose for:
- A customer support chatbot?
- A creative writing assistant?
- A code completion tool?
- A medical information system?

---

### Exercise 4: Determinism and seeds

**What to do:**

1. In **Compare**, use the **Deterministic Pair** preset — two slots with the same model, same settings, same seed, T=0
2. Run the same prompt 3 times
3. All outputs should be **identical** — the seed makes the random number generator reproducible
4. Now change one slot to T=0.7 (keep the same seed)
5. Run again 3 times — outputs will now differ between runs

**What this reveals:**

- At T=0 (greedy), the seed doesn't matter — there's no randomness to control
- At T>0, the seed controls which random path is taken through the distribution
- Same seed + same temperature = reproducible "randomness"
- This is how researchers ensure experiment reproducibility while still using stochastic decoding

::: tip Why reproducibility matters
In research and production, you need to reproduce specific outputs for debugging, comparison, and audit. Setting a fixed seed with a moderate temperature gives you **controlled variety** — different from greedy (always the same) but reproducible when needed.
:::

---

## Key Takeaways

1. **Temperature is a mathematical operation** — it divides logits by T before softmax, reshaping the probability distribution
2. **The cliff is real** — quality doesn't degrade linearly; there's a sharp transition where output goes from reliable to chaotic
3. **There's no universal best temperature** — the optimal value depends on the task (factual, creative, reasoning)
4. **Temperature composes with other methods** — top-k, top-p, and repetition penalty work alongside temperature
5. **Seeds enable reproducibility** — fixed seed + fixed temperature = same output every time

---

## Discussion Questions

1. If a company deploys a chatbot at T=0 for safety, what do they lose? Is deterministic output always "safer"?
2. The cliff position varies by model. Why might a 70B model have a higher cliff temperature than a 3B model?
3. Creative writing assistants often use T=0.8-1.0. But whose creativity is it — the user's or the model's? Does temperature change this?
4. If you could only adjust one parameter (temperature, top-k, or top-p), which would you choose and why?

---

## Further Reading

### Academic Papers

| Paper | Authors | Year | Link |
|---|---|---|---|
| Distilling the Knowledge in a Neural Network | Hinton, Vinyals, Dean | 2015 | [arXiv:1503.02531](https://arxiv.org/abs/1503.02531) |
| The Curious Case of Neural Text Degeneration | Holtzman, Buys, Du, Forbes, Choi | 2019 | [arXiv:1904.09751](https://arxiv.org/abs/1904.09751) |
| Hierarchical Neural Story Generation | Fan, Lewis, Dauphin | 2018 | [arXiv:1805.04833](https://arxiv.org/abs/1805.04833) |
| Mirostat: A Neural Text Decoding Algorithm | Basu, Ramachandran, Keskar, Varshney | 2020 | [arXiv:2007.14966](https://arxiv.org/abs/2007.14966) |
| Phase Transitions in the Output Distribution of LLMs | — | 2024 | [arXiv:2405.17088](https://arxiv.org/abs/2405.17088) |
| Turning Up the Heat: Min-p Sampling | — | 2024 | [arXiv:2407.01082](https://arxiv.org/abs/2407.01082) |
| The Effect of Sampling Temperature on Problem Solving in LLMs | Renze, Guven | 2024 | [arXiv:2402.05201](https://arxiv.org/abs/2402.05201) |
| CTRL: Conditional Transformer for Controllable Generation | Keskar, McCann, Varshney, Xiong, Socher | 2019 | [arXiv:1909.05858](https://arxiv.org/abs/1909.05858) |

### Tutorials and Explanations

| Resource | Author | Link |
|---|---|---|
| The Unreasonable Effectiveness of Recurrent Neural Networks | Andrej Karpathy | [karpathy.github.io](http://karpathy.github.io/2015/05/21/rnn-effectiveness/) |
| Generation Configurations: Temperature, Top-k, Top-p | Chip Huyen | [huyenchip.com](https://huyenchip.com/2024/01/16/sampling.html) |
| Controllable Neural Text Generation | Lilian Weng | [lilianweng.github.io](https://lilianweng.github.io/posts/2021-01-02-controllable-text-generation/) |
| Sampling Parameters Explained: Intuition to Math | Let's Data Science | [letsdatascience.com](https://letsdatascience.com/blog/llm-sampling-temperature-top-k-top-p-and-min-p-explained) |
| Decoding Strategies in Large Language Models | mlabonne (HuggingFace) | [huggingface.co/blog](https://huggingface.co/blog/mlabonne/decoding-strategies) |

### Interactive Tools

| Tool | Link | What it does |
|---|---|---|
| Transformer Explainer | [poloclub.github.io](https://poloclub.github.io/transformer-explainer/) | Full transformer visualization with live temperature slider |
| LLM Sampling Visualizer | [louis-7.github.io](https://louis-7.github.io/llm-sampling-visualizer/) | Adjust temperature, top-k, top-p and see distributions change |
| Temperature & Top-k Visualizer | [andreban.github.io](https://andreban.github.io/temperature-topk-visualizer/) | Focused demo for temperature and top-k effects |

### Key Concepts

**The origin of softmax temperature** comes from Hinton et al. (2015), who introduced it for knowledge distillation — transferring knowledge from a large model to a small one by "softening" the probability distribution. The same parameter was later adopted for controlling text generation diversity.

**Nucleus sampling (top-p)** was introduced by Holtzman et al. (2019) as a response to the observation that standard sampling with temperature produces either too-generic (low T) or too-random (high T) text. Their insight: instead of a fixed temperature, truncate the distribution to the smallest set of tokens covering a cumulative probability threshold. This adapts automatically — when the model is confident, fewer tokens are considered; when uncertain, more options remain.

**The phase transition is real, not a metaphor.** Research by multiple teams (arXiv:2405.17088) using methods from statistical physics has shown that LLM output undergoes genuine phase transitions at specific temperature thresholds — with divergent statistical quantities at the transition points, just like phase transitions in physical systems.

**Mirostat** (Basu et al., 2020) takes a different approach by targeting a specific perplexity level rather than a fixed distribution shape. It dynamically adjusts the sampling to maintain consistent "surprise" regardless of whether the model is generating a predictable phrase or navigating uncertain territory.

---

## Assessment

**Option A — Data collection (individual, 1 page):**
Run the cliff-finding experiment (Exercise 2) with 5 temperature values and 5 runs each. Present a table and line chart of correctness rate vs temperature. Identify the cliff point for your model.

**Option B — Comparative analysis (pairs, 1 page):**
Test the same prompt across 3 task types (factual, creative, reasoning) at 4 temperatures. For each combination, rate the output quality on a 1-5 scale. Present a heatmap and recommend optimal temperatures per task type.

**Option C — Technical explanation (individual, 500 words):**
Explain to a non-technical product manager why their chatbot should NOT use T=0, despite it being "the safest option." Use specific examples from your experiments.

---

## What's Next

In **[Module 3: Can AI Lie?](./module-3)**, you'll use what you learned about probability distributions to understand **confidence vs truth**. A model can assign 95% probability to the wrong answer — and you'll discover why through benchmarks with real logprobs.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 2 of 8** in the LLMxRay Educators Kit
[&larr; Module 1: What Is a Token?](./module-1) | [Back to Curriculum](./index) | [Module 3: Can AI Lie? &rarr;](./module-3)

</div>
