# Tool Workshop

The Tool Workshop is a visual canvas for building, editing, and testing tool definitions that models can call during chat.

**Sidebar item:** Tool Workshop
**Route:** `/tools`

## Interface Overview

The page features a **node-based canvas** powered by Vue Flow. Each tool is represented as a visual node showing its name, description, parameters, and implementation body.

## Creating Tools

### From Templates
Click **Templates** to browse 15+ built-in templates including:
- Web fetch (HTTP requests)
- Calculator
- Google Calendar / Gmail integration
- Regex tester
- Date/time utilities
- And more

### From Scratch
Click **Add Tool** to create a blank tool node. Fill in:
- **Name** — The function name (used by the model)
- **Description** — What the tool does (helps the model decide when to use it)
- **Parameters** — JSON Schema-defined inputs
- **Implementation** — TypeScript function body

## Editing Tools

### Inline Code Editing
Each tool node has a full **CodeMirror 6** editor with TypeScript syntax highlighting. Edit the implementation directly on the canvas.

### Code Panel (Bidirectional Sync)
Open the **Code Panel** to see all tools as combined TypeScript source code. This uses a **Recast AST parser** for bidirectional synchronization:
- Edit code in the panel → nodes update on the canvas
- Edit nodes on the canvas → code updates in the panel

### Schema Viewer
Click the schema icon on any tool to see its auto-generated **OpenAI-compatible JSON schema**. One-click copy for use in other systems.

## Probe & Pick

Point at any API URL to:
1. **Probe** the endpoint — send a request and inspect the response
2. **Browse the JSON tree** — expand/collapse the response structure
3. **Pick fields** — select the data you need
4. **Auto-generate** fetch code and parameter mappings

## OpenAPI Discovery

If an API has an OpenAPI/Swagger specification:
1. Enter the spec URL
2. LLMxRay parses the spec automatically
3. Browse available endpoints
4. Pick an endpoint to auto-generate a tool definition

## Live Execution

During chat, when the model calls a tool:
- The corresponding node **pulses** on the canvas
- Execution results appear as an **overlay** on the node
- The tool call timeline (in Chat Diagnostics) links back to the canvas

## Tool Call Optimizer

When a model calls a tool during chat, an **"Optimize this Tool"** button appears on the result. Click it to open the Response Optimizer Drawer:

1. **Visualize** the API response as an interactive JSON tree
2. **Select** only the fields the model actually needs
3. **Auto-generate** optimized fetch code with field extraction
4. **Create** a new optimized tool in the Workshop with one click

## Persistence

Tool definitions, node positions, mappings, and probe configurations are all persisted and survive browser refreshes.

## Exporting Tools

Click the **Export** button to download your tool definitions as **JSON**. The export includes tool names, descriptions, parameter schemas, and implementation bodies — everything needed to reimport or share your tools. See the [Export guide](./export) for details on all export options.

## Tips

- Start with a template and customize it — faster than building from scratch.
- Use the **Schema Viewer** to verify your tool definition matches what models expect.
- The **Probe & Pick** workflow is the fastest way to wrap a REST API as a tool.
- Tools are automatically available in chat when enabled.
