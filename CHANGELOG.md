# Changelog

All notable changes to LLMxRay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.7] — 2026-10-19

### Added

- **The whole round is kept.** With Keep text on, the observer now keeps each model's answer beside the
  request: its text, its thinking when the model shows it, and every tool call with its arguments,
  joined back together from the stream, on Ollama native, OpenAI-compatible and Anthropic-compatible
  calls. `GET /__observe/turns/<id>/text` returns it as `answer`.
- **Runs** (new page, below Live): one tool's calls to the model, end to end, as a waterfall. Each call is
  split into waiting, loading the model, reading the prompt and writing the answer; the gaps between calls
  are tool time, named after the tools the model asked for; steps start where the tool began a fresh
  conversation. Click a row for what it sent and got back (Pretty and Raw), or for each tool's arguments
  and result. Every row has its own link. Live links each call to its run; the Prompt X-ray opens a call
  from a run and links back.

### Changed

- `read_llmxray_status` says what happens when LLMxRay is unreachable; the opening sentence of
  `estimate_my_prompt` is two sentences. The two notes in Glama's review of 0.8.6 (TDQS 4.8 over seven tools).
- Verified against Ollama 0.40.6 (released 2026-10-16): the prompt-cache counts on all three protocols, `/api/tags`
  capabilities, and a full agent run through the observe port. 0.40.6 adds a cloud option for decision models and a cloud
  usage API; LLMxRay uses neither.

## [0.8.6] — 2026-10-17

### Added

- **Four MCP tools, seven in all.** `list_my_turns`: the history, one line per turn with tokens,
  cached share, prefill, speed, stop reason and flags. `compare_my_turns`: did a change help, the
  medians of cached share, prefill, speed and prompt size before and after a moment, with a verdict.
  `estimate_my_prompt`: before sending, does a prompt of N tokens fit the loaded context, the headroom
  left, the VRAM fit, and the cache reuse to expect from this client's last turn. `read_llmxray_status`:
  where LLMxRay runs, the observe port, the Ollama behind it, turns kept. All read-only, all from
  records the server already holds. Glama's server-level review had marked the three-tool surface as
  thin and without a history, a trend view or a status view.

### Fixed

- **The dev server reported a 12 GB card as 4 GB.** Windows' AdapterRAM is a 32-bit field; the shipped
  server has corrected it with nvidia-smi since 0.7.6, the dev plugin never did. Same merge now.

### Changed

- The parameter line of `diagnose_my_turns` and the return line of `read_my_last_turn` are shorter,
  the two places Glama named.

## [0.8.5] — 2026-10-17

### Changed

- **Two tools renamed, so all three read as verbs:** `last_turn_metrics` is now `read_my_last_turn`,
  `local_models` is now `list_local_models`; `diagnose_my_turns` is unchanged. Clients discover tools
  by listing them, so nothing breaks unless the old name was written into a prompt. From Glama's
  server-level review, which marked the mixed noun and verb forms.
- **Descriptions in plain sentences.** The semicolon chains are split, `since_minutes` carries its
  range (1 to 10080) and the two parameters are said to combine.

## [0.8.4] — 2026-10-17

### Changed

- **Tool descriptions, shorter and in lines.** One idea per line, a quarter fewer characters, the read-only
  sentence left to the annotations, and the `client` parameter explained by what goes wrong without it
  on a shared machine. From Glama's review of 0.8.3 (TDQS 4.7/5).
- **Agent Skill carries no license line of its own.** ClawHub licenses every published skill MIT-0 and
  allows no override; the skill text is published there on those terms, by decision. LLMxRay itself
  stays Apache-2.0. On GitHub the repository license applies as before.

## [0.8.3] — 2026-10-17

### Changed

- **Dependencies.** Nine advisories closed in range, among them the critical `proxy-addr` IP-spoofing one
  and the two in `http-proxy-middleware`. The three that remain are one advisory on `braces`, reached
  only through `http-proxy-middleware`, with no patched release yet; the pattern it chokes on comes
  from LLMxRay's own configuration, never from a request.
- **Verified against Ollama 0.40.5.** Cache fields present on the native, OpenAI-compatible and
  generate paths; tags and ps shapes unchanged; no documented API change between 0.40.4 and 0.40.5.
- **French.** The "model stayed loaded" sentence on the Live page and in the Live guide.
- **Agent Skill** ships its LICENSE and NOTICE, so registries read Apache-2.0 instead of a default.

## [0.8.2] — 2026-10-16

### Changed

- **A cache drop says which kind it was.** The finding now reads the daemon's load time: a model
  that stayed loaded means the KV cache was still there and none of it was reused, a prefix that no
  longer matched rather than an eviction. The sentence says so, in `diagnose_my_turns` and on the
  Live page. Prompted by a question from another agent on the first lab-notebook post.
- **The KV cache is named** once in the per-turn prefix finding.
- **Tool descriptions say how their parameters change the answer** and that LLMxRay must be running,
  the two gaps Glama's review of the tools still listed.
- **Agent Skill.** `skills/diagnose-ollama-calls/SKILL.md`, the "For agents" procedure in the Agent
  Skills format: `npx skills add LogneBudo/llmxray`, or `llmxray-diagnose-ollama-calls` on ClawHub.
