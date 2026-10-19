<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Voyez ce que votre IA locale fait réellement.</strong></p>
<p align="center">
  Pointez VS Code Copilot, Open WebUI, Continue, n8n ou votre propre agent vers LLMxRay plutôt que vers Ollama, et voyez chaque tour :<br/>
  ce qui était en cache, ce qui a été relu, ce que le démon a coupé en silence, quel outil a déchargé quel modèle. Pas de cloud. Pas de clé API. Pas de coût.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-0.40.x-000?logo=ollama&logoColor=white" alt="Ollama" />
</p>

<p align="center">
  🌐 <a href="README.md">English</a> &bull;
  <strong>Français</strong> &bull;
  <a href="README.zh-CN.md">中文</a> &bull;
  <a href="README.ar.md">العربية</a> &bull;
  <a href="README.sr.md">Srpski</a>
</p>

<p align="center">
  <a href="#démarrage-rapide">Démarrage rapide</a> &bull;
  <a href="#ce-que-vos-outils-envoient-vraiment">Ce que vos outils envoient</a> &bull;
  <a href="#garder-et-envoyer-plus-loin">Garder et envoyer</a> &bull;
  <a href="#pour-les-agents">Pour les agents</a> &bull;
  <a href="#aussi-dans-la-boîte">Aussi dans la boîte</a> &bull;
  <a href="#à-qui-ça-sadresse">À qui ça s'adresse</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#compatibilité-ollama">Compatibilité Ollama</a> &bull;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/demo.gif" alt="Démo LLMxRay : un tour de chat qui arrive token par token, puis les métriques de la session" width="800" />
</p>

---

## Démarrage rapide

