# Live

The **Live** page shows what your *other* tools are really sending to Ollama: VS Code Copilot, Open WebUI, Continue, n8n, a Python script. Turn by turn, with what the cache kept and what it threw away.

**Sidebar item:** Live (above Cache Lab)
**Route:** `/live`
**Added in:** v0.7.2 (October 2026)
**Requires:** nothing extra. The observe port opens with LLMxRay. Cache figures need Ollama 0.33.3 or newer, which is what reports them.

## What's the point?

Every other page in LLMxRay observes traffic that LLMxRay itself generates. This page observes traffic you do not control: the agent loop Copilot runs on your GPU, the chat front end your team uses, the workflow that calls a model forty times an hour.

Those clients are where local setups quietly get slow. A coding assistant sends several thousand tokens of instructions and tool definitions before you type a word, puts the editor state near the top of the prompt, and re-sends the whole conversation plus every tool result on every turn. Each of those is invisible from inside the tool, and each is visible from the daemon's own numbers once something sits between the two.

That is what the observe port is: an Ollama look-alike that forwards everything to the real daemon and keeps the numbers.

## Setup

The page's empty state *is* the setup. It shows one address, by default:

```
http://localhost:11435
```

Use it wherever a tool asks for your Ollama address. The page lists the exact field for each common tool:

| Tool | Where the address goes |
|---|---|
| **VS Code Copilot** | Install the Ollama extension (publisher Ollama) from the Marketplace; VS Code's older built-in Ollama provider is deprecated. Then Settings, `ollama.endpoint`, or *Chat: Manage Language Models*, Ollama, URL. Run *Ollama: Refresh Models* and pick a model from the Ollama section of the model picker. |
| **Open WebUI** | Admin Panel, Settings, Connections, Ollama API URL. From a Docker container use `http://host.docker.internal:11435`. |
| **Continue** | `apiBase` on each Ollama model in `config.yaml`. |
| **n8n** | Base URL on the Ollama credential. |
| **Python / curl** | `ollama.Client(host='http://localhost:11435')`, `base_url='http://localhost:11435/v1'` for the OpenAI SDK, or `export OLLAMA_HOST=localhost:11435` for the CLI (`$env:OLLAMA_HOST = "localhost:11435"` in PowerShell). |

Send one message from the tool. The page switches to the live view by itself. No save button, no restart.

The port behaves exactly like Ollama, root banner included, so tools that probe `/` or `/api/tags` before trusting a server see a daemon. Model pulls, listings and deletes pass straight through unrecorded; only model turns are kept (`/api/chat`, `/api/generate`, `/api/embed`, and the OpenAI-compatible `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`).

### Changing or disabling the port

```bash
npx llmxray --observe-port 11500   # another port
npx llmxray --no-observe           # do not open it
```

In Docker, map the port (`-p 11435:11435`) and use `OBSERVE_PORT` or `OBSERVE=0`. If the default port is already taken, the page says so and the rest of LLMxRay works as before.

## The live view

### Findings

Plain sentences at the top, each with a link to the turn that proves it. They appear only once there is enough evidence; one noisy turn never fires one.

- **"*Client* sends N-token prompts, but *model* is loaded with an M-token context."** The daemon rejected the request outright, with both numbers in its answer, so one turn is proof enough. The fix is the context length in Ollama's settings; coding assistants need 32K to 64K, and the larger context has to fit in video memory beside the weights.
- **"*Client* re-reads about N tokens on every turn with *model*."** The median cache share across at least three turns is under half, and the recomputed part is at least 500 tokens. The sentence names the token where the prompt stops matching the previous turn, when the daemon reported a count to scale it against.
- **"*Model* runs N% on CPU."** From the daemon's own load report (`/api/ps`): the loaded size against the part in VRAM. The usual cause is a context window that no longer fits beside the weights; the usual fix is a smaller context or a quantised KV cache.
- **"Tool schemas are N% of every *client* prompt."** The tool definitions take more than a quarter of the prompt, with how many of them were used in the turns seen. They sit in the stable prefix, so they are cached, but they still occupy context.

### Turn stream

Newest first: time, client and mode (agent when tools were offered, chat otherwise), model, prompt tokens, the share served from cache as a coloured bar, prefill time, generation speed, tool calls. The cache share is the only coloured column, so a client with a broken prefix is visible from across the room.

Clients are named from their User-Agent and the shape of the request. An unknown client keeps its product token as its name; the raw header is on hover.

### A turn in detail

Click a row.

**What the prompt is made of.** A bar split into system instructions, tool schemas, history and tool results, and your message, scaled onto the daemon's token count. The split is by characters, so it is a proportion, not a tokeniser.

**Where the cache broke.** The page keeps the previous prompt from the same client and model and finds the first character where this one differs. The KV cache survives only on a shared prefix, so that point is exactly where reuse ended and recomputation began. The page says how many tokens followed it, and what prefill would have been had the changing part come last, extrapolated linearly from this turn's own prefill time.

With **Keep the prompt text** switched on, the text on both sides of the break is shown, the green part cached, the red part not. This is what tells you *which* value moved: a cursor position, a timestamp, a re-ranked chunk.

**The numbers.** Prompt tokens, cached tokens, prefill time with the real rate (uncached tokens over prefill time, never the total), generation, tool calls, the context the model was loaded with and how much of it runs on CPU, the runner, the protocol, the User-Agent.

### Per client

One card per client: turns, tokens, tool calls, total prefill, and **Cache fix saves**: the prefill these turns would have skipped had their prompts stayed cached up to the new message. This is extrapolated from the session's own numbers. [Cache Lab](./cache-lab) *measures* the same thing by re-sending a prompt; this page only observes, so it says *about*.

## Privacy

Off by default, only counts and timings are kept, in memory, for the session. Nothing is written to disk.

**Keep the prompt text** switches on saving the request bodies to a file under your home directory (`~/.llmxray/observe/`, one file per day) and shows the text around each break on the page. It also unlocks the **request viewer** under the turn: the request rendered as a conversation, one message per block with real line breaks, tool calls as cards, tool results collapsed, and the tool list with each tool's name, description, parameter count and size. The cache break is drawn inside the message where it fell. A search box covers messages and tools, and a Raw tab with Copy and Download keeps every byte reachable. Switch it off and the kept text is dropped from memory; the files stay until you delete them.

In both modes nothing leaves your machine. The observe port talks to the Ollama address LLMxRay was started with and to nothing else.

## What this page does not do

It does not tokenise (proportions are by characters, counts are the daemon's), it does not keep turns across restarts, and it does not alter anything that passes through. It is a window, not a filter.

That last point has one visible consequence. A streamed request on the OpenAI-compatible endpoint carries no token counts unless the client asked for them with `stream_options: { include_usage: true }`; Ollama, like OpenAI, only adds the usage chunk on request. LLMxRay does not add that option to the request on the client's behalf, because some clients would choke on the extra chunk. Such turns show *not reported* in the cache column, with their prompt anatomy still in place. The native API (`/api/chat`, `/api/generate`) always reports the counts, and that is what the Ollama CLI, the Ollama SDKs and VS Code Copilot's Ollama provider use.
