# Discovered with LLMxRay

A curated collection of interesting findings, surprising behaviors, and valuable insights discovered by the community using LLMxRay.

## How to Submit

Found something interesting? We'd love to feature it.

1. Open a [Showcase Submission](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml) issue
2. Fill in the structured form: what you found, which models, how to reproduce
3. Include screenshots from LLMxRay if possible
4. We'll review and add it to this page

---

## Featured Discoveries

### Temperature cliff on code generation
**Contributor:** LogneBudo | **Models:** Mistral 7B | **Date:** March 2026

Using the Compare feature with a Temperature Sweep preset, we found that Mistral 7B produces significantly more accurate Python code at temperature 0.2 than at 0.7. At 0.7, the model introduces creative but incorrect variable names and occasionally hallucinates API methods. The token confidence coloring in Chat Diagnostics made the uncertainty visible — tokens in the 0.7 output showed consistently lower confidence (more orange) around function calls.

### DeepSeek-R1 thinking depth varies by question type
**Contributor:** LogneBudo | **Models:** DeepSeek-R1 7B | **Date:** March 2026

The Reasoning tab revealed that DeepSeek-R1's `<think>` blocks are dramatically longer for math word problems (GSM8K) than for factual recall (TruthfulQA). On GSM8K, the model averages 12-15 reasoning steps with explicit arithmetic verification. On TruthfulQA, it typically uses 2-3 steps before committing to an answer. This was visible in the Benchmark results — GSM8K had higher TTFT but also higher accuracy when the thinking budget was uncapped.

### Quantization impact on benchmark accuracy
**Contributor:** LogneBudo | **Models:** Llama 3.2 3B (Q4_0 vs Q8_0) | **Date:** March 2026

Running the same ARC-Challenge suite on Llama 3.2 at Q4_0 and Q8_0 quantization using the Benchmark page showed a 4.2% accuracy drop at Q4_0. The per-category breakdown revealed that the drop was concentrated in physics questions (7.1% drop) while biology questions were barely affected (0.8% drop). The logprob distributions confirmed that Q4_0 was less confident overall, but the confidence gap widened specifically on questions requiring multi-step numerical reasoning.

---

*Want to see your finding here? [Submit a showcase issue](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml).*
