# Module 8: The Full Picture

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**The Researcher** — Design, execute, and publish original AI research

**Duration:** 120 min | **Difficulty:** Advanced | **Prerequisite:** [Modules 1-7](./index)

</div>

## The Aha Moment

> You can contribute to real AI research — with tools you already know how to use. Every benchmark you run, every calibration error you measure, every comparison you document is a data point the community doesn't have yet.

Over the past seven modules, you have built a complete toolkit for understanding language models from the inside out. You learned to see tokens being generated, to manipulate the randomness that shapes output, to detect fabrication, to navigate vector spaces, to probe the limits of context, to wire models to the outside world, and to measure performance with scientific rigor. Each of those skills was valuable on its own. Together, they make you something more than a student — they make you a researcher.

LLMxRay is not just a learning tool. It is a research instrument. Because it runs entirely on local models via Ollama, every student's setup is a unique test environment. Your hardware, your quantization level, your available VRAM, your context window size — all of these produce results that differ from anyone else's. In traditional AI research, that variation is noise to be eliminated. In community-driven open-model research, that variation is the signal. When thirty students run the same benchmark suite on thirty different machines, the aggregate tells us something no single lab could discover alone: how these models actually behave in the wild, on the hardware real people use.

---

## Conceptual Background

### From observer to researcher

The journey you have taken across this curriculum follows a deliberate arc. **Module 1** taught you to see tokens — the atomic units of language model output — streaming in real time, revealing that text is not generated all at once but word-piece by word-piece. **Module 2** showed you temperature's phase transition: how a single parameter transforms a deterministic machine into a creative one, and how logprobs quantify that transformation. **Module 3** revealed hallucination — the uncomfortable truth that confidence measures pattern frequency, not factual accuracy, and that a model can be 95% sure and completely wrong.

**Module 4** mapped vector space: you discovered that meaning has geometry, that embeddings cluster by topic, and that similarity scores power retrieval systems. **Module 5** exposed memory limits: you watched models lose coherence as context fills, saw how RAG extends knowledge without extending context, and understood the fundamental constraint that every token of context costs attention. **Module 6** connected language to action: you built tools, watched the model decide when and how to call them, and saw the gap between structured function calling and the messy reality of natural language arguments. **Module 7** gave you measurement tools: standardized benchmarks, controlled comparisons, heatmaps, radar charts, calibration analysis, and the scientific method applied to AI evaluation.

Now you combine them all. A research question about calibration draws on Module 3 (hallucination), Module 7 (benchmarking), and Module 2 (temperature effects). A study of embedding quality across languages uses Module 4 (vector space) and Module 5 (retrieval). An investigation of tool-calling reliability needs Module 6 (function calling) and Module 7 (controlled comparison). The modules were never separate subjects — they were facets of a single, deep understanding that you now possess.

### What makes good AI research?

Three principles separate rigorous research from casual experimentation:

**Reproducibility.** The same model, the same seed, the same context, the same temperature must produce the same result. LLMxRay's Deterministic Pair preset in the Compare page exists precisely for this purpose: it locks the random seed so that differences between runs can only come from the variable you are testing. If someone cannot reproduce your result by following your methodology, the result is anecdotal — not scientific.

**Methodology.** Control your variables. Change one thing at a time. Measure what matters, and report what you find — not what you expected to find. A negative result ("temperature had no effect on factual accuracy") is just as valuable as a positive one. The community needs to know what does not work as much as what does.

**Scope.** A focused question answered thoroughly beats a broad survey answered superficially. "How does quantization affect TruthfulQA calibration error in Llama 3.2 models from 1B to 8B?" is a better research question than "Which model is best?" The first can be answered with data. The second cannot.

![The Research Cycle](/educators/research-cycle.svg)

### The LLMxRay research toolkit

Every feature you have used in this curriculum maps to a research capability:

