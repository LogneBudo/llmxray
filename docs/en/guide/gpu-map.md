# GPU map

The **GPU map** shows what sits in video memory right now, model by model, what each one's context costs on top of its weights, what is free, and which of your other models would fit.

**Sidebar item:** GPU map (below Shared box)
**Route:** `/gpu`
**Added in:** v0.8.0 (October 2026)
**Requires:** nothing extra. It reads Ollama's own report of loaded models every few seconds. The card's memory size comes from the NVIDIA driver on Windows and Linux, and from the system on macOS.

## What's the point?

"Will it fit" is the question in every local-model thread, and the answer is usually a number from `nvidia-smi` that nobody can read. The map draws it.

## The bar

One bar, the width of the card's video memory. A block per loaded model, split in two: the weights, and dimmer, what the context and working buffers cost on top. Then the free space. Hover any block for its size.

Under the bar, each loaded model with its size, its quantisation, the context it is loaded with, and when the daemon will unload it unless it is used again. A model that did not fit shows how much of it runs from system RAM instead, which is why it is slow.

## What else would fit

Every pulled model that is not loaded, against the free space, with one of three verdicts:

- **fits now**, next to what is loaded;
- **fits only if what is loaded unloads first**;
- **larger than this card**: it would run partly from system RAM.

A model needs about 15% more than its file for a modest context; the verdicts allow for that.

## What the page does not know

How the daemon splits one model's footprint between weights and context. The weights are the file on disk; the rest is the context's cache and working buffers, so that split is an estimate. Free space is the card's memory minus what Ollama reports loaded; other programs using the GPU are not counted.

## Related

- [My System](./system.md) for the card and the driver.
- [Shared box](./shared-box.md) for which tool reserved the context.