Il vous faut [Ollama](https://ollama.com/download) en marche, avec au moins un modèle téléchargé (`ollama pull llama3.2`). Ensuite :

```bash
npx llmxray
```

Ou avec Docker :

```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
```

Pointez maintenant vos outils vers **http://localhost:11435** plutôt que vers le 11434 d'Ollama : VS Code Copilot, Open WebUI, Continue, n8n, vos propres scripts. Il se comporte exactement comme Ollama et transmet tout. Ouvrez **http://localhost:5174**, allez sur **En direct**, et regardez leurs tours arriver.

Vous voulez juste essayer un modèle ? Ouvrez la page Chat, choisissez-en un, et envoyez un message.

---

## Ce que vos outils envoient vraiment

Votre éditeur, vos agents et vos scripts parlent tous au même Ollama. Ces pages montrent ce que chacun envoie, ce que le démon en fait, et ce que cela coûte aux autres.

### Live : ce que vos autres outils envoient

LLMxRay ouvre un second port, **11435**, qui se comporte exactement comme Ollama et lui transmet tout. Pointez VS Code Copilot, Open WebUI, Continue, n8n ou votre propre script vers `http://localhost:11435` et chaque tour qu'ils envoient apparaît ici : client, modèle, taille de l'invite, part venue du cache, vitesse de préremplissage et de génération, appels d'outils.

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ page Live : chaque tour,
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  cache réutilisé, préremplissage,
vos scripts ─────┘        (LLMxRay)                   └─ là où le cache a cassé
```

![Live : des tours venus de deux clients, avec les constats](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

Sélectionnez un tour pour voir de quoi l'invite est faite et le point exact où elle a cessé de correspondre à la précédente, c'est-à-dire là où le cache a cassé. Les constats sont des phrases simples, chacune liée au tour qui la prouve : un client qui relit toute son invite à chaque tour, un modèle qui tourne en partie sur CPU, des schémas d'outils qui occupent 40 % de chaque invite. Seuls les comptes et les durées sont gardés, sur cette machine pendant 30 jours : un redémarrage reprend là où il s'était arrêté. Le texte des invites est une option qui écrit dans un fichier local. Rien ne quitte votre machine, sauf si vous envoyez les tours à votre propre visualiseur de traces.

Par défaut, les deux ports ne répondent qu'à cette machine, car le journal En direct contient ce que vos outils ont envoyé. Lancez `npx llmxray --host 0.0.0.0` pour que d'autres machines de votre réseau les joignent, pour une page En direct sur un second écran ou une machine GPU partagée.

### Radiographie de l'invite : l'invite elle-même, à l'échelle

Chaque tour envoyé par votre outil, sous forme de barre. La couleur dit ce qu'était chaque partie de l'invite : invite système, schémas d'outils, tours précédents, nouveau message. La luminosité dit ce qui lui est arrivé : terne, elle était déjà dans la mémoire du modèle et n'a rien coûté ; vive, elle a dû être relue ; hachurée, le démon l'a coupée et ne l'a jamais vue. Empilez les tours d'une conversation et vous voyez le cache grandir, le tour où un horodatage dans l'invite système l'a vidé, et le tour où l'invite a dépassé le contexte : Ollama a jeté le début en silence, invite système comprise, et a répondu quand même. Cliquez sur une partie et la requête s'ouvre à cet endroit du texte.

![Radiographie de l'invite : chaque tour d'une vraie exécution d'agent à l'échelle, parties en cache ternes, parties recalculées vives](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/xray.png)

### Exécutions : le travail d'un outil, de bout en bout

Les appels d'un outil au modèle posés dans le temps, en cascade. Chaque appel est découpé selon ce que rapporte Ollama : attente, chargement du modèle, lecture de l'invite, écriture de la réponse. Entre deux appels, le temps propre de l'outil, nommé d'après les outils demandés par le modèle. Les étapes commencent là où l'outil a entamé une nouvelle conversation : un agent qui jette son cache à chaque étape se voit d'un coup d'œil, tout comme un modèle qui n'était pas en mémoire au début. Cliquez sur une ligne pour voir ce que cet appel a envoyé et reçu, la réflexion du modèle et ses appels d'outils avec leurs arguments, ou ce qu'un outil a reçu et renvoyé. Chaque ligne a son propre lien. Activez *Conserver le texte des invites* sur la page En direct pour voir le texte ; les temps n'ont besoin de rien.

![Exécutions : une exécution d'agent de 36 appels en cascade, avec l'entrée et le résultat d'un outil](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/runs.png)

### Machine partagée : pourquoi Ollama est lent en ce moment, et quel outil en est la cause

Une ligne par outil, triée selon ce qu'il a coûté aux autres, en secondes : celui qui envoie `keep_alive: 0` et décharge le modèle après chaque exécution, celui qui demande un contexte de 128K pour des invites de 4K et ramène le démon à une requête à la fois, celui qui a attendu 22 secondes derrière eux. Chacun avec le réglage à changer. Un outil qui n'a rien coûté est listé aussi, pour voir à quoi ressemble le bon comportement.

![Machine partagée : ce qu'un outil a demandé au démon et ce que cela a coûté aux autres](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/shared-box.png)

### Carte du GPU : ce qui est en mémoire vidéo, et ce qui tiendrait encore

Une barre de la largeur de votre carte : chaque modèle chargé en bloc, séparé entre ses poids et ce que son contexte coûte en plus, puis l'espace libre. En dessous, chaque modèle téléchargé avec l'un de trois verdicts : tient maintenant, tient seulement si ce qui est chargé est d'abord déchargé, plus grand que la carte.

![Carte du GPU : un modèle chargé à sa vraie taille, avec ce qui tiendrait encore](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/gpu-map.png)

### Appels d'outils : ce modèle peut-il piloter un agent ?

Treize formes de requêtes que les agents envoient toute la journée, notées sur ce que le démon a renvoyé : le bon outil, les bons arguments, le bon nombre d'appels, aucun appel quand il n'en faut pas. Chaque case est une phrase : « l'argument path manque », « a écrit l'appel dans le texte de la réponse », « a appelé search_web alors qu'aucun outil n'était nécessaire ». Cliquez dessus pour voir ce que le modèle a renvoyé.

![Appels d'outils : treize formes de requêtes d'agent notées sur gemma4](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tool-calls.png)

### Labo de cache

Un modèle local ne réutilise son cache d'invite que tant que l'invite correspond dès le tout premier token. Un seul horodatage en haut sacrifie tout ce qui suit. Le labo trouve les valeurs qui changent entre les tours, montre où la réutilisation meurt, puis **mesure** sur votre propre démon ce que rapporte leur déplacement à la fin.

![Labo de cache : diagnostic et résultat mesuré](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

Mesuré sur une vraie invite de 324 tokens : 4 tokens réutilisés et 64,6 ms de préremplissage avec l'horodatage devant, 290 réutilisés et 18,6 ms avec l'horodatage derrière. **3,5x plus rapide, mêmes mots.**

### Observatoire des protocoles

La même invite à travers les trois protocoles de service d'Ollama, en parallèle : natif `/api/chat`, compatible OpenAI `/v1/chat/completions`, et compatible Anthropic `/v1/messages`. Streaming côte à côte, métriques par protocole, et un diff d'enveloppe qui montre comment chacun encadre les raisons d'arrêt, les comptes de tokens et les erreurs.

![Observatoire des protocoles : trois protocoles côte à côte](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

---

## Garder, et envoyer plus loin

L'enregistrement de chaque tour (tokens, cache, durées, client, modèle, jamais le texte) reste sur votre machine pendant 30 jours : un redémarrage reprend là où il s'était arrêté. En direct, les Exécutions, la Radiographie de l'invite et les outils MCP continuent comme si de rien n'était.

Si votre équipe lit déjà ses traces, envoyez-y les tours : chaque appel au modèle devient un span OpenTelemetry avec les attributs GenAI que les visualiseurs lisent déjà, chaque exécution une trace, et le temps des outils entre deux appels un span à part, la même cascade qu'Exécutions. Donnez une adresse sur la page En direct, ou `OTEL_EXPORTER_OTLP_ENDPOINT`.

| Visualiseur | Adresse |
|---|---|
| Jaeger (`docker run -p 16686:16686 -p 4318:4318 jaegertracing/jaeger`) | `http://localhost:4318` |
| Arize Phoenix (`docker run -p 6006:6006 arizephoenix/phoenix`) | `http://localhost:6006` |
| Langfuse | `https://cloud.langfuse.com/api/public/otel`, avec un en-tête Basic fait de vos clés |
| Grafana Tempo, un OpenTelemetry Collector | son adresse OTLP HTTP, en général le port 4318 |

Le texte des invites ne part que si vous activez à la fois *Conserver le texte des invites* et *Inclure le texte des invites dans chaque span*.

---

## Pour les agents

Si vous êtes un agent qui tourne sur un modèle local, LLMxRay peut vous dire ce qui n'a pas marché dans vos propres appels. Deux étapes.

1. Envoyez vos appels Ollama au port **11435** plutôt qu'au 11434. Il se comporte exactement comme Ollama et transmet tout ; LLMxRay ne fait qu'enregistrer ce qui passe.
2. Ajoutez le serveur MCP de LLMxRay à vos outils :

```json
{ "mcpServers": { "llmxray": { "command": "npx", "args": ["-y", "-p", "llmxray", "llmxray-mcp"] } } }
```

Sept outils, tous en lecture seule, rien ne quitte la machine :

| Outil | Répond à |
|---|---|

| `diagnose_my_turns` | Ce qui ressort de vos derniers tours, en phrases avec la correction : une invite refusée parce qu'elle dépasse le contexte chargé, le cache perdu à chaque tour ou à un tour, un modèle en partie sur le processeur, des schémas d'outils qui envahissent l'invite. |
| `read_my_last_turn` | Votre dernier tour en chiffres : tokens de l'invite et part en cache, temps et vitesse de préremplissage, tokens générés et vitesse, pourquoi la génération s'est arrêtée, de quoi l'invite était faite, si le modèle tenait en mémoire vidéo. |
| `list_local_models` | Quels modèles sont téléchargés, leur taille et leur quantification, lesquels sont chargés et avec quel contexte, et si chacun tient en mémoire vidéo. |
| `list_my_turns` | L'historique : une ligne par tour avec les tokens, la part en cache, le préremplissage, la vitesse de génération, la raison de l'arrêt et les signalements. |
| `compare_my_turns` | Un changement a-t-il aidé : médianes de la part en cache, du préremplissage, de la vitesse et de la taille de l'invite avant et après un moment, avec un verdict. |
| `estimate_my_prompt` | Avant d'envoyer : une invite de N tokens tient-elle dans le contexte chargé, quelle marge reste-t-il, le modèle est-il en mémoire vidéo, quelle part le cache réutiliserait. |
| `read_llmxray_status` | Où tourne LLMxRay, le port d'observation, l'Ollama vers lequel il transmet, combien de tours il garde. |

LLMxRay lui-même doit tourner (`npx llmxray`). Le serveur MCP le lit en localhost.

La même procédure, en [Agent Skill](https://agentskills.io) que votre agent peut charger : `npx skills add LogneBudo/llmxray` (skills.sh) ou `clawhub install llmxray-diagnose-ollama-calls` (ClawHub). Source : [skills/diagnose-ollama-calls/SKILL.md](skills/diagnose-ollama-calls/SKILL.md).

Donnez-vous un nom pour que vos tours soient les vôtres : envoyez l'en-tête `X-LLMxRay-Client: mon-agent`, ou utilisez `http://localhost:11435/?client=mon-agent` comme adresse de base, et passez `mon-agent` comme `client` aux outils.

---

## Aussi dans la boîte

Vous faites tourner un modèle local. Vous discutez avec lui. LLMxRay répond aux questions qui viennent ensuite : chaque token a mis combien de temps, qu'a coûté l'invite, le cache a-t-il servi, quel réglage était vraiment le meilleur, et qu'envoient vos *autres* outils au même modèle.

Chaque page ci-dessous est l'une de ces réponses.

### Le chat, token par token

Chaque token est dessiné à son arrivée, coloré selon la probabilité que le modèle lui donne, d'après les logprobs d'Ollama. Vous voyez où le modèle a hésité et où il était sûr. Markdown, conversations multi-tours, pièces jointes et images, commandes slash, et un budget de réflexion pour les modèles à raisonnement (désactivé, au choix du modèle, ou low / medium / high / max).


Chaque réponse est aussi vérifiée à l'arrivée. Un badge n'apparaît que si quelque chose cloche : répétition, refus, charabia, réponse vide, ou réponse coupée à la limite de tokens.

<details><summary>Capture d'écran</summary>

![Chat : une réponse en streaming, chaque token coloré selon sa probabilité](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

</details>

### Session en détail

Ouvrez n'importe quel tour pour le voir comme une chronologie : temps jusqu'au premier token, écarts entre tokens, le bloc de raisonnement s'il y en a un, les appels d'outils, et l'invite exacte qui a été envoyée.

<details><summary>Capture d'écran</summary>

![Détails de session : chronologie du flux et métriques](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

</details>

### Comparer

La même invite contre jusqu'à quatre emplacements, chacun avec son modèle, sa température et son invite système, en streaming côte à côte. Préréglages en un clic : balayage de température, paire déterministe, comparaison de langues. Un diff mot à mot montre exactement ce qui change entre deux réponses.

<details><summary>Capture d'écran</summary>

![Comparer : balayage de température sur un modèle](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

</details>

### Benchmark chirurgical

Notez les modèles sur des jeux de questions sélectionnés (MMLU-Pro, ARC-Challenge, HellaSwag, GSM8K, TruthfulQA) à partir des **vrais logprobs des tokens**, pas de l'apparence de la réponse. Confiance contre exactitude par catégorie, pour voir où un modèle se trompe avec assurance. Importez vos propres jeux en JSON.

<details><summary>Capture d'écran</summary>

![Benchmark : confiance contre exactitude](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

</details>

### Labo de décision

Les modèles de décision (nimble, tev1, clef) répondent aux questions typées par des probabilités plutôt que par du texte. Donnez au labo une situation et demandez un choix parmi des candidats, une probabilité oui/non, ou un score sur une échelle. Chaque réponse revient sous forme de la distribution propre du modèle, dessinée en barres.

<details><summary>Capture d'écran</summary>

![Labo de décision : les barres de probabilité derrière chaque réponse](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

</details>

### Base de connaissances et embeddings

Déposez des fichiers PDF, DOCX, Markdown ou CSV. Ils sont découpés, vectorisés et interrogeables, pour voir ce que la recherche renvoie vraiment avant qu'un modèle ne le lise. La page Embeddings compare deux textes par similarité cosinus, visualise les vecteurs, et montre ce que coûte la troncature Matryoshka.


Tout reste dans l'IndexedDB de votre navigateur.

<details><summary>Capture d'écran</summary>

<table>
<tr>
<td width="50%">

![Base de connaissances : résultats de recherche avec scores](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/knowledge-base.png)

</td>
<td width="50%">

![Embeddings : similarité cosinus entre deux textes](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/embeddings.png)

</td>
</tr>
</table>

</details>

### Complétion de code

Fill-in-the-middle pour Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder et StarCoder : un préfixe, un suffixe, et le modèle comble le vide. L'aperçu assemblé montre le résultat tel que votre éditeur l'afficherait.

<details><summary>Capture d'écran</summary>

![Complétion de code : préfixe, suffixe et aperçu assemblé](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

</details>

### Atelier d'outils

Un canevas de nœuds pour construire des définitions d'outils, avec le TypeScript synchronisé dans les deux sens : modifiez les nœuds ou modifiez le code. Sondez une API, générez le schéma, et testez l'outil par un appel réel.

<details><summary>Capture d'écran</summary>

![Atelier d'outils : canevas de nœuds avec le panneau de code ouvert](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

</details>

### Analytique et coûts

Percentiles de latence (P50 / P95 / P99) pour les requêtes et les premiers tokens, qualité au fil des tours, erreurs par modèle, carte de chaleur d'utilisation, et température contre tokens par seconde. La page des coûts valorise votre usage local au tarif du cloud, pour voir ce que tourner en local vous fait économiser.

<details><summary>Capture d'écran</summary>

<table>
<tr>
<td width="50%">

![Analytique : percentiles de latence et qualité](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/analytics.png)

</td>
<td width="50%">

![Coûts : équivalent cloud par modèle](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/costs.png)

</td>
</tr>
</table>

</details>

### Mon système et modèles

Matériel, exécution et inférence sur une seule page : CPU, mémoire, GPU, quels modèles sont chargés et où. L'onglet Modèles liste chaque modèle installé avec ses paramètres, son gabarit et son moteur, et en télécharge de nouveaux depuis le catalogue.

<details><summary>Capture d'écran</summary>

<table>
<tr>
<td width="50%">

![Mon système : matériel et état d'Ollama](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/system.png)

</td>
<td width="50%">

![Modèles : modèles installés et catalogue](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/models.png)

</td>
</tr>
</table>

</details>

### Et encore

- **Pipeline d'entraînement.** Sélectionnez des paires dans vos conversations, étiquetez-les, relisez-les, exportez en JSONL pour le fine-tuning.
- **Historique local.** Chaque chat, comparaison et benchmark est archivé dans IndexedDB avec filtres, tendances, exports et règles de rétention.
- **Kit pédagogique.** Neuf modules de cours sur le [site de documentation](https://lognebudo.github.io/llmxray/docs/fr/community/educators/), chacun bâti autour d'une page de LLMxRay.
- **Cinq langues.** Anglais, français, serbe (latin et cyrillique), chinois et arabe, avec mise en page RTL. Des squelettes sont prêts pour l'hébreu et le japonais.

---

## À qui ça s'adresse

| Vous êtes... | LLMxRay vous aide à... |
|---|---|
| **Développeur** | Déboguer les invites, profiler la latence, comparer les modèles, inspecter les appels d'outils, voir ce que votre éditeur envoie |
| **Chercheur** | Mener des expériences contrôlées avec les mêmes réglages sur plusieurs modèles et températures |
| **Étudiant / Enseignant** | Observer le comportement des modèles plutôt que de le lire, avec le [kit pédagogique](https://lognebudo.github.io/llmxray/docs/fr/community/educators/) en neuf modules |
| **Responsable d'équipe IA** | Donner à chaque développeur la même installation locale, et collecter les résultats de benchmark et les paires d'entraînement qu'ils exportent |

---

## Installation

### npx (recommandé)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
npx llmxray --observe-port 11436     # le port Live, 11435 par défaut
```

### Docker
```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
docker run -p 5174:5174 -p 11435:11435 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### Depuis les sources
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## Compatibilité Ollama

Testé avec **Ollama 0.40.x** (vérifié sur 0.40.6, octobre 2026). Fonctionne à partir de 0.20 ; les versions plus anciennes discutent mais n'ont ni `think` ni `format` par schéma JSON. **Recommandé : 0.33.3 ou plus récent**, qui rapporte la réutilisation du cache d'invite, si bien que la vitesse de préremplissage est mesurée sur les tokens réellement évalués.

| Point d'accès | Utilisé pour |
|---|---|
| `/api/chat` | Chat en streaming (NDJSON, avec `tools`, niveaux d'effort `think`, schéma `format`) |
| `/api/generate` | Génération et Fill-in-the-Middle via `suffix` |
| `/api/tags`, `/api/show` | Liste des modèles, capacités, longueur de contexte, paramètres, gabarit |
| `/api/embed` | Embeddings vectoriels pour la base de connaissances, avec troncature `dimensions` optionnelle |
| `/api/pull`, `/api/delete`, `/api/ps`, `/api/version` | Gestion des modèles et état |
| `/v1/chat/completions` | Chemin compatible OpenAI, utilisé par le benchmark chirurgical pour les vrais logprobs |
| `/v1/messages` | Chemin compatible Anthropic, utilisé par l'observatoire des protocoles |
| `/v1/systemone` | Modèles de décision, utilisés par le labo de décision |

---

## Sous le capot

Vue 3.5, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, un store Pinia par domaine, Chart.js et D3 pour les graphiques, Vue Flow pour le canevas d'outils, CodeMirror 6 pour le code. L'application garde ses propres données (chats, comparaisons, benchmarks, base de connaissances) dans l'IndexedDB du navigateur ; les enregistrements du journal En direct vivent dans `~/.llmxray`, sur la machine qui fait tourner LLMxRay. Le backend est Ollama, en local.

Le streaming lit le NDJSON d'Ollama via `fetch()` et un `ReadableStream`, et les tokens mettent l'interface à jour à travers Pinia. Le chat et la comparaison colorent les tokens selon les vrais logprobs renvoyés par Ollama ; sans eux, un token reste sans couleur, et la vue des tokens nomme le temps « rythme », jamais confiance. Les benchmarks utilisent aussi les vrais logprobs. La détection du matériel est un petit plugin Vite qui interroge directement l'OS. Le port Live est un proxy transparent : il transmet chaque requête à Ollama sans la modifier, ne traduit rien (Ollama sert lui-même les routes compatibles OpenAI et Anthropic), et enregistre comptes et durées, gardés 30 jours.

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (port 5173) |
| `npm run build` | Vérification des types et build de production |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |

---

## Contribuer

Les contributions sont bienvenues. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour l'installation et les règles. Les traductions communautaires sont particulièrement bienvenues : des squelettes sont prêts pour l'hébreu et le japonais.

---

## Licence

[Apache License 2.0](LICENSE)

---

## Marque

**LLMxRay** est une marque d'Ivan Stankovic ([LogneBudo](https://github.com/LogneBudo)). Voir [TRADEMARK.md](TRADEMARK.md).

---

<p align="center">
  <strong>Si LLMxRay vous aide à mieux comprendre votre IA, pensez à lui donner une étoile.</strong><br/>
  Cela aide les autres à découvrir le projet.
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
