# Composables

LLMxRay dispose de 7 composables Vue dans `src/composables/`. Les composables encapsulent de la logique réactive réutilisable selon les conventions Vue 3.

## useOllamaStream

**Fichier :** `src/composables/useOllamaStream.ts`

Encapsule `startGeneration` et `startChat` avec une gestion d'état réactive du streaming.

**Retourne :**
- `isStreaming` — Indique si un flux est actuellement actif
- `error` — Toute erreur survenue
- `startChat(model, messages, options)` — Lance un flux de chat
- `startGeneration(model, prompt, options)` — Lance une génération à partir d'un prompt unique
- `cancel()` — Annule le flux actif

**Utilisation :**
```typescript
const { isStreaming, error, startChat, cancel } = useOllamaStream()

await startChat('llama3.2', messages, { temperature: 0.7 })
```

## useMetrics

**Fichier :** `src/composables/useMetrics.ts`

Accès réactif aux métriques de session et aux statistiques agrégées.

**Retourne :**
- `metrics` — Métriques de la session en cours (TTFT, tokens/sec, etc.)
- `aggregate` — Métriques agrégées inter-sessions
- `history` — Historique des métriques pour les graphiques

## useTokenConfidence

**Fichier :** `src/composables/useTokenConfidence.ts`

Calcule la confiance des tokens à partir des logprobs (si disponibles) ou se rabat sur une approximation basée sur la latence.

**Retourne :**
- `getConfidence(token)` — Renvoie un score de confiance entre 0 et 1
- `getColor(confidence)` — Associe la confiance à une couleur CSS

## useAgentGraph

**Fichier :** `src/composables/useAgentGraph.ts`

Gère la visualisation et la manipulation du graphe d'exécution de l'agent.

**Retourne :**
- `graph` — État réactif du graphe de l'agent
- `nodes` — Liste calculée des nœuds
- `edges` — Liste calculée des arêtes
- `addNode(node)` — Ajoute un nœud au graphe
- `addEdge(edge)` — Ajoute une arête entre deux nœuds

## useToolCanvas

**Fichier :** `src/composables/useToolCanvas.ts`

Gestion de l'état du canvas d'outils, incluant le glisser-déposer, le positionnement des nœuds et la sélection.

**Retourne :**
- `tools` — Liste réactive des outils
- `selectedTool` — Outil actuellement sélectionné
- `addTool(tool)` — Ajoute un nœud d'outil au canvas
- `updateTool(id, changes)` — Met à jour les propriétés d'un outil
- `removeTool(id)` — Supprime un outil du canvas

## useMarkdown

**Fichier :** `src/composables/useMarkdown.ts`

Rendu Markdown avec `marked` et coloration syntaxique pour les blocs de code.

**Retourne :**
- `render(text)` — Rend une chaîne Markdown en HTML
- `renderInline(text)` — Rend du Markdown en ligne (sans éléments de bloc)

## useFileAttachment

**Fichier :** `src/composables/useFileAttachment.ts`

Gestion de l'upload de fichiers avec détection de format et validation de taille.

**Retourne :**
- `attachments` — Liste réactive des fichiers attachés
- `addFile(file)` — Traite et ajoute un fichier
- `removeFile(index)` — Supprime une pièce jointe
- `clear()` — Efface toutes les pièces jointes
