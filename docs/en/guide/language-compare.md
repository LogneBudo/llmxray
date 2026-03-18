# Language Compare — Understanding the Token Tax

The Language Compare preset reveals how the same meaning costs different amounts of tokens depending on the language you write it in. This is not a bug — it is a fundamental property of how LLMs process text.

**Parent page:** [Compare](./compare)
**Route:** `/compare` (Language Compare preset)

## What is Language Compare?

Language Compare is a preset on the [Compare](./compare) page. Instead of comparing models or temperatures, it compares **languages**. You provide the same prompt in multiple languages and see how the tokenizer treats each one.

This exposes **tokenization bias** — the fact that some languages are far more expensive to process than others, even when they express exactly the same idea.

## The Mental Model

LLMs do not understand languages. They process **tokens**.

Before your text reaches the model, a **tokenizer** (typically BPE — Byte Pair Encoding) splits it into tokens. The tokenizer learns its merge rules from the training data. Here is the critical chain:

```
Your Text  -->  Tokenizer  -->  Tokens  -->  Model  -->  Response
   "Hello"        BPE         [15339]      Inference     "Hi there"
   "مرحبا"        BPE       [2318,112,...]  Inference     "..."
```

English dominates LLM training corpora. As a result, the tokenizer learns very efficient merges for English words — common words often become a single token. Languages that appear less frequently in training data (Arabic, Hindi, Chinese, Thai, and many others) get **fragmented** into more tokens for the same meaning.

**More tokens means:**

- **Less context window** — A 4096-token window holds fewer words in Arabic than in English
- **Slower generation** — More tokens to produce for an equivalent response
- **Higher cost** — On pay-per-token APIs, the same sentence costs more in some languages
- **Degraded quality** — The model has less room to reason when context is consumed by inefficient encoding

This is not a deficiency in any language. It is a statistical consequence of the training data distribution. A tokenizer trained primarily on Arabic text would show the reverse bias.

## How to Use It

1. **Open the Compare page** and click the **Language Compare** preset button.
2. **Three slots appear**, each with a language dropdown. The defaults are English, French, and Arabic — you can change these to any language.
3. **Type or paste your prompt** into each slot's textarea. Write the same meaning in each language.
4. **Automatic language detection** — The system detects which language you actually typed. If it does not match the slot's selected language, a **"Translate to X"** button appears so you can fix it with one click.
5. **Click Compare** — All slots run simultaneously and results appear side by side with Token Tax metrics.

You always own your prompt. Nothing is modified or sent without your action.

## Understanding the Results

After the comparison runs, each slot displays several metrics:

| Metric | What it means |
|---|---|
| **Prompt Tokens** | How many tokens the tokenizer produced from your input text |
| **Token Tax** | The ratio compared to the most efficient language in the comparison (usually English). A tax of 2.3x means the prompt costs 2.3 times as many tokens. |
| **TTFT** | Time to first token. May be higher for languages that produce more prompt tokens, since the model must process all of them before generating. |
| **Speed** | Tokens per second during generation. This is usually similar across languages because the model generates tokens at roughly the same rate regardless of language. |
| **Total Tokens** | The length of the model's response. The model may produce different length responses in different languages. |

The **Token Tax** is the headline number. It tells you exactly how much more expensive a language is to process, token for token, compared to the baseline.

## Translation Feature

Each slot includes a translation capability powered by your local Ollama model — no cloud service, no cost.

- **Quality depends on model size.** Larger models (7B parameters and above) produce significantly better translations than small ones (3B). If translation quality matters, use the best model you have available.
- **Thinking models show their work.** If you use a reasoning model like DeepSeek-R1, you will see the `<think>` block as the model works through the translation.
- **You can edit the result.** After translation, the text appears in the slot's textarea and you can modify it before running the comparison. The translation is a starting point, not a final answer.
- **A "Translated" badge** appears on the slot only after machine translation has been used, so you always know which texts were human-written and which were machine-translated.

## Tips

- **Use the same model for all slots** to isolate language as the only variable. If you use different models, you cannot tell whether differences come from the language or the model.
- **Try different model sizes** with the same prompt to see if the token tax ratio changes. Larger models sometimes have larger vocabularies with better multilingual coverage.
- **Connect this to the Educators Kit.** [Module 9: What Words Cost](../community/educators/module-9) provides a structured lesson plan built around this exact feature, with exercises and discussion questions for classroom use.
- **Short prompts amplify the effect.** A single sentence can show dramatic token count differences. Try a common phrase like "The weather is nice today" in five languages.
- **Check both directions.** If your native language is not English, try prompting in your language first — you may find that the model's response quality differs, not just the token count.
