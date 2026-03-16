# Developer Reference

This section provides technical documentation for developers who want to understand, modify, or contribute to LLMxRay.

## Overview

LLMxRay is a Vue 3 + TypeScript single-page application that communicates with a local Ollama instance. It uses Pinia for state management, IndexedDB for persistence, and a streaming architecture for real-time token display.

| Layer | Technology |
|---|---|
| Framework | Vue 3.5 + Composition API (`<script setup>`) |
| Language | TypeScript 5.9 (strict) |
| Build | Vite 7.3 |
| Styling | Tailwind CSS 4.2 |
| State | Pinia 3 (one store per concern) |
| Routing | Vue Router 5 |
| Charts | Chart.js 4 + vue-chartjs, D3.js 7 |
| Canvas | Vue Flow 1.x (node-based visual editor) |
| Code Editor | CodeMirror 6 |
| AST Parser | Recast + @babel/parser |
| Storage | IndexedDB (browser-native) |
| LLM Backend | Ollama (local, via proxy) |

## Sections

- **[Architecture](./architecture)** — Data flow, streaming, storage, plugins
- **[Stores](./stores)** — All 24 Pinia stores with state and actions
- **[Services](./services)** — All 36 service modules with responsibilities
- **[Composables](./composables)** — All 7 Vue composables
- **[Types](./types)** — Key TypeScript interfaces
- **[API Integration](./api-integration)** — Ollama endpoints, proxy, streaming protocols
- **[Testing](./testing)** — Vitest and Playwright setup and patterns
