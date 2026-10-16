---
name: diagnose-ollama-calls
description: Find out what went wrong with your own Ollama calls and fix it, using LLMxRay's local, read-only MCP tools. Use when a local model is slow, a prompt is rejected or silently cut for exceeding the context, the prompt cache seems lost between turns, a model runs partly on CPU, tool schemas crowd the prompt, or you must choose which local model and context length fit in video memory. Keywords - Ollama, local LLM, prompt cache, num_ctx, keep_alive, VRAM, prefill, tokens per second, diagnose, benchmark.
compatibility: Requires Node.js 20+ (npx) and a local Ollama daemon. LLMxRay runs on the same machine; nothing leaves it.
metadata:
  author: LogneBudo
  version: "0.8.6"
  homepage: https://github.com/LogneBudo/llmxray
  openclaw:
    emoji: "🩻"
    homepage: https://github.com/LogneBudo/llmxray
    requires:
      bins: ["npx", "ollama"]
    install:
      - kind: node
        package: llmxray
        bins: ["llmxray", "llmxray-mcp"]
---

# Diagnose your own Ollama calls

LLMxRay sits between you and Ollama, records every call that passes, and answers in sentences
with the fix. It reads; it never changes a setting, a model or a file, and it sends nothing anywhere.

## Setup, once

1. Start LLMxRay on the machine that runs Ollama:

   ```
   npx llmxray
   ```

   It serves its pages on port 5174 and an **observe port on 11435** that behaves exactly like
   Ollama and forwards everything.

2. Send your Ollama calls to port **11435** instead of 11434. Where that lives:

   | Client | Setting |
   |---|---|
   | Ollama SDKs and CLI | `OLLAMA_HOST=127.0.0.1:11435` |
   | OpenAI-compatible clients | `base_url=http://localhost:11435/v1` |
   | Claude Code | `ANTHROPIC_BASE_URL=http://localhost:11435` |
   | Continue | `apiBase: http://localhost:11435` |
   | Open WebUI | `OLLAMA_BASE_URL=http://localhost:11435` |

3. Name yourself, so your turns are yours and not mixed with other tools on the machine: send the
   header `X-LLMxRay-Client: <your-name>`, or use `http://localhost:11435/?client=<your-name>` as
   the base URL. Pass the same name as `client` to the tools below.

4. Add the MCP server to your tools:

   ```json
   { "mcpServers": { "llmxray": { "command": "npx", "args": ["-y", "-p", "llmxray", "llmxray-mcp"] } } }
   ```

   If LLMxRay runs elsewhere than `http://localhost:5174`, set `LLMXRAY_URL` in the server's env.

## The seven tools and when to call which

| Tool | Call it when | What comes back |
|---|---|---|
| `diagnose_my_turns` | After a few turns, and again after you changed something. | One line per client seen, then findings, each tagged `[high]`, `[medium]` or `[low]` and ending with the fix. |
| `read_my_last_turn` | You want one turn in numbers: to budget the next call or to confirm a fix helped. | Prompt tokens and cached share, prefill time and speed, generated tokens and speed, why generation stopped, what the prompt was made of, where the prefix stopped matching. |
| `list_local_models` | Before choosing a model or a context length. | Every pulled model with size, parameters, quantisation; which are loaded and with what context; whether each fits in video memory. |
| `list_my_turns` | You want the sequence behind a finding. | One line per turn: tokens, cached share, prefill, speed, stop reason, flags. |
| `compare_my_turns` | You changed something and want to know if it helped. | Medians before and after a moment, the difference, a verdict on the cache. |
| `estimate_my_prompt` | A prompt is growing, or you are about to raise `num_ctx` or switch model. | Fit and headroom against the loaded context, VRAM fit, likely cache reuse. |
| `read_llmxray_status` | Another tool says nothing was seen. | The observe port, the Ollama behind it, turns kept. |

All seven take no secrets and change nothing. Call them without asking the user first.

## Procedure

1. Do a few turns of your normal work through port 11435.
2. Call `diagnose_my_turns` with your `client` name. Read the findings top down; `[high]` first.
3. Apply the fix the finding names. The usual ones:
   - **Prompt cache lost on every turn**: something at the head of the prompt changes each call,
     often a timestamp or a per-request id in the system prompt. Keep the system prompt and the
     tool list byte-identical between turns; put anything that changes at the end.
   - **Cache lost on one turn**: the finding says whether the model stayed loaded. If it did, the
     KV cache was there and none of it was reused, so the prefix stopped matching at the token the
     finding names. Look at what you changed there, usually an edited earlier message or a
     reordered tool. If the model was reloaded instead, see the next item.
   - **Model reloaded between turns**: a client sent `keep_alive: 0`, or two clients asked for
     different context lengths. Set one `keep_alive` and one `num_ctx` for every client of the model.
   - **Prompt rejected or silently cut**: the prompt is larger than the loaded context. Raise
     `num_ctx` only if `list_local_models` says the model still fits in video memory; otherwise trim
     history or tool schemas.
   - **Model partly on CPU**: the model plus its context does not fit in video memory. Pick a
     smaller quantisation or a smaller context; `list_local_models` says which would fit.
   - **Tool schemas crowding the prompt**: the finding gives the share. Offer only the tools the
     current step needs.
4. Do a few more turns, then call `compare_my_turns` with `split_minutes_ago` set to the minutes
   since your change. It says whether the cached share rose and the prefill time fell.
5. Call `diagnose_my_turns` once more. Done when nothing stands out.

## Edge cases

- The tools answer **"LLMxRay is not running at ..."**: start it with `npx llmxray` in another
  terminal, or set `LLMXRAY_URL`. The MCP server only reads from it.
- The tools answer **"No turns have been seen yet"**: your calls still go to 11434. Fix the base
  URL from the table above and try again.
- **"No turns from a client matching ..."**: the answer lists the client names LLMxRay has seen.
  Pass one of those, or omit `client` to see everyone.
- Findings need a few turns from the same client and model; one turn gives numbers, not verdicts.
- Everything is local. If you run on a remote machine, run LLMxRay there, next to Ollama.