| LLMxRay Feature | Research Capability |
|---|---|
| **Benchmark page** | Standardized evaluation with real logprobs via SSE streaming. Run TruthfulQA, ARC, MMLU-Pro, HellaSwag, GSM8K. Collect accuracy, confidence, calibration error, and per-category breakdowns. |
| **Compare page** | Controlled experiments. Deterministic Pair preset for seed-locked comparisons. Temperature Sweep for parameter studies. Side-by-side diffs, ComparisonMetricsBar for latency and token counts. |
| **Embeddings page** | Semantic analysis. Cosine similarity scores, 2D/3D projections, cluster visualization. Compare embedding models (bge-m3, nomic-embed-text) on the same input. |
| **RAG / Knowledge Base** | Retrieval effectiveness studies. Measure how document chunking, embedding model, and similarity threshold affect answer quality. IndexedDB-stored vectors mean zero cost. |
| **Tool Workshop** | Agent capability testing. Build custom tools, test them in chat, measure success rate, argument accuracy, and failure modes across models. |
| **AI Training page** | Data curation and JSONL export. Curate question-answer pairs, tag them by domain, export training-ready datasets for community sharing. |
| **Session analysis** | Detailed introspection. Token-by-token timing, logprob distributions, `<think>` block parsing for reasoning models, confidence heatmaps. Labeled "Illustrative" for synthetic introspection data. |

![The LLMxRay Research Toolkit](/educators/research-toolkit.svg)

### Contributing to the community

Your research has value beyond your own learning. The LLMxRay project supports three contribution paths:

**Path 1: Custom benchmark suites.** Design 20 or more questions for a specialized domain — French history, music theory, medical terminology, programming concepts, environmental science — anything where you have expertise. Validate your suite by running it on at least two models to ensure the questions discriminate (neither too easy nor too hard). Submit your suite via a GitHub Pull Request to the `community-benchmarks/` directory. Your questions become available to every LLMxRay user.

**Path 2: Custom tool templates.** Build a useful tool in the Tool Workshop — a unit converter, a citation formatter, a language flashcard generator, a code reviewer. Test it in chat across multiple models. Document the tool's schema, expected behavior, and known limitations. Submit it as a PR to `community-tools/`. Your tool becomes a template others can learn from and extend.

**Path 3: Research findings.** Share your results in GitHub Discussions under the "Show and Tell" category. Write up your methodology: which models, which settings, which benchmarks, what you found. Include screenshots of heatmaps, radar charts, confidence scatter plots, and diff views from LLMxRay. Publish your data tables so others can compare. Even a short post documenting one surprising finding ("Phi-3 mini outperforms Llama 3 8B on French TruthfulQA questions") adds to collective knowledge.

![Contribution Paths](/educators/contribution-paths.svg)

::: tip Every setup is unique — and that is valuable
You might think your results on a laptop with 8 GB of RAM and a 4-bit quantized model are "less valid" than results from a workstation with 48 GB of VRAM running full-precision weights. They are not less valid — they are differently informative. Most real users run quantized models on consumer hardware. Your results reflect the actual experience of the majority. Report your hardware specs alongside your findings and let the community draw aggregate conclusions.
:::

---

## Hands-On Exercises

### Exercise 1: Design your research question

**What to do:**

Choose one of the following research directions, or propose your own:

**(a) How does model size affect calibration?**
Select 3 models of different sizes (e.g., Phi-3 mini 3.8B, Llama 3.2 3B, Llama 3.1 8B). Run each through the TruthfulQA benchmark suite. For each model, record overall accuracy and confidence-weighted accuracy. Compare confidence vs accuracy across size classes. Does the larger model "know what it knows" better, or is it simply more confident about everything — including its mistakes?

**(b) Does temperature affect factual accuracy?**
Select one model and run the ARC benchmark at 5 different temperatures (0.1, 0.3, 0.5, 0.7, 1.0). Use the Compare page's Deterministic Pair preset to control for random sampling. Record accuracy at each temperature. Plot the curve. Is there a temperature sweet spot? Does accuracy degrade gradually or collapse suddenly?

**(c) How well do embeddings capture meaning across languages?**
Choose 10 sentence pairs — the same meaning expressed in two languages (e.g., English and French). Generate embeddings using bge-m3 and nomic-embed-text on the Embeddings page. Record cosine similarity for each pair in each model. Which embedding model produces higher cross-lingual similarity? Are some sentence types (factual, emotional, idiomatic) harder to align across languages?

