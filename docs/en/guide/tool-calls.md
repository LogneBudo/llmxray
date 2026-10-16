# Tool calls

The **Tool calls** page asks one question of a local model: can it call a tool the way an agent needs? Thirteen request shapes agents send all day, scored on what the daemon returned.

**Sidebar item:** Tool calls (below GPU map)
**Route:** `/tool-calls`
**Added in:** v0.8.0 (October 2026)
**Requires:** a model that supports tools. Models that report tool support are listed first; any chat model can be ticked.

## What's the point?

Agent frameworks live or die on tool calls, and local models fail them in ways a score on a public benchmark never shows: the right tool with an argument missing, a number sent as a string, the call written into the answer text where the framework never sees it, a call to a tool that does not exist, a tool called when none was needed. Each of those breaks an agent in a different way.

The suite was born from a measured failure: a 7.5B model dropped the required `path` argument whenever the `content` argument it was writing was long. That case is in the suite in the shape that broke it.

## The cases

| Case | What it checks |
|---|---|
| One tool, one argument | The floor. |
| A long argument next to a short one | The short required argument survives a long one, with five tools on offer. |
| An argument restricted to a list | The value is from the list. |
| A number must be a number | Not a quoted string. |
| A nested object argument | Dates and times inside an object. |
| Two tools, pick the right one | The right tool among three. |
| Eight tools on offer, pick the right one | The right tool when the schemas crowd the prompt. |
| No tool is needed | A greeting gets an answer, not a call. |
| Two calls in one turn | Independent reads batched. |
| Answer after a tool result | The second half of the loop: use the result, do not call again. |
| An argument with accents and spaces | The path survives. |
| Leave an optional argument out | No invented value. |
| Only the tools that exist | No call to a tool that was never offered. |

Every case runs at temperature 0, non-streaming, through `/api/chat`, the way an agent would send it.

## Reading the results

One column per model with its share of cases right. One row per case, with why it matters. Each cell is one sentence: "the path argument is missing", "wrote the call into the answer text", "called search_web when no tool was needed". Click a cell and the answer opens under the row: the tool calls the model emitted, the text it wrote, and, when the daemon returned it, what the model thought first.

A correct tool call has no answer text. The call is the answer. The page says so where it applies.

The last run is kept in the browser; running again replaces it.

## What the page does not know

Whether a tool call would have worked once executed. It judges the call itself, against the schema the model was given, the way a framework does before running anything.

## Related

- [Live](./live.md) shows the tool calls your real agents make, turn by turn.
- [Benchmark](./benchmark.md) for the question-and-answer suites.
