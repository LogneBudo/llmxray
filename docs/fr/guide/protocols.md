# Observatoire des Protocoles

L'**Observatoire des Protocoles** envoie le même prompt à travers **trois protocoles de service différents** sur votre démon Ollama local, en parallèle, et vous montre exactement comment chacun cadre la même conversation.

**Élément de barre latérale :** Observatoire de protocoles (sous Complétion de code)
**Route :** `/protocols`
**Ajouté dans :** v0.4.7 (mai 2026)

## Quel est l'intérêt ?

Ollama ne parle pas qu'un seul protocole. Il expose en réalité le même modèle local à travers trois formats de fil différents :

| Endpoint | Format | Encadrement du flux |
|---|---|---|
| `/api/chat` | Ollama natif | NDJSON (un JSON par ligne) |
| `/v1/chat/completions` | Compatible OpenAI | SSE (`data: …`) |
| `/v1/messages` | Compatible Anthropic | SSE avec tags `event:` |

Différents écosystèmes parlent aux LLMs via différents protocoles. Si vous construisez des intégrations, déboguez une bibliothèque cliente, ou êtes simplement curieux de voir comment le même modèle se comporte sous différents cadrages, cette page rend les différences visibles — **le tout contre le même modèle local, sans cloud, sans clés API, sans inscription.**

## Utilisation

1. Choisissez un modèle dans la liste déroulante.
2. Tapez un prompt (un défaut est fourni).
3. Ajustez le nombre de tokens max si besoin.
4. Cliquez sur **Lancer les 3 protocoles**.

Trois colonnes diffusent leurs réponses en parallèle. Chaque colonne affiche :

- Le **nom du protocole** et le chemin de l'endpoint
- Un **badge de statut** en direct (inactif → streaming → terminé)
- Le **texte de réponse streamé**
- Une **grille de métriques** : TTFT, total ms, tokens, tokens/sec, motif de fin
- Un panneau **Inspecter l'enveloppe** dépliable montrant les chunks/événements bruts (premier et dernier)

## L'onglet Diff d'enveloppe

Une fois les trois runs terminés, une section inférieure à onglets apparaît. Passez sur **Diff. d'enveloppe** pour voir une comparaison côte à côte de comment chaque protocole cadre ses réponses :

| Aspect | Natif | Compat. OpenAI | Compat. Anthropic |
|---|---|---|---|
| Encadrement du flux | NDJSON | SSE | SSE avec tags `event:` |
| Porteur du motif de fin | `done` + `done_reason` | `choices[].finish_reason` | événement `message_stop` |
| Porteur du compte de tokens | `eval_count` + `prompt_eval_count` | `usage.{prompt,completion,total}_tokens` | `usage.{input,output}_tokens` |
| Enveloppe d'erreur | `{"error": "string"}` | `{"error": {"message", "type", "code"}}` | `{"type": "error", "error": {...}, "request_id"}` |

Les lignes « ce run » se remplissent avec les valeurs réellement observées pendant votre exécution — vous pouvez voir, par exemple, que le protocole natif a renvoyé `done_reason: "stop"` tandis que le protocole Anthropic a appelé le même résultat `stop_reason: "end_turn"`.

## Pourquoi trois protocoles ?

Ce n'est pas théorique — beaucoup d'outils réels s'appuient sur ces couches de compatibilité :

- **Compat. OpenAI** est la façon dont les extensions IDE, Cursor, Continue.dev, et la plupart des bibliothèques Python qui s'attendent à « l'API OpenAI » parlent aux modèles locaux.
- **Compat. Anthropic** est la façon dont des outils comme Claude Code, Claude Cowork et OpenClaw parlent à Ollama (ajouté dans Ollama v0.23 / janvier 2026).
- **Natif** est ce qui donne les métriques les plus riches — incluant les temps, les comptes d'évaluation et le champ `done_reason`.

Si un outil tiers se comporte étrangement contre votre Ollama local, l'Observatoire des Protocoles vous permet de voir à quoi ressemble le fil à travers les yeux de ce protocole.

## Voir aussi

- [Diagnostics de Chat](./chat-diagnostics) pour une analyse approfondie en mono-protocole
- [Comparer](./compare) pour comparer différents *modèles* sur le même prompt (l'Observatoire garde le modèle constant et varie le protocole)