**(d) How reliable is tool calling across model sizes?**
Build 3 tools in the Tool Workshop (e.g., a calculator, a date converter, a unit converter). Test each tool on 3 models of different sizes. For each combination, run 5 prompts that should trigger the tool. Track: Did the model call the right tool? Were the arguments correct? Did it hallucinate a tool that does not exist? Calculate success rate per model per tool.

Before you begin: write a **2-sentence hypothesis**. What do you expect to find, and why? This forces you to commit to a prediction before the data comes in — the foundation of the scientific method.

::: tip How to choose a good research question
The best questions are specific enough to answer in a single session, but interesting enough that the answer is not obvious. "Which model is best?" is too broad. "Does Llama 3.1 8B score higher than Phi-3 mini on ARC science questions about biology?" is focused, testable, and genuinely uncertain.
:::

---

### Exercise 2: Execute the experiment

**What to do:**

1. Open the relevant LLMxRay pages for your chosen research direction
2. Document your experimental setup before you begin:
   - Which models (name, parameter count, quantization level)
   - Which settings (temperature, seed, context length, system prompt)
   - Which benchmark suites or features you will use
   - How many runs per condition (minimum 1 for benchmarks, 3-5 for non-deterministic tasks)
3. Run your experiment systematically:
   - For benchmark studies: use the **Benchmark page** and record all metrics — accuracy, confidence, latency, token counts, per-category breakdowns
   - For comparison studies: use the **Compare page** with the **Deterministic Pair** preset to ensure controlled conditions
   - For embedding studies: use the **Embeddings page** and record cosine similarity scores for every pair
   - For tool-calling studies: use **Chat Diagnostics** with tools enabled and record every tool call, its arguments, and the outcome
4. Take screenshots of key visualizations: heatmaps, radar charts, confidence scatter plots, diff views, embedding projections
5. Record everything in a table — even results that seem uninteresting

**What you'll discover:**

Real research is messy. Models behave unexpectedly. A benchmark run takes longer than you planned. A result contradicts your hypothesis and you have to figure out why. This is not a failure — it is the process. The discipline of recording everything, even the boring parts, is what separates research from casual experimentation.

::: tip Use JSONL export for reproducibility
If you are curating questions or building datasets, use the **AI Training page** to export your data as JSONL. This machine-readable format ensures others can load your exact dataset and reproduce your evaluation. Include the JSONL file when sharing your results.
:::

---

### Exercise 3: Analyze and interpret

**What to do:**

1. Gather all your recorded data and organize it into a summary table:

| Condition | Accuracy | Confidence (avg) | Calibration Error | Latency (avg) | Notes |
|---|---|---|---|---|---|
| Model A / Setting 1 | ... | ... | ... | ... | ... |
| Model A / Setting 2 | ... | ... | ... | ... | ... |
| Model B / Setting 1 | ... | ... | ... | ... | ... |

2. Look for patterns:
   - Does your hypothesis hold? Where does it break down?
   - Are there categories or question types where results diverge sharply?
   - Were there any surprises — results you did not predict?
3. Calculate key statistics:
   - **Accuracy deltas** between conditions (e.g., "Model B scored 8.3 percentage points higher on science questions")
   - **Calibration error** — the gap between average confidence and average accuracy
   - **Similarity scores** for embedding studies — mean, minimum, maximum across your sentence pairs
4. Identify at least one **follow-up question** your results raise. Good research always generates more questions than it answers. ("The 3B model was better calibrated than the 8B model on health questions — does this hold for other categories?")

**Discussion:**

- Where were you wrong? The most interesting part of any experiment is when the hypothesis fails. What does the failure tell you about how these models actually work?
- If you ran the experiment again with different models or different hardware, would you expect the same results? Why or why not?
- What would you need to do to make your findings generalizable beyond your specific setup?

::: tip Negative results are results
If you hypothesized that temperature affects factual accuracy and found that it does not, that is a finding worth reporting. The community benefits from knowing that a variable does not matter, because it saves others from testing the same thing. Never discard a result just because it is "boring."
:::

---

### Exercise 4: Package and share

**What to do:**

Choose one of the following contribution formats:

**(a) Research summary in GitHub Discussions (500-800 words):**

