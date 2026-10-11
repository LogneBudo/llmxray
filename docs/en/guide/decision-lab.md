# Decision Lab

The **Decision Lab** asks a decision model typed questions about a situation and shows the probability behind every answer.

**Sidebar item:** Decision Lab (below Cache Lab)
**Route:** `/decision-lab`
**Added in:** v0.7.0 (October 2026)
**Requires:** Ollama 0.35.1 or newer, and a decision model (`nimble`, `tev1`, `clef-flash` or `clef`)

## What's the point?

A decision model does not write text. You give it a **state** (a ticket, a message, a log line, a document) and one or more **questions**, and it returns:

| Question type | What comes back |
|---|---|
| **Choice** | The chosen candidate, a probability for *every* candidate, and a confidence |
| **Yes / no probability** | A single probability that the condition holds |
| **Score on a scale** | The expected position on your ordered scale, a probability per step, and a confidence |

The probabilities are the model's own output distribution over the candidates, not a number parsed out of prose. That is what makes them worth looking at: a chat model asked "is this urgent?" says *yes*; a decision model says *0.99*, and for a borderline ticket it says *0.55*, and you can see the difference.

Ollama serves these models on `/v1/systemone` (added in 0.35.1). They report `decision` as their **only** capability, so LLMxRay keeps them out of every chat and embedding selector and lists them here instead. Sending one a chat request does not fail cleanly, it answers with fragments of its own schema, which is exactly why the filter exists.

## Using the page

1. Pick a decision model. If none is installed, pull one from the Models page; `tev1:0.8b` is the smallest.
2. Describe the **state**. Every question is asked about this one text.
3. Edit the **questions**. Each has an answer key (what the result comes back under), a type, instructions, and for choice and score types a list of candidates:
   - **Choice**: one per line as `name: description`.
   - **Score**: one per line, lowest first. The order *is* the scale.
   - Ollama accepts 2 to 26 candidates and 1 to 64 questions per request; the page tells you before sending when a question is outside that.
4. **Decide**. The answers appear on the right as bars, the chosen candidate highlighted, with input and output token counts and the round-trip time.

The page opens with a worked sample: a support ticket asked three ways, one question of each type. It is the request that was run live while verifying Ollama 0.40.3.

## Reading the answers

- **Choice**: bars are sorted by probability. The highlighted one is the model's choice. Confidence is the model's own figure, reported alongside.
- **Yes / no**: shown as a *yes* and a *no* bar that sum to 1.
- **Score**: bars stay in scale order, because position is the meaning. The highlighted step is the most probable one. The *score* number is the expected position (probability-weighted), so it can fall between two steps: a 2.37 on a four-step scale means "major, leaning toward full outage".

## What this page does not do

It does not stream (the endpoint never does), it does not keep history, and it does not send images yet, although `clef` and `clef-flash` accept them. It is an observatory for what a decision model actually returns, nothing more.
