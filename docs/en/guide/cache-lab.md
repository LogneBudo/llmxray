# Cache Lab

The **Cache Lab** tells you why your prompt misses the model's cache, and measures what that costs you on every single turn.

**Sidebar item:** Cache Lab (above Protocol Observatory)
**Route:** `/cache-lab`
**Added in:** v0.6.0 (September 2026)
**Requires:** Ollama 0.33.3 or newer

## What's the point?

A local model doesn't re-read your whole prompt every turn. It keeps a **KV cache** of the tokens it has already processed, and reuses it — but only for as long as the prompt **still matches from the very first token**.

That "from the very first token" is the whole story. The cache survives on a shared *prefix*. The moment one token differs, everything after it is thrown away and has to be evaluated again, no matter how much of it was identical.

So a single timestamp at the top of a system prompt costs you the entire system prompt, every turn. Measured on a real daemon with the same 324-token prompt:

| Where the timestamp sits | Prompt tokens | Reused from cache | Prefill |
|---|---|---|---|
| At the **start** | 324 | 4 | 64.6 ms |
| At the **end** | 324 | 290 | 18.6 ms |

Same model. Same words. Same token count. **3.5× the prefill time**, purely because of where one value sat.

This is invisible in every other tool, and it is one of the largest levers on how fast a local model feels.

## Using the page

1. Pick a model.
2. Paste the system prompt you actually send every turn.
3. Click **Measure**.

The page does three things.

### Diagnosis

Before measuring anything, the lab scans your prompt for values that change between turns — timestamps, dates, times, session ids, long numbers — and shows them as chips.

It then renders your prompt in three colours:

- **Green** — the prefix the cache can keep.
- **Red** — the first value that changes.
- **Grey** — everything forfeited, only because it sits *after* that value.

The grey region is the point. It is usually most of the prompt, and there is usually nothing wrong with it.

### Measurement

The lab sends **two layouts**, each of them **twice**:

1. Your prompt as written.
2. The same prompt with the changing values moved to the end.

The second send of each layout carries a *different* value — a new timestamp, a new id — because that is what real traffic does. It is the second send that gets measured. Measuring the first would only tell you how well a prompt matches itself, which is ~100% for any layout and tells you nothing.

You get a table of what the daemon actually kept: prompt tokens, reused, evaluated, prefill time, and reuse percentage.

### Verdict

Finally, a plain statement of what the rewrite bought: tokens saved per turn, milliseconds saved per turn, and the speed-up.

Every number on the page came back from your own daemon. **Nothing here is estimated.**

## Reading the results

**Reuse near 100%** — this layout is doing well. The cache is carrying nearly the whole prompt.

**Reuse near 0% with a value at the front** — the usual case, and the one worth fixing. Move the changing values to the end of the system prompt, or into the user message, and the body above them stays cached.

**"not reported"** — your daemon is older than Ollama 0.33.3 and doesn't report cache reuse. The lab will not show this as 0%, because "the daemon didn't say" and "nothing was cached" are different claims and only one of them is a problem.

**A negative saving** — the rewrite made things worse. It happens; it is measured, so believe it rather than the theory.

## What to do about it

The fix is nearly always structural, and it is nearly always cheap:

- Put the **stable** part of your system prompt first: role, rules, style, examples.
- Put anything that **changes per turn** last: the current time, the user id, the session id, the retrieved chunks.
- Keep **retrieved context in a stable order**. Re-ranking chunks between turns invalidates the cache from the first chunk that moved.
- Don't rebuild the system prompt from a template that re-serialises a dictionary — key order can change under you.

None of this changes what the model is told. It only changes where it is told, which is free.

## Notes and limits

- The lab holds generation to a single token. It measures **prefill**, and decoding would be pure noise here.
- The rewrite it measures is mechanical: it moves the detected spans to the end and leaves everything else alone. It is a measurement, not a suggested final prompt — read it before adopting it.
- The mutated "next turn" value is shape-preserving, not meaningful. A date may come out impossible. That is fine: the cache only cares that the value changed, not what it means.
- Everything runs against `localhost`. No cloud, no API key, no signup.
