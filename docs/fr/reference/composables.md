# Composables

LLMxRay dispose de 7 composables Vue dans `src/composables/`. Les composables encapsulent de la logique reactive reutilisable selon les conventions Vue 3.

## useOllamaStream

**Fichier :** `src/composables/useOllamaStream.ts`

Encapsule `startGeneration` et `startChat` avec une gestion d'etat reactive du streaming.

**Retourne :**
- `isStreaming` — Indique si un flux est actuellement actif
- `error` — Toute erreur survenue
- `startChat(model, messages, options)` — Lance un flux de chat
- `startGeneration(model, prompt, options)` — Lance une generation a partir d'un prompt unique
- `cancel()` — Annule le flux actif

**Utilisation :**
```typescript
const { isStreaming, error, startChat, cancel } = useOllamaStream()

await startChat('llama3.2', messages, { temperature: 0.7 })
```

## useMetrics

**Fichier :** `src/composables/useMetrics.ts`

Acces reactif aux metriques de session et aux statistiques agregees.

**Retourne :**
- `metrics` — Metriques de la session en cours (TTFT, tokens/sec, etc.)
- `aggregate` — Metriques agregees inter-sessions
- `history` — Historique des metriques pour les graphiques

## useTokenConfidence

**Fichier :** `src/composables/useTokenConfidence.ts`

Calcule la confiance des tokens a partir des logprobs (si disponibles) ou se rabat sur une approximation basee sur la latence.

**Retourne :**
- `getConfidence(token)` — Renvoie un score de confiance entre 0 et 1
- `getColor(confidence)` — Associe la confiance a une couleur CSS

## useAgentGraph

**Fichier :** `src/composables/useAgentGraph.ts`

Gere la visualisation et la manipulation du graphe d'execution de l'agent.

**Retourne :**
- `graph` — Etat reactif du graphe de l'agent
- `nodes` — Liste calculee des noeuds
- `edges` — Liste calculee des aretes
- `addNode(node)` — Ajoute un noeud au graphe
- `addEdge(edge)` — Ajoute une arete entre deux noeuds

## useToolCanvas

**Fichier :** `src/composables/useToolCanvas.ts`

Gestion de l'etat du canvas d'outils, incluant le glisser-deposer, le positionnement des noeuds et la selection.

**Retourne :**
- `tools` — Liste reactive des outils
- `selectedTool` — Outil actuellement selectionne
- `addTool(tool)` — Ajoute un noeud d'outil au canvas
- `updateTool(id, changes)` — Met a jour les proprietes d'un outil
- `removeTool(id)` — Supprime un outil du canvas

## useMarkdown

**Fichier :** `src/composables/useMarkdown.ts`

Rendu Markdown avec `marked` et coloration syntaxique pour les blocs de code.

**Retourne :**
- `render(text)` — Rend une chaine Markdown en HTML
- `renderInline(text)` — Rend du Markdown en ligne (sans elements de bloc)

## useFileAttachment

**Fichier :** `src/composables/useFileAttachment.ts`

Gestion de l'upload de fichiers avec detection de format et validation de taille.

**Retourne :**
- `attachments` — Liste reactive des fichiers attaches
- `addFile(file)` — Traite et ajoute un fichier
- `removeFile(index)` — Supprime une piece jointe
- `clear()` — Efface toutes les pieces jointes
