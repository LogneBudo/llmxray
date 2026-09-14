# Ollama 0.33.3 changed what `prompt_eval_duration` measures

If you compute prefill throughput from Ollama's metrics the way everyone has always computed it,
your numbers have been wrong since 0.33.3 — and wrong in the flattering direction.

On a warm cache, my own tooling reported **4375 tok/s** where the honest figure was **115 tok/s**.
That's a 38× over-report, with no error, no warning, and no version signal beyond the presence of a
new field.

## What changed

0.33.3 added `prompt_eval_cached_count` to the responses from `/api/generate` and `/api/chat`, and
**redefined `prompt_eval_duration` to cover only the *uncached* prompt tokens.**

`prompt_eval_count` did not change. It still means the total prompt size, cached tokens included.

So the standard formula —

```
prompt_eval_count / prompt_eval_duration
```

— now divides the *total* token count by the time taken to evaluate only *some* of them. The error
scales with your cache hit ratio, which means it's smallest when you're testing cold and largest in
exactly the steady-state conditions you actually care about.

Here are two consecutive identical requests against qwen2.5:7b:

| | `prompt_eval_count` | `prompt_eval_cached_count` | `prompt_eval_duration` | Old formula | Actual |
|---|---|---|---|---|---|
| Cold | 38 | 0 | 14495 ms | 2.6 tok/s | 2.6 tok/s |
| Warm | 38 | 37 | 8.7 ms | **4375 tok/s** | **115 tok/s** |

The cold row is fine, which is part of why this is easy to miss — a quick sanity check on a fresh
daemon looks perfectly reasonable.

## The fix

Divide by the tokens that were actually evaluated:

```
prompt_eval_count - prompt_eval_cached_count
```

Ollama's own `Metrics.Summary()` was changed to do exactly this. The field is `omitempty`, so it's
absent on older daemons and on runners that don't report it — worth treating "absent" as *unknown*
rather than as zero, since those are different claims and only one of them is a problem.

## The same fact under three different names

Ollama exposes the same information through three protocols, with three different shapes:

| Endpoint | Field |
|---|---|
| `/api/chat` (native) | `prompt_eval_cached_count` |
| `/v1/chat/completions` (OpenAI-compatible) | `usage.prompt_tokens_details.cached_tokens` |
| `/v1/messages` (Anthropic-compatible) | `usage.cache_read_input_tokens` |

The Anthropic-compatible endpoint has a second trap. `input_tokens` there quietly stopped meaning
the prompt total and started meaning **total minus cached**. Verified live on 0.33.3: an identical
prompt reported `input_tokens: 38` cold and `input_tokens: 1` warm. If you're summing that field
for accounting, your totals dropped and nothing told you.

## Why the numbers move so much

The reason a cache hit changes prefill by two orders of magnitude, rather than a few percent, is
that KV cache reuse is all-or-nothing from a given point: the cache holds only for as long as the
prompt matches from the very first token, and the moment one token differs, everything after it is
discarded and re-evaluated.

The practical consequence — put stable content first and volatile content last — is
[documented by OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching) and by
Anthropic and Bedrock, and it is not a discovery. What's less obvious is how brutal the cliff is
locally, where nothing surfaces cache reuse at all. Same model, same 324-token system prompt, one
21-token timestamp moved from the top to the bottom:

| Timestamp position | Prompt tokens | Reused | Prefill |
|---|---|---|---|
| At the start | 324 | 4 | 64.6 ms |
| At the end | 324 | 290 | 18.6 ms |

Identical words, identical token count, 3.5× the prefill time. The hosted providers document the
advice; locally you get no feedback whatsoever about whether you're following it, which is how a
prompt template can quietly cost you the entire system prompt on every turn for months.

## The measurement I got wrong first

Worth recording, because it looked like a result.

My first approach compared *how much of layout A's cache does layout B reuse* — original prompt
versus rewritten prompt. The rewritten one scored terribly, and I nearly published that it made
things worse. It differs from A near the front, so of course it reuses almost nothing of A's cache.

That's the wrong question. Real traffic never sends A and then B; it sends **the same layout every
turn with a fresh value**. The thing to measure is whether a layout survives *its own* next turn —
so each layout has to be sent twice, once with its own values and once with them changed, and it's
the second send that counts. Measuring the first only tells you how well a prompt matches itself,
which is ~100% for every possible layout.

I caught it only because the numbers came back inverted against a real daemon. No unit test I would
have written would have found it; the code did exactly what I told it to.

## Limits

One model, one daemon, one prompt size, llama.cpp runner. I haven't tested across model families,
at long context, under concurrency, or on the MLX runner. The metrics change is general and
verifiable from the source; the specific 3.5× ratio is an illustration, not a benchmark, and I
wouldn't quote it as one.

---

*I maintain [LLMxRay](https://github.com/LogneBudo/llmxray), a local observability interface for
Ollama. The regression above was found in its own code, and it now has a page that measures cache
reuse against your daemon rather than estimating it. Apache-2.0, localhost only, `npx llmxray`.
None of the above needs it — two curl calls and `prompt_eval_cached_count` reproduce every table
here.*
