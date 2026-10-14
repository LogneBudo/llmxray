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
| Porteur du cache d'invite | `prompt_eval_cached_count` | `usage.prompt_tokens_details.cached_tokens` | `usage.cache_read_input_tokens` |
| Porteur du temps de préremplissage | `prompt_eval_duration` (ns) | `timings.prompt_ms` | — |
| Porteur du raisonnement | `message.thinking` | `choices[].delta.reasoning` | événement `thinking_delta` |
| Enveloppe d'erreur | `{"error": "string"}` | `{"error": {"message", "type", "code"}}` | `{"type": "error", "error": {...}, "request_id"}` |

Les lignes « ce run » se remplissent avec les valeurs réellement observées pendant votre exécution — vous pouvez voir, par exemple, que le protocole natif a renvoyé `done_reason: "stop"` tandis que le protocole Anthropic a appelé le même résultat `stop_reason: "end_turn"`.

Avec un modèle à raisonnement, la ligne du raisonnement est celle à surveiller. Le chemin natif ne réfléchit que si la requête le demande ; les deux chemins compatibles laissent le modèle réfléchir par défaut, et ce raisonnement partage le budget de sortie avec la réponse. Avec la même invite et le même `max_tokens`, une colonne compatible peut dépenser tous ses tokens en raisonnement et ne produire aucun texte de réponse. Chaque colonne montre ce que le modèle a pensé, et le dit quand le budget s'est épuisé avant le premier mot.

### Les deux débits de préremplissage

Depuis Ollama 0.35.1, l'endpoint compatible OpenAI joint un bloc `timings` avec un `prompt_per_second` tout calculé. Le tableau l'affiche comme **« Débit de préremplissage, tel que le démon l'annonce »**, à côté de **« Débit de préremplissage sur les tokens évalués »**, que LLMxRay calcule à partir du même chunk : `(prompt_tokens − cached_tokens) / prompt_ms`.

Ils divergent dès que le cache est chaud. Le chiffre du démon divise l'invite *totale* par le temps passé sur les tokens *non mis en cache*, il est donc gonflé du taux de réutilisation ; lancez deux fois la même invite et la cellule annoncée passe en orange. Mesuré sur 0.40.3 avec 30 tokens sur 31 en cache : 3875 tok/s annoncés, 125 tok/s évalués. Seul le second chiffre décrit du travail réellement fait par le modèle. Le protocole natif n'annonce jamais de débit, et le protocole compatible Anthropic ne rapporte aucun temps de préremplissage, d'où les tirets.

## Pourquoi trois protocoles ?

Ce n'est pas théorique — beaucoup d'outils réels s'appuient sur ces couches de compatibilité :

- **Compat. OpenAI** est la façon dont les extensions IDE, Cursor, Continue.dev, et la plupart des bibliothèques Python qui s'attendent à « l'API OpenAI » parlent aux modèles locaux.
- **Compat. Anthropic** est la façon dont des outils comme Claude Code, Claude Cowork et OpenClaw parlent à Ollama (ajouté dans Ollama v0.23 / janvier 2026).
- **Natif** est ce qui donne les métriques les plus riches — incluant les temps, les comptes d'évaluation et le champ `done_reason`.

Si un outil tiers se comporte étrangement contre votre Ollama local, l'Observatoire des Protocoles vous permet de voir à quoi ressemble le fil à travers les yeux de ce protocole.

## Voir aussi

- [Diagnostics de Chat](./chat-diagnostics) pour une analyse approfondie en mono-protocole
- [Comparer](./compare) pour comparer différents *modèles* sur le même prompt (l'Observatoire garde le modèle constant et varie le protocole)
