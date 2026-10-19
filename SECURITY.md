# Security

## Reporting a vulnerability

Please report it privately, through GitHub: **[Report a vulnerability](https://github.com/LogneBudo/llmxray/security/advisories/new)**. Only the maintainer sees the report. Please do not open a public issue for a security problem.

Say what you found, how to reproduce it, and which version you ran (LLMxRay prints it when it starts, or give the Docker tag). You will get an answer within a few days, and a fixed release as soon as the fix is ready; the report is credited in the CHANGELOG unless you ask otherwise.

## Supported versions

Fixes go into the latest release only. LLMxRay updates with `npx llmxray@latest` or `docker pull djovaneli/llmxray`.

| Version | Supported |
|---|---|
| latest 0.8.x | yes |
| anything older | no: update first |

## What LLMxRay does, for judging a report

- **It runs on your machine.** The app (port 5174) and the observe port (11435) answer only `127.0.0.1` unless started with `--host 0.0.0.0`. The Docker image binds every interface inside the container, which `-p` then publishes.
- **The observe port forwards requests to Ollama untouched** and records counts and timings: tokens, cache, durations, client, model. It never changes a request or a response.
- **Prompt text is kept only when you switch on *Keep the prompt text***, in `~/.llmxray/observe/` on your machine. Turn records and kept prompts are deleted after 30 days; **Clear** deletes them at once.
- **Nothing is sent anywhere** unless you give an OpenTelemetry collector address on the Live page or through `OTEL_EXPORTER_OTLP_ENDPOINT`. The prompt text goes along only with two switches on. Headers you enter for a collector are kept as written in `~/.llmxray/export.json`.
- **Every setting that changes something takes JSON only** (`POST /__observe/settings`, `/clear`, `/export`, `/export/test`), so a page on another site cannot trigger it from your browser.
- **The API probe** fetches only from the Ollama address LLMxRay was started with and from this machine.
- **The MCP server is read-only.** Its seven tools read from the running LLMxRay over localhost and change nothing.
- **No telemetry, no account, no API key.** LLMxRay never calls home.

A report that one of these is not true is exactly what this page is for.
