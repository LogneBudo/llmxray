# Shared box

The **Shared box** page answers one question: why is Ollama slow right now, and which of my tools did it. It lists what each tool asked the daemon for and what that cost the other tools, in seconds, with the setting to change.

**Sidebar item:** Shared box (below Prompt X-ray)
**Route:** `/shared-box`
**Added in:** v0.8.0 (October 2026)
**Requires:** turns on the Live page from more than one tool. With one tool there is nobody to cost anything.

## What's the point?

Ollama serves whatever arrives and never says who made it slow. Three settings travel inside requests and change the daemon's state for everyone:

- `keep_alive`. A tool that sends `keep_alive: 0` unloads the model after each of its requests. The next tool to arrive pays the reload, often tens of seconds.
- `num_ctx`. The daemon reserves the whole context window up front. A tool that asks for a 128 000-token context on 4 000-token prompts takes several gigabytes for itself, and the daemon drops from several requests at a time to one.
- Model switches. A tool that brings in a different model unloads the one the others were using.

None of this is reported by Ollama. The observe port sees every request, so it can keep the ledger.

## The one sentence

At the top: how many tools, how many models, over what span, and what their settings cost the others. If the answer is nothing, the page says so.

## Who cost whom

One row per tool, sorted by the time taken from the others. Each row says, in plain words, what the tool asked for and what that cost, then the fix as the exact setting to change. A tool that cost nothing is listed too, in green, so you can see what good looks like.

What a tool costs itself is shown but never counted against it.

## How the costs are attributed

The rules are simple enough to state, and the page states them:

- A model (re)load is charged to whoever unloaded the model. If the previous request to the same model asked for `keep_alive: 0`, that tool caused it. If another model was used in between, the tool that brought that model in caused it. Otherwise the model sat idle longer than `keep_alive`, and the reload is nobody's fault.
- A wait is charged to whichever request the daemon was still serving when this one arrived.

## How many tools at once

Ollama serves several requests at the same time only while they fit in video memory. When a tool reserves a large context, the daemon quietly drops to fewer at a time. It does not say so anywhere; the page reads it from the loaded context the daemon reports against the context each request asked for, and lists the moment the count fell and which tool's request did it.

## What happened, in order

Every load and every wait, with the time, the tool that paid, and who caused it when another tool did.

## What the page does not know

Anything that did not pass through the observe port. A tool that talks to Ollama directly on 11434 is invisible here, which is worth knowing when the numbers do not add up. The queue wait is our wall time minus the daemon's own total, so it is an estimate.

## Related

- [Live](./live.md) records the turns.
- [GPU map](./gpu-map.md) shows what the reserved contexts take in video memory.
