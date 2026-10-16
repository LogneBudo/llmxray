# Prompt X-ray

The **Prompt X-ray** draws each turn's prompt to scale and says, part by part, what it was and what happened to it: already in the model's memory, read again, or cut by the daemon and never seen.

**Sidebar item:** Prompt X-ray (below Live)
**Route:** `/xray`
**Added in:** v0.8.0 (October 2026)
**Requires:** turns on the Live page. The X-ray reads what the observe port recorded; point a tool at `http://localhost:11435` and send a few messages.

## What's the point?

Three things go wrong with a prompt on a local model, and none of them is visible from inside the tool that sent it.

- The prompt stops matching the previous turn somewhere near the start, so the model reads everything after that point again. A timestamp in the system prompt does this on every turn.
- Tool schemas get switched on and take a fixed slice of every prompt from then on.
- The prompt outgrows the context, and Ollama keeps the first few tokens and the end, drops the middle, and answers as if nothing was wrong. The system prompt is usually in what was dropped.

The X-ray shows all three as a picture of the prompt itself.

## Reading the chart

One bar per turn, left to right in tokens as the daemon counted them. The widest prompt in the conversation sets the scale.

**Colour is what the part is:** system prompt, tool schemas, earlier turns, the new message, in the order the daemon reads them.

**Brightness is what happened to it:**

- **Dim**: already in the model's memory from the previous turn. Cost nothing.
- **Bright**: read again this turn.
- **Striped, with a line through it**: cut by the daemon. The model never saw it.

A hairline gap separates the parts, so a bar reads as a structure at a glance. The right-hand column gives the prompt reading time and the share that was in memory.

Under a bar, a note appears only when something happened:

- the first turn from this tool with this model;
- the model was loaded again, so nothing was in memory and the prompt is not at fault;
- the prompt stopped matching the previous turn, with the part it fell in and the token position, which is an estimate from characters;
- tools were switched on, with how many tokens of schemas now sit in every prompt;
- the prompt outgrew the context, with how many tokens were dropped and whether the system prompt and the tool schemas were among them.

## Clicking a part

Click any segment and that turn's request opens below, through the same request viewer as the Live page, with the part you clicked first. The viewer marks the position where the prompt stopped matching the previous one inside the actual text.

The request text is kept only when **Keep the prompt text** is switched on on the Live page. Without it, the sizes are exact and the text is not available; the page says so.

## The totals

Under the chart, one sentence: how long the prompt reading took over the conversation, how much of that a stable prompt would have skipped, and how many turns answered a prompt that was not fully sent.

The saving is an estimate. It assumes prompt reading time grows with the number of uncached tokens, which it does to a good approximation.

## What the page does not know

The model's own tokenizer. The widths are the daemon's token counts; where a bar is split into parts, the split is scaled from characters. The striped part is sized from the difference between what was sent and what the daemon counted. Every estimate on the page is labelled as one.

## Related

- [Live](./live.md) records the turns the X-ray draws.
- [Cache Lab](./cache-lab.md) measures what fixing a cache break saves, on your own daemon.
- [Shared box](./shared-box.md) shows what each tool's settings cost the other tools.