- **Docs discoverable.** The docs site now publishes its own sitemap (126 pages), every page title
  names the page, and the description says what the docs cover.
- **README** opens with the logo, the Glama and AlternativeTo listing cards, then the shields.

## [0.8.1] — 2026-10-16

### Changed

- **MCP tools declare what they are.** Every `llmxray-mcp` tool now carries MCP annotations: read-only,
  not destructive, idempotent, closed-world. A client that honours annotations can call them without
  asking the user first.
- **Each tool description says when to pick the other two** and what the returned text looks like, line
  by line, so an agent reading `tools/list` can choose without trying. Prompted by Glama's tool-definition
  review of 0.8.0.
- **`glama.json`** at the repo root with the maintainer and listing metadata.

### Tests

- Three tests connect a real MCP client to the server in memory and check the annotations, the
  descriptions and a call over the wire.

## [0.8.0] — 2026-10-16

### Added

- **Prompt X-ray.** Each turn's prompt drawn to scale: colour is what each part was (system prompt,
  tool schemas, earlier turns, the new message), brightness is what happened to it (already in the
  model's memory, read again, or cut by the daemon and never seen). Turns stack into a waterfall;
  notes appear only where something happened; click a part and the request opens at that place.
- **Live finds the prompt Ollama silently cut.** Measured on Ollama 0.40.4: a prompt larger than
  `num_ctx` is answered with HTTP 200, the first few tokens and the end kept, the rest dropped,
  the system prompt included, and nothing in the response says so. The prompt count sitting at
  the context ceiling is the only trace; Live and the MCP tool now report it, with what was lost.
- **Shared box.** What each tool asked the daemon for and what that cost the other tools: a tool
  sending `keep_alive: 0` and the reloads the others paid, a context far larger than the prompts and
  the slot count it dropped, who waited behind whom. Each with the setting to change. Attribution
  rules are stated on the page. Every turn now records `keep_alive`, the daemon's total time and the
  derived queue wait.
- **GPU map.** What is in video memory now, model by model, weights and context, what is free, and
  which pulled models would fit: now, only alone, or never.
- **Tool calls.** Thirteen request shapes agents send, scored per model on what the daemon returned:
  right tool, right arguments, right count, no call when none is needed. One sentence per cell, the
  model's calls, text and reasoning on click. Born from a 7.5B model dropping a required argument next
  to a long one; that case is in the suite in the shape that broke it.
- Docs: guide pages for the four new pages; the installation page now starts with `npx llmxray` and
  Docker; the history page describes the Settings tab that exists.

### Changed

- `/api/ps` reports the loaded context times the parallel slots, so the per-request ceiling used by
  findings is the request's own `num_ctx` when it set one.

### Fixed

- **The history retention setting now prunes.** It was a dropdown that wrote to local storage and
  was read by nothing. Entries older than the chosen window are deleted when the setting changes
  and whenever the History tab loads.

Verified against Ollama 0.40.4.

## [0.7.9] — 2026-10-15

### Changed

- **Both ports answer only this machine by default.** The Live log holds whatever your tools sent,
  and the proxy reaches Ollama's admin routes, so they are no longer open to the network unless you
  start with `--host 0.0.0.0` (env `HOST`). The Docker image keeps binding every interface inside
  the container; publish the port on `127.0.0.1` if you do not want it reachable.
- **The Protocol Observatory's probe only fetches Ollama and this machine.** It fetched any URL on
  the caller's behalf before, which let a page or a network peer read your internal network through
  LLMxRay. The dev server's probe no longer sends a wildcard CORS header either.
- **Settings posts on the Live routes must be JSON.** A cross-site form or text/plain post, the kind a
  browser sends without asking, can no longer flip prompt recording or clear the log.
- **Estimates say so.** "Around token N" is scaled from characters and is now labelled as an
  estimate on the Live page and in the MCP tools. The CPU finding no longer promises "several times
  slower" at a 5% share.
- **A model that was (re)loaded no longer reads as a lost cache.** The turn carries the load time;
  the prefix and drop findings skip it, and the MCP metrics say why nothing was cached.
- **A model entirely off the GPU is not a "partly on CPU" finding.** On a machine without a GPU the
  finding and its "smaller context" advice were wrong.
- **An unknown model has no cost.** It was priced at $0.10 per million; the table now says "no rate
  for this model" and the totals count only known rates.
- **The Empty badge no longer flags a short answer.** "Hello! How can I help you today?" was Empty.

### Added

- **A client can name itself.** Send `X-LLMxRay-Client: my-agent`, or put `?client=my-agent` on the
  base URL, and the Live page and the MCP tools show that name instead of a User-Agent guess. The
  name never reaches Ollama. Two agents on the same SDK stay apart, and an agent can find its own turns.
- **Claude Code's traffic is recorded.** Ollama's Anthropic-compatible `/v1/messages` is now a
  captured protocol: system prompt, content blocks, tools, cached and uncached tokens, stop reason.
  Set `ANTHROPIC_BASE_URL=http://localhost:11435`.
- `--host` on the CLI, and the base-URL setting per client in the "For agents" section.

Verified against Ollama 0.40.4.

## [0.7.8] — 2026-10-15

### Fixed

- **`npx llmxray` and the Docker image could not talk to Ollama.** Every `/api` and `/v1` call from
  the app answered 404, and every JSON POST hung: the proxy was mounted on a path prefix that Express
  strips before the proxy library sees it, and the JSON body parser sat in front of the proxy and
  drained the request. Present since v0.2.0. Only the Live page, which has its own port, worked.
  The dev server has its own proxy, which is why no screenshot or test ever showed it.
- **The Live page's "keep prompt text" switch was ignored in production.** Same body-parser order.
- **An `https://` Ollama URL crashed the whole process** on the first observed request.
- **A client that stopped a generation mid-stream was recorded as a clean stop**, and Ollama kept
  generating. The turn is now recorded as cancelled, with what the daemon had produced, and the
  upstream request is closed.
- **The MCP tools answered a bare "fetch failed" when LLMxRay was not running.** They now say what
  to start.
- A port already in use is reported as a sentence instead of a stack trace.

### Added

- **A release gate.** `server/index.test.mjs` starts the shipped server for real against a stand-in
  Ollama and checks the proxy path, the POST body, the Live routes, the cancel path and the https
  failure. It runs with the unit tests.

Verified against Ollama 0.40.4.

## [0.7.7] — 2026-10-15

### Added

- **Listed in the MCP Registry.** `package.json` carries the registry's `mcpName` marker
  (`io.github.LogneBudo/llmxray`) and the repo carries `server.json`, so `llmxray-mcp` can be found
  from any client that reads the registry. No change to what the package does.

Verified against Ollama 0.40.4.

## [0.7.6] — 2026-10-15

### Added

- **LLMxRay as tools for agents.** A second command, `llmxray-mcp`, serves three read-only tools over
  the Model Context Protocol: `diagnose_my_turns` (the Live findings as sentences with the fix, for the
  calls the agent sent through port 11435), `last_turn_metrics` (the last turn in numbers) and
  `local_models` (what is pulled, what is loaded, what fits in video memory). The findings computation
  moved to `server/findings.mjs` so the Live page and the MCP server share one source. README gains a
  "For agents" section with the two-line setup.

### Fixed

- **My System showed 4 GB of video memory on any NVIDIA card above 4 GB.** Windows reports adapter
  memory through a 32-bit field. The figure now comes from the NVIDIA driver where it exists, on
  Windows and Linux; a 12 GB RTX 5070 reads 12 GB.

Verified against Ollama 0.40.4.

## [0.7.5] — 2026-10-15

### Added

- **Live flags the turn where a client lost the cache.** A client that was cached and then was not,
  for one turn, gets a finding on that turn: cached share before and after, the prompt size, and the
  token where the prompt stopped matching. The existing finding for a client that is never cached is
  a median over several turns, which hides exactly this case; asked for on r/selfhosted.
  Measured on Gemma 4: a new prefix drops the cached share from 99% to 0%.

Verified against Ollama 0.40.4.

## [0.7.4] — 2026-10-14

### Added

- **Reasoning on the Protocol Observatory.** Each column shows what the model thought before it
  answered, as that protocol carries it: native `message.thinking`, OpenAI-compat `delta.reasoning`,
  Anthropic-compat `thinking_delta`. The envelope diff gains a row for the carrier and a row for
  this run. The native path only thinks when asked; the two compat paths let a thinking model think
  by default, so on the same prompt and budget they can spend every output token on reasoning and
  produce no answer. The column says so instead of showing an empty box.
- **Text view on Compare.** Each slot renders its output as Markdown while it streams, every token
  underlined in its confidence colour. The one-chip-per-token view with the numbers on hover is one
  click away.

### Changed

- **Chat renders Markdown while streaming.** Headings, lists, bold and code appear as they stream,
  with the confidence colour under every token, instead of raw `**` and `###` until the turn ends.
- **Tool Workshop code panel emits valid TypeScript.** A tool is written as
  `export async function name(args: { … }) { … }`, which is how its body reads its inputs and what
  the executor runs. Pasting the panel back reproduces the same tools.
- **Cost charts label their axes by magnitude.** Small local costs no longer collapse into a column
  of identical `$0.0002` ticks.
- **README** restructured with one screenshot per page, all retaken against Ollama 0.40.4, and the
  French, Serbian, Chinese and Arabic editions brought back in line with it.

### Fixed

- **Chat history now survives a reload.** Conversations, messages, sessions and tokens are handed
  to IndexedDB as plain objects. They were Vue proxies, which the browser's structured clone
  refuses, so every write had been failing silently and the History panel came back empty after
  a restart.
- Knowledge Base chunks begin on a word boundary; the overlap no longer opens with the tail of a
  word, and a chunk's recorded start matches where it actually starts.
- My System no longer shows firmware placeholders such as "Default string" as device facts.

Verified against Ollama 0.40.4 (October 2026).

## [0.7.3] — 2026-10-13

### Added

- **Request viewer on the Live page.** With "Keep the prompt text" on, a selected turn's request is
  rendered as what it is: the options, the conversation one message per block with real line
  breaks, tool calls as cards, tool results collapsed, and the tool list with name, description,
  parameter count and size per tool. The cache break the proxy computed is drawn inside the message
  where it fell. A search box works across messages and tools; a Raw tab, Copy and Download keep
  every byte reachable.

### Fixed

- The per-client "cache fix saves" estimate no longer counts a first turn or a cold load, which
  have no previous prompt to share a prefix with.

## [0.7.2] — 2026-10-12

### Added

- **Live page.** LLMxRay now opens a second port, 11435 by default, that behaves exactly like
  Ollama and forwards everything to it. Point any other tool at that address (VS Code Copilot,
  Open WebUI, Continue, n8n, a Python script) and every turn it sends appears on the Live page:
  client, model, prompt tokens, how many came from the cache, prefill and generation speed, tool
  calls. Selecting a turn shows what the prompt is made of (system, tool schemas, history, message)
  and the exact point where it stopped matching the previous turn from the same client, which is
  where the cache broke. Findings are written as plain sentences and each links to the turn that
  proves it: a client that re-reads most of its prompt every turn, a model running partly on CPU
  because its context no longer fits in VRAM, tool schemas that dominate the prompt. Per-client
  cards total tokens, tool calls and prefill time, with an estimate of what a cache fix would save.
  The page's empty state is the setup: one address to copy and the steps for each tool. Only counts
  and timings are kept, in memory; prompt text is an opt-in that writes to a file under the user's
  home directory. Nothing leaves the machine. `--observe-port` and `--no-observe` on the CLI,
  `OBSERVE_PORT` and `OBSERVE=0` in Docker.

## [0.7.1] — 2026-10-11

### Added

- **Image embeddings** on the Embeddings page (Ollama 0.40 `/api/embed` object input). When the
  selected model reports both `embedding` and `vision`, an image can be attached in the playground
  and on each side of the Similarity Calculator: photo against sentence, photo against photo, or an
  image alone. Every result shows the prompt tokens it cost; an image is a fixed block on top of the
  text (7 tokens for a short sentence, 265 with a tiny image, measured on embeddinggemma-2). Text-only
  models show no image controls. The only such model today runs on MLX, Apple Silicon only; the guide
  explains the SSH forward.

## [0.7.0] — 2026-10-11

Verified against Ollama 0.40.3 (October 2026). Everything LLMxRay reads is unchanged from 0.33.3,
including the prompt-cache fields on all three protocols.

### Fixed

- Decision models (Ollama 0.35.1 — nimble, tev1, clef) report `decision` as their only capability
  and answer on `/v1/systemone`, not chat. They no longer appear in the chat or embedding model
  selectors, and the Models page shows a Decision capability icon for them.
- A manifest-list model (Ollama 0.40) is listed once per runner in `/api/tags`. The listing is
  now collapsed by name, so a model never appears twice in a selector.

### Changed

- The Thinking control in chat settings now offers the levels a model advertises via `/api/show`
  (Ollama 0.34.3+) when it does, and the legacy Low / Medium / High / Max names otherwise. The
  model's own default is selected when a level the previous model offered does not exist on the new one.
- Types for the new `details.runner`, running-model `runner`, `/api/show` `thinking` and
  `manifests` blocks, multimodal `/api/embed` input, and the OpenAI-compatible `timings` block.
  The `timings` prompt rates are documented as unusable for prefill throughput: `prompt_n` is the
  total prompt while `prompt_ms` times only the uncached tokens, which inflates the rate by the
  cache hit ratio (3875 tok/s measured for a 30-of-31 cached prompt). LLMxRay computes its own rate
  and does not read them.
- READMEs in all five languages and the website now state the Ollama version actually probed.

### Added

- **Decision Lab** — a page for Ollama's decision models (0.35.1: nimble, tev1, clef, clef-flash),
  which answer on `/v1/systemone` with choices, probabilities and scores instead of text. Give it a
  state and typed questions (choice among named candidates, yes/no probability, score on an ordered
  scale) and the answers are drawn as probability bars with the chosen candidate highlighted, plus
  token usage and round-trip time. Sidebar item **Decision Lab**, route `/decision-lab`. Guide in
  English, French and Chinese. The Models catalog gained a Decision category.
- **Protocol Observatory** envelope diff: prefill time, the prefill rate as the daemon states it,
  and the prefill rate over evaluated tokens, side by side. The OpenAI-compatible `timings` block
  (Ollama 0.35.1) states a rate that is inflated by the cache hit ratio; the row turns amber when it
  disagrees with the honest figure from the same chunk.
- **Runner awareness** (Ollama 0.40): the runtime that serves each model (`llamacpp`, `mlx`, or
  `ggml` for a model pulled before 0.40) is shown on the Models tab and on running models on My
  System, and every new benchmark result is stamped with it, so the same model on two runtimes
  can be told apart.
- **Upgrade backups** (Ollama 0.40.2): the Models tab lists the original copies Ollama keeps on
  disk after upgrading a model in the background, with their size when the listing reports it, and
  removes one on request by deleting that manifest — the same operation as Ollama's own `ollama rm
  <digest>` recipe. The section is absent when the daemon has no backups.
- Article: a section on the `timings` block in "Ollama 0.33.3 changed what `prompt_eval_duration` measures".

## [0.6.0] — 2026-09-14

### Added

- **Cache Lab** — a new page that finds out why a prompt misses the model's KV cache, and
  measures what that costs on every turn. A local model reuses its cache only while the prompt
  still matches from the very first token, so one timestamp near the top forfeits everything
  below it. The lab detects the values that change between turns, renders the exact point where
  reuse dies, and then measures the alternative against the running daemon rather than estimating
  it. Measured on a real 324-token prompt: 4 tokens reused and 64.6 ms of prefill with the
  timestamp at the front, 290 reused and 18.6 ms with it at the back — 3.5x faster, same words.
  Sidebar item **Cache Lab**, route `/cache-lab`. Requires Ollama 0.33.3 or newer, and reports
  "not reported" rather than 0% on older daemons.
- Guide pages for Cache Lab in English and French, and a feature entry on the website in both.
- `AbortSignal` support on the client's non-streaming `chat()`, so a measurement run can be stopped.

### Fixed

- **README images were broken on npm.** Seven screenshots per README used repo-relative paths, and
  npm could not resolve them because `package.json` declared no `repository`. All image URLs are now
  absolute, and `repository`, `homepage` and `bugs` are declared.

### Changed

- Cache Lab measures each layout by sending it twice with a changed value, and reports the second
  send. Measuring the first would only show how well a prompt matches itself — about 100% for any
  layout, which says nothing about how it behaves in real traffic.

## [0.5.1] — 2026-09-14

### Fixed

- **Prefill speed over-reported whenever the prompt cache was warm.** Ollama 0.33.3 redefined
  `prompt_eval_duration` to cover only the *uncached* prompt tokens, while `prompt_eval_count`
  still counts the whole prompt. Dividing one by the other inflated the prompt tokens/second
  figure by the cache hit ratio — a prompt with 37 of 38 tokens served from cache read 4375 tok/s
  instead of 115. The rate is now taken over the tokens actually evaluated.
- Component tests mounted without the i18n plugin, so every `SlashCommandDropdown` test failed
  with `Need to install with app.use function`. Tests now install the real English catalog
  globally, and assert against the shipped strings.

### Added

- **Prompt cache reuse is now visible.** Session metrics show a Cached Prompt card and split the
  token distribution bar into cached and evaluated halves; the Protocol Observatory reports the
  cached share per protocol and names the three different fields the same fact arrives under —
  `prompt_eval_cached_count` (native), `usage.prompt_tokens_details.cached_tokens` (OpenAI) and
  `usage.cache_read_input_tokens` (Anthropic). Benchmark question results record it too.
- `audio` capability, which Ollama 0.33.3 began reporting for models carrying an audio tower.
- Cached and total prompt token rows in the Protocol Observatory envelope diff, in all six locales.

### Changed

- Verified against Ollama 0.33.x; READMEs updated in all five languages.
- Anthropic-compatible `input_tokens` now means the prompt total *minus* cached tokens on Ollama
  0.33.3. The Observatory reconciles it back to the prompt size so the three protocols compare
  like for like.

## [0.5.0] — 2026-08-15

### Fixed

- **Benchmark and Protocol Observatory token counts read zero on Ollama 0.32.6+.** That release
  aligned `/v1/chat/completions` with OpenAI's wire format, where the final `usage` totals are only
  emitted when the request sends `stream_options.include_usage`. LLMxRay now sends it, and reads
  the totals from the trailing chunk — which carries an **empty `choices` array**, so the read had
  to move ahead of the per-choice guard. Restores `tokenCount` and `tokensPerSecond` in the
  Surgical Benchmark, and the OpenAI lane's token count in the Protocol Observatory.

### Added

- **Reasoning effort levels.** The thinking control in Chat Diagnostics now offers Off, On,
  Low, Medium, High and Max, mapping to Ollama's `think` parameter. On sends `true` and lets the
  model pick its own effort; the named levels request an explicit reasoning budget.
- **Embedding dimensions.** The Embeddings Lab can request a narrower output vector via Ollama's
  `dimensions` parameter (Matryoshka truncation), with the model's native width shown as the
  placeholder. Blank leaves the model's native width untouched.

### Changed

- **Capabilities now come from the model listing.** Ollama 0.32 reports each model's
  `capabilities`, `context_length` and `embedding_length` in `/api/tags`. LLMxRay uses that as the
  primary source, so capability icons and model filtering are correct as soon as the list loads
  rather than after a per-model `/api/show` round-trip. `/api/show` still runs in the background
  to enrich parameters, template, license and architecture metadata.
- A reported capability set is treated as authoritative: when the daemon lists a model's
  capabilities and omits `thinking`, that is believed rather than overridden by a name guess.
  Name patterns now apply only to models that report nothing at all.
- **`embedding` is a first-class capability.** Chat and embedding model selectors split on what
  Ollama reports, falling back to family and name heuristics only on older daemons. The Embeddings
  page no longer carries its own duplicate name-pattern filter.
- Capability name-pattern fallbacks extended: `qwen3.x`, `muse-glimmer`, `glm-*`, `kimi-k*`
  (reasoning) and `gemma3` (vision).
- `/api/show` requests send the documented `model` field, keeping `name` as an alias for older
  daemons.
- Docs: the Models guide (EN/FR) documents listing-sourced capability detection, the reasoning
  effort levels, and embedding dimensions. READMEs (EN/FR/ZH/AR/SR) updated for Ollama 0.32.x.

### Fixed (i18n)

- The thinking control's strings were missing entirely from the Chinese and Arabic catalogs;
  both are now complete, alongside the new effort-level and embedding-dimension strings in all
  six locales.

### Notes

- Tested against Ollama 0.32.9. Unit tests 190 → 203, covering the usage-chunk shape, the
  capability resolution paths, and the request bodies that carry the fix.

## [0.4.9] — 2026-07-02

### Changed

- Verified compatibility with **Ollama 0.31.x** (current latest). No API changes were required:
  LLMxRay already reads model capabilities live from `/api/show`, surfaces API error `detail`
  (incl. the new "message exceeds context window" error from Ollama 0.30.9), and pins no minimum
  Ollama version — so new releases and models work out of the box.
- Extended the capability name-pattern **fallbacks** (used only when a model doesn't self-report
  via `/api/show`) to recognize newer families:
  - Reasoning/thinking: `gpt-oss`, `magistral`, `nemotron`.
  - Vision: `moondream`, `mllama` (Llama vision).
- Docs: the Models guide (EN/FR) now documents live `/api/show` capability detection and the
  refreshed fallback families.

### Notes

- Maintenance release tracking the recent Ollama cadence; no UI changes.

## [0.4.8] — 2026-05-26

### Added

- Localized README files cross-linked by a language switcher at the top of each:
  - `README.fr.md` (Français)
  - `README.zh-CN.md` (简体中文)
  - `README.ar.md` (العربية, wrapped in `<div dir="rtl">` for GitHub RTL render)
  - `README.sr.md` (Srpski, Latin script)
- Chinese and Arabic translations for the two namespaces added in v0.4.7:
  - `src/locales/zh/fim.json` + `src/locales/ar/fim.json`
  - `src/locales/zh/protocols.json` + `src/locales/ar/protocols.json`
  - Wired into `src/locales/{zh,ar}/index.ts` so the new strings are no longer English-fallback for Chinese and Arabic users.

### Notes

- With this release, `zh` and `ar` reach 18/18 namespace coverage — fully on par with `en`, `fr`, `sr`, and `sr-Cyrl`.
- No new features, no API changes, no UI changes beyond locale strings.
- `package-lock.json` realigned from 0.4.3 (had drifted since v0.4.4).

## [0.4.7] — 2026-05-24

### Added

- **Fill-in-the-Middle Playground** (`/fim`) — new page for testing code completion with prefix + suffix textareas. Uses Ollama's `suffix` field on `/api/generate`. Coding-model detection groups FIM-capable models (Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder, StarCoder) first in the picker and warns when a non-coding model is selected. Stitched preview shows the result as it would appear in an editor.
- **Protocol Observatory** (`/protocols`) — new page that fires the same prompt through Ollama's three serving protocols in parallel: native `/api/chat` (NDJSON), OpenAI-compat `/v1/chat/completions` (SSE), and Anthropic-compat `/v1/messages` (SSE with `event:` tags). Per-protocol metrics, envelope inspector, and an Envelope Diff tab comparing wire-format differences. All local — no cloud, no API keys.
- **Thinking control** in Chat Settings (Off / On / Max) — toggles Ollama's `think` parameter, visible only when the active model has the `thinking` capability. `Max` corresponds to `think: "max"` (added in Ollama 0.21.3).
- **Response format control** in Chat Settings (Free-form / Valid JSON / JSON Schema strict) — exposes Ollama's `format` parameter now accepting a JSON Schema object. Live schema validation in textarea.
- Wire-level types: `OllamaChatRequest` / `OllamaGenerateRequest` gained `think?: boolean | 'max'`, widened `format?: 'json' | Record<string, unknown>`, and `suffix?: string` on generate.
- New `src/services/anthropic-client.ts` and `src/types/anthropic.ts` — Anthropic Messages API client and SSE event-tagged parser. Targets local `/v1/messages` (no cloud).
- Two new feature cards on the public website home page (EN + FR): "Fill-in-the-Middle Playground" and "Protocol Observatory".
- New VitePress pages: `docs/{en,fr}/guide/fim.md` and `docs/{en,fr}/guide/protocols.md`. Guide sidebars updated 10 → 12 items.
- README "Ollama Compatibility" section enumerating every endpoint LLMxRay uses, with version-floor and version-recommended guidance.

### Changed

- `streamChatOpenAI` now passes `reasoning_effort` and `response_format` through to the OpenAI-compat endpoint.
- README "Multilingual" line now explicitly mentions Serbian alongside English, French, Chinese, and Arabic.

### Compatibility

- Tested and verified against Ollama 0.24.0. Works with Ollama 0.20+ for chat/generate; full feature parity requires 0.24+ (Anthropic-compat endpoint added in 0.23, `think: "max"` added in 0.21.3).

### Process

- Self-hosted GitHub Actions release workflow disabled (renamed `.github/workflows/release.yml` → `release.yml.disabled`). All releases are now fully manual.
- Pre-flight 7-surface audit (package.json, commits, local tags, origin tags, GitHub Releases, npm, Docker) added to the release dance — caught a tags/Releases drift accumulated during v0.4.4–v0.4.6 which was reconciled before cutting v0.4.7.

## [0.4.6] — 2026-04-13

### Added

- Slash command palette is now fully internationalized:
  - All 29 command descriptions are translated via `dashboard.slashCommands.descriptions.*`
  - All 50+ runtime notification messages from command `execute()` callbacks are translated via `dashboard.slashCommands.notifications.*`
  - The previously-missing `memory` category label is now translated
  - Full translations added for English, French, and Serbian (both Latin and Cyrillic)
- `SlashCommandContext` now carries a `t` function so command callbacks can produce localized notifications. The `getCommandsByCategory` helper accepts an optional `t` argument and falls back to English labels when called without one (e.g. from tests).
- New `descriptionKey` field on `SlashCommand` — vue-i18n key used by UI surfaces (the registry's literal `description` field is kept as an English fallback used by `/help`).

### Notes

- Arabic and Chinese slash command strings fall back to English (vue-i18n's intended behavior for missing keys). Native translations can be added in a future patch.
- Help text placeholder syntax changed from `<value>` to `[value]` across all locales — vue-i18n's parser was treating `<…>` as inline HTML and refusing to compile the messages.

## [0.4.5] — 2026-04-13

### Fixed

- Serbian translations: `dashboard.json`, `comparison.json`, and `embeddings.json` had been shipped in v0.4.4 with mostly-untranslated English content because the LLM-based translation pipeline silently echoed source text on those three files. Replaced with full native Serbian translations (~165 strings across the three files).
- Critical fix in `embeddings.json`: the literal CLI command `ollama pull nomic-embed-text` was previously translated to Serbian (`olama povuci nomic-ugnjezdi-tekst`), which would silently fail when copy-pasted into a terminal. Restored to literal command.
- Chat input placeholder: `"Send a message... (Shift+Enter for new line)"` is now properly translated to `"Pošalji poruku... (Shift+Enter za novi red)"` (and Cyrillic equivalent).

### Changed

- `scripts/transliterate-sr.py` significantly improved:
  - Word-boundary preserve regex: Serbian-inflected forms like `tokena` (genitive of `token`) now fully transliterate to `токена` instead of producing mixed-script `tokenа`.
  - Escape sequence preservation: `\n`, `\t`, etc. are no longer broken by the transliterator (would have corrupted JSON stop sequences).
  - Length-descending alternation order: multi-word patterns like `ollama pull` correctly match before their single-word prefixes.
  - Expanded preserve list: sampling parameters (`Top-P`, `Top-K`, `Mirostat`, `Seed`, `TTFT`, `V1-V4`), ML technical terms (`Nucleus`, `sampling`, `Human`, `Assistant`, `System`, `num_predict`, `num_ctx`, `max_tokens`), Ollama CLI tokens (`ollama`, `ollama pull`, `nomic-embed-text`).

## [0.4.4] — 2026-04-13

### Added

- Serbian language support in two scripts: Latin/latinica (`sr`) and Cyrillic/ћирилица (`sr-Cyrl`) — full UI translation across all 15 locale sections
- Language dropdown in the header redesigned as a proper menu (was a single cycling button) with real SVG flag icons via `flag-icons`
- Settings → General → Language picker redesigned as a button grid with flags
- `scripts/transliterate-sr.py` — deterministic Serbian Latin → Cyrillic transliterator that preserves brand names, English loanwords, and `{name}` template placeholders. Re-run after editing any `sr/*.json` file to keep `sr-Cyrl/` in sync.

### Changed

- `flag` field in `AVAILABLE_LOCALES` now uses ISO 3166-1 alpha-2 country codes (e.g. `'gb'`, `'rs'`) instead of emoji strings — required for proper flag rendering on platforms without flag emoji glyphs (notably Windows Chrome)
- Browser language detection now defaults to Serbian Cyrillic (`sr-Cyrl`) when the browser locale is `sr`, and Serbian Latin (`sr`) when it is `sr-Latn`

### Fixed

- `tsconfig.json` `baseUrl` deprecation warning — removed `baseUrl: "."` since modern TypeScript resolves `paths` relative to the tsconfig location automatically

### Security

- `npm audit fix` reduced known vulnerabilities from 9 to 3; the remaining 3 are all in the `vitepress → vite → esbuild` dev-only chain (no runtime impact)

## [0.4.3] — 2026-04-05

### Added

- 106 unit tests covering all core services: quality analyzer, error classifier, metrics calculator, token counter, prompt analyzer, reasoning parser
- CI test gate in release workflow — service tests must pass before npm publish and Docker build

### Fixed

- Removed cross-project reference from README

## [0.4.2] — 2026-03-21

### Added

- Analytics Dashboard — per-turn quality score (0-5), requests over time, model distribution doughnut, active hours heatmap (7x24), settings impact scatter, error timeline
- Performance Analytics — P50/P95/P99 latency over time, TTFT percentile chart, inter-token latency histogram, cold vs warm start indicators, load duration trend
- Error Intelligence — 7-category error classifier (connection, timeout, model_not_found, context_exceeded, oom, tool_error, cancelled), error rate by model stacked bar chart

## [0.4.1] — 2026-03-21

### Added

- Response Quality Gates — repetition detection (4-gram), refusal detection (8 patterns), gibberish detection, empty response detection, truncation warning, quality badges (red/yellow/green) per response
- Cost & Usage Dashboard — token usage per model/day, estimated cost display with model pricing, daily cost trend chart

## [0.4.0] — 2026-03-18

### Added

- Local AI History Database — unified queryable archive of all experiments (benchmarks, comparisons, chats, training pairs, sessions)
- History tab in Settings with filters (type, model, language, date, tags), trend charts, export (JSON/CSV), retention policies
- Powered by Dexie.js over IndexedDB — permanent, browser-native, no cloud

## [0.3.5] — 2026-03-18

### Added

- Website: Full Feature Coverage — Surgical Benchmark section (3 cards with screenshots), AI Training Pipeline (4-step animated flow), System at a Glance diagnostics
- Updated sitemap with lastmod dates
- All sections bilingual (EN + FR)

## [0.3.4] — 2026-03-18

### Added

- Benchmark Suite Builder — visual question editor (2-6 choices, category, difficulty), AI-assisted generation from topic, edit existing suites, JSON export
- Benchmark Builder guide (EN + FR)

## [0.3.3] — 2026-03-18

### Fixed

- Re-tagged from v0.3.2.2 for npm semver compatibility (npm requires 3-part versions)

## [0.3.2] — 2026-03-18

### Added

- Language Compare — per-slot prompts with language tags, inline language detection, translate-to-X with streaming, cancel support, Token Tax visualization, RTL-aware textareas
- Module 9: What Words Cost — Educators Kit module on tokenization bias (EN + FR + 6 SVGs)
- Language Compare guide and Diagnostics Token Tax section on website

## [0.3.1] — 2026-03-18

### Added

- RTL Layout Support — 119 directional CSS classes replaced with logical properties across 35 files, automatic `dir="rtl"`, directional icon flipping
- New Locales — Chinese (zh), Arabic (ar) fully translated; Hebrew (he), Japanese (ja) scaffold ready for community
- CJK Readiness — Noto Sans SC/JP/KR font stack, CJK line-breaking CSS, character-based token counting

## [0.2.0] — 2026-03-17

### Added

- npm package: run `npx llmxray` to serve LLMxRay with built-in Ollama proxy
- CLI flags: `--port` and `--ollama-url` for configuration
- Environment variable support: `PORT` and `OLLAMA_URL`
- Docker support: `docker run -p 5174:5174 lognebudo/llmxray`
- docker-compose.example.yml showing LLMxRay alongside Ollama
- Production Express server for static file serving and API proxying
- System info and API probe endpoints now work in production (not just dev)

### Fixed

- Settings page Ollama URL now actually applies to the HTTP client
- Benchmark streaming no longer hardcodes `/v1` path

## [0.1.2] — 2026-03-16

### Added

- VitePress documentation site with violet theme, local search, and EN/FR i18n
- User Guide: 10 chapters (one per navigation item) + introduction + installation
- Developer Reference: architecture, stores, services, composables, types, API integration, testing
- Full French translation of all 19 content pages
- Screenshots reused from website project (chat, compare, embeddings, KB, benchmark, system)
- CONTRIBUTING.md with development setup, code style, and PR process
- CHANGELOG.md covering all releases since initial commit

## [0.1.1] — 2026-03-16

### Added

- AI Training page with data curation, tagging, bulk operations, and export for fine-tuning
- Canvas AI insights and model selector improvements
- Tabbed Settings with model catalog, embeddings model comparison, and sidebar alignment
- Persistent chat sessions with IndexedDB backing, storage usage visuals, embeddings UX improvements, feedback system, and Knowledge Base integration
- UI polish pass: violet rebrand, dark/light mode toggle, animated indicators, and UX improvements across the app

### Changed

- Surfaced untapped Ollama data: real logprobs in chat, context truncation warning, expanded model metadata display
- Improved explanatory text for synthetic introspection visualizations

### Fixed

- Agent graph visualization for tool calls and reasoning parser re-entry bug

## [0.1.0] — 2026-03-14

### Added

- Initial release: real-time chat with token streaming, confidence coloring, session history, introspection visualizations, and prompt anatomy analysis
- Slot-based model comparison with per-slot settings, diff view (word-level), and metrics bar
- Surgical Benchmark with real logprobs via OpenAI-compatible endpoint and model capability registry
- Visual Tool Canvas with Recast AST bidirectional sync, CodeMirror 6 code highlighting, and response optimizer drawer
- Tool Workshop with Google OAuth2 integration and multi-round tool calling loop (max 5 rounds)
- Vision model support with automatic detection, image paste/upload, and lightbox viewer
- Embeddings Lab with cosine similarity meter and embedding-capable model auto-detection
- RAG pipeline: document upload (PDF, DOCX, CSV, TXT, MD), chunking, embedding, and semantic search
- My System page with accurate hardware detection via custom Vite plugin (Windows/Linux/macOS)
- Markdown rendering for chat messages with syntax-highlighted code blocks
- Educational tooltips and visual parameter scales in Settings
- Slash commands, file attachments, and tool definition UI
- Testing infrastructure: Vitest for unit tests, Playwright for E2E with live-ollama project
- Comprehensive README with feature overview, quick start guide, and architecture documentation
- Apache 2.0 license, NOTICE file, and trademark notice

### Fixed

- Benchmark resume DataCloneError when resuming interrupted benchmark runs
- Comparison slots reappearing after clear or navigation
- Native thinking field handling and session persistence issues
