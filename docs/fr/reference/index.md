# Reference developpeur

Cette section fournit la documentation technique pour les developpeurs souhaitant comprendre, modifier ou contribuer a LLMxRay.

## Vue d'ensemble

LLMxRay est une application monopage (SPA) Vue 3 + TypeScript qui communique avec une instance locale d'Ollama. Elle utilise Pinia pour la gestion d'etat, IndexedDB pour la persistance, et une architecture en streaming pour l'affichage des tokens en temps reel.

| Couche | Technologie |
|---|---|
| Framework | Vue 3.5 + Composition API (`<script setup>`) |
| Langage | TypeScript 5.9 (strict) |
| Build | Vite 7.3 |
| Styles | Tailwind CSS 4.2 |
| Etat | Pinia 3 (un store par domaine) |
| Routage | Vue Router 5 |
| Graphiques | Chart.js 4 + vue-chartjs, D3.js 7 |
| Canvas | Vue Flow 1.x (editeur visuel a base de noeuds) |
| Editeur de code | CodeMirror 6 |
| Parseur AST | Recast + @babel/parser |
| Stockage | IndexedDB (natif du navigateur) |
| Backend LLM | Ollama (local, via proxy) |

## Sections

- **[Architecture](./architecture)** — Flux de donnees, streaming, stockage, plugins
- **[Stores](./stores)** — Les 24 stores Pinia avec leur etat et leurs actions
- **[Services](./services)** — Les 36 modules de services avec leurs responsabilites
- **[Composables](./composables)** — Les 7 composables Vue
- **[Types](./types)** — Interfaces TypeScript principales
- **[Integration API](./api-integration)** — Endpoints Ollama, proxy, protocoles de streaming
- **[Tests](./testing)** — Configuration et pratiques Vitest et Playwright
