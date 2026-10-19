# Runs

**Runs** draws one tool's calls to the model, end to end, as a waterfall: where the time went, call by call, and what each call sent and got back.

**Sidebar item:** Runs (below Live)
**Route:** `/runs`
**Added in:** v0.8.7 (October 2026)
**Requires:** calls on the Live page. Point a tool at `http://localhost:11435` and let it work. To see what each call sent and got back, switch on **Keep the prompt text** on the Live page first.

## What's the point?

An agent on a local model is slow, and the question is always where. In the model? Loading it? Reading a prompt it already read? In the tools between calls? Live shows every call from every tool as it happens; Runs takes one tool's calls and lays them out in time, so the slow part stands out.

## What a run is

A run is one tool's calls that follow each other within two minutes. A longer pause starts a new run. Inside a run, a **step** starts wherever the tool began a fresh conversation: with the text kept, that is where the next call stops carrying the previous conversation; without it, where a prompt worth keeping found the cache empty while the model stayed loaded.

## Reading the waterfall

One row per model call, placed in time. Each call's bar is split into what Ollama reports:

- **Waiting**: time the call spent before Ollama worked on it, plus anything Ollama did not account for.
- **Loading the model**: the model was not in memory. Often the biggest single cost of a run.
- **Reading the prompt**: the part of the prompt that was not in the cache. The cached part costs almost nothing, so it does not show as time; the share is written in the Operation column.
- **Writing the answer**.

Between two calls, a **tools** row is the time from the model's answer to the tool's next call, named after the tools the model asked for. An **agent** row is the same gap when no tool was asked for: the tool's own work. Tool time is measured from outside; nothing inside a tool is traced.

Flags in red say what went wrong on a call: **model loaded**, **cache empty**, **rejected** (the prompt was larger than the loaded context), **error**.

## What each row opens

Click a row and the panel on the right shows it.

- **A model call**: its numbers and phases, then **Input** (what was sent: the conversation, the tool schemas, with the point where the prompt stopped matching the previous call) and **Output** (what came back: the answer, the model's thinking when it shows it, and each tool call with its arguments). Both have a **Pretty** and a **Raw** view.
- **A tools row**: each tool the model asked for, with its arguments and the result the tool sent back in its next call.

Every row has its own address, for example `/runs?run=…&row=call-3`. **Copy link** puts it on the clipboard; opening it lands on that row. From a call, **Open in Prompt X-ray** shows what its prompt was made of, and the X-ray links back.

## What it cannot see

- Inside the tools. A database query in the middle of a tool is part of the tools row, not a row of its own.
- Text for calls recorded while **Keep the prompt text** was off. The timings are still exact.
- The answer of a call recorded before Keep text kept answers, when that call ended a conversation: it never came back in a later call.