1. Go to the LLMxRay GitHub Discussions page and create a new post under **Show and Tell**
2. Structure your post:
   - **Question**: What did you investigate?
   - **Hypothesis**: What did you predict?
   - **Setup**: Models, settings, hardware, quantization
   - **Results**: Data tables and key metrics
   - **Screenshots**: Embed at least 2 visualizations from LLMxRay (heatmaps, radar charts, scatter plots, diff views)
   - **Conclusions**: What did you learn? What surprised you?
   - **Follow-up**: What would you test next?
3. Tag your post with relevant labels (benchmark, comparison, embeddings, tools)

**(b) Custom benchmark suite (20+ questions, submitted as a PR):**

1. Choose a domain where you have expertise
2. Write at least 20 multiple-choice questions (4 options each, one correct) following the format used by existing LLMxRay benchmark suites
3. Validate your suite by running it on 2 different models — verify that questions discriminate (neither 100% nor 0% accuracy across the board)
4. Use the **AI Training page** to organize and export your questions as JSONL
5. Submit a Pull Request to the `community-benchmarks/` directory with your suite file and a README describing the domain, difficulty level, and validation results

**(c) Custom tool template (built, tested, and submitted as a PR):**

1. Build a tool in the **Tool Workshop** that solves a real problem (not a toy example)
2. Test it in **Chat Diagnostics** with at least 2 different models — document which models call it correctly and which struggle
3. Record success rate, common failure modes, and any argument formatting issues
4. Submit a Pull Request to `community-tools/` with your tool's JSON schema, a description of its purpose, and your test results

::: tip Writing for the community
When you share findings, write for someone who was not in your classroom. Explain your setup completely. Include hardware specs (CPU, RAM, GPU if any). Specify exact model names and quantization levels (e.g., "llama3.1:8b-instruct-q4_K_M"). The more precise your documentation, the more useful your contribution.
:::

---

## Key Takeaways

1. **Reproducibility is the foundation of research.** Without controlled conditions — fixed seeds, documented settings, explicit methodology — your results are anecdotes, not evidence. LLMxRay's Deterministic Pair preset and benchmark infrastructure exist to make reproducibility easy.
2. **Local models make everyone a researcher.** You do not need a GPU cluster or an API budget to do meaningful AI research. A laptop running a 4-bit quantized model through Ollama is a legitimate research environment, and the results reflect how most people actually use these models.
3. **Variation across hardware is a feature, not a bug.** When the same model produces different latency profiles, different throughput, or even subtly different outputs across different machines and quantization levels, that variation tells us something important about deployment reality. Report your specs and let the aggregate data speak.
4. **The community grows through shared findings.** A custom benchmark suite, a well-documented tool template, or a short post about a surprising result — each contribution makes the next researcher's work easier. Open science is not about individual breakthroughs; it is about collective progress.
5. **The skills from this curriculum transfer to any AI system.** Token mechanics, temperature dynamics, hallucination detection, vector spaces, context limits, tool calling, benchmarking methodology, and research design — these are not LLMxRay-specific skills. They apply to every language model, every inference framework, every deployment scenario. You now understand AI at the level where you can evaluate any system critically.

---

## Discussion Questions

1. What would you do differently if you could re-run your experiment from scratch? What variables would you add, remove, or control more carefully?
2. How do your benchmark results compare to published scores on the HuggingFace Open LLM Leaderboard? If they differ, what might explain the gap — quantization, prompt formatting, evaluation methodology, hardware effects?
3. If 30 students in a class each run the same benchmark on different hardware (different CPUs, different amounts of RAM, different quantization levels), what could we learn from the aggregate that no individual run could reveal? How would you design the analysis?
4. What ethical considerations should guide AI research, even at the student level? Think about data bias, result cherry-picking, overgeneralization from small samples, and the responsibility that comes with publishing findings others might rely on.
5. If you could add one feature to LLMxRay to make it a better research tool, what would it be? A new benchmark type? An automated comparison pipeline? A built-in result-sharing protocol? Why would that feature matter?

---

## Further Reading

### Academic Papers

| Paper | Authors | Year | Link |
|---|---|---|---|
| Lessons from the Trenches on Reproducible ML | Pineau et al. | 2021 | [arXiv:2003.12206](https://arxiv.org/abs/2003.12206) |
| Model Cards for Model Reporting | Mitchell et al. | 2019 | [arXiv:1810.03993](https://arxiv.org/abs/1810.03993) |
| Datasheets for Datasets | Gebru et al. | 2021 | [arXiv:1803.09010](https://arxiv.org/abs/1803.09010) |
| On the Dangers of Stochastic Parrots | Bender, Gebru, McMillan-Major, Shmitchell | 2021 | [doi:10.1145/3442188.3445922](https://doi.org/10.1145/3442188.3445922) |

### Community Resources

| Resource | Description | Link |
|---|---|---|
| LLMxRay GitHub Discussions | Share findings, ask questions, browse community research | [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions) |
| HuggingFace Open LLM Leaderboard | Live rankings of open models across standard benchmarks | [huggingface.co/spaces/open-llm-leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) |
| Papers With Code | Browse state-of-the-art results, datasets, and benchmarks | [paperswithcode.com](https://paperswithcode.com/) |

---

## Assessment

**Option A — Full research report (individual, 1500-2000 words):**
Write a complete research paper with five sections: Introduction (state your question and why it matters), Methodology (models, settings, hardware, procedure — enough detail for someone to reproduce your work), Results (data tables and at least 2 visualizations from LLMxRay — heatmaps, radar charts, scatter plots, or diff views), Discussion (interpret your findings, address your hypothesis, acknowledge limitations, compare to published results where possible), and Conclusion (summarize what you learned and propose follow-up research). The paper must include quantitative data — accuracy percentages, calibration error values, similarity scores, or latency measurements — not just qualitative impressions.

**Option B — Community contribution + presentation (pairs, slide deck + PR):**
Create and submit either a custom benchmark suite (20+ validated questions to `community-benchmarks/`) or a custom tool template (tested on 2+ models, submitted to `community-tools/`). Prepare a 10-15 slide presentation covering: what you built, why you chose this domain/tool, how you validated it (which models, what results), what you learned from the process, and how the community can use your contribution. The PR must be submitted (it does not need to be merged) and the slide deck must include screenshots from LLMxRay.

**Option C — Class research compendium (full class, collective document):**
Each student contributes one focused finding — a single research question, investigated with a documented methodology, yielding quantitative results. A designated editorial team compiles all contributions into a class report that aggregates results across different hardware, models, quantization levels, and research questions. The compendium should include: an introduction explaining the collective methodology, individual sections for each student's finding, and a synthesis section that draws cross-cutting conclusions from the aggregate data. Publish the compendium as a collective document and share it in GitHub Discussions.

---

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(124,58,237,0.06)); border: 1px solid rgba(168,85,247,0.3); padding: 1.5rem 2rem; border-radius: 12px; margin: 2rem 0;">

### Congratulations

You have completed the entire LLMxRay Educators Kit — eight modules that took you from watching your first token appear on screen to designing and publishing original AI research.

Along the way, you learned **token mechanics** (how models generate text one piece at a time), **temperature dynamics** (how a single parameter controls the boundary between determinism and creativity), **hallucination detection** (why confidence is not truth), **vector spaces** (how meaning becomes geometry), **context limits** (why models forget and how retrieval extends memory), **tool calling** (how language connects to action), **benchmarking methodology** (how to measure what matters), and now **research skills** (how to ask good questions, gather rigorous evidence, and share what you find).

These are not abstract concepts. They are practical skills that apply to every AI system you will ever evaluate, deploy, or build. The models will change. The architectures will evolve. The benchmarks will be replaced. But the ability to look inside a system, measure its behavior, question its outputs, and communicate your findings clearly — that is permanent.

The LLMxRay community grows every time someone shares a benchmark suite, documents a surprising result, or builds a tool that solves a real problem. You are now part of that community. Keep experimenting. Keep questioning. Keep contributing.

</div>

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 8 of 8 — The Capstone** in the LLMxRay Educators Kit
[&larr; Module 7: How Do Models Compare?](./module-7) | [Back to Curriculum](./index)

</div>
