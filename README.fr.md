<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Voyez ce que votre IA locale fait réellement.</strong></p>
<p align="center">
  Une commande, un onglet de navigateur. Streaming token par token, diagnostic du cache, comparaison de modèles, benchmarks et suivi des coûts<br/>
  pour les modèles qui tournent sur votre machine via Ollama. Pas de cloud. Pas de clé API. Pas de coût.
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
  <a href="#ce-que-llmxray-vous-montre">Ce qu'il vous montre</a> &bull;
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

Il vous faut [Ollama](https://ollama.com/download) en marche avec au moins un modèle téléchargé (`ollama pull llama3.2`). Ensuite :

```bash
npx llmxray
```

Ou avec Docker :

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

Ouvrez **http://localhost:5174**. Choisissez un modèle, envoyez un message, et regardez ce qui se passe. C'est tout.

---

## Ce que LLMxRay vous montre

Vous faites tourner un modèle local. Vous discutez avec lui. LLMxRay répond aux questions qui viennent ensuite : chaque token a mis combien de temps, qu'a coûté l'invite, le cache a-t-il servi, quel réglage était vraiment le meilleur, et qu'envoient vos *autres* outils au même modèle.

Chaque page ci-dessous est l'une de ces réponses.

### Le chat, token par token

Chaque token est dessiné à son arrivée, coloré selon la confiance. Vous voyez où le modèle a hésité et où il était sûr. Markdown, conversations multi-tours, pièces jointes et images, commandes slash, et un budget de réflexion pour les modèles à raisonnement (désactivé, au choix du modèle, ou low / medium / high / max).

![Chat : une réponse en streaming avec coloration par confiance](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

Chaque réponse est aussi vérifiée à l'arrivée. Un badge n'apparaît que si quelque chose cloche : répétition, refus, charabia, réponse vide, ou réponse coupée à la limite de tokens.

### Session en détail

Ouvrez n'importe quel tour pour le voir comme une chronologie : temps jusqu'au premier token, écarts entre tokens, le bloc de raisonnement s'il y en a un, les appels d'outils, et l'invite exacte qui a été envoyée.

![Détails de session : chronologie du flux et métriques](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

### Live : ce que vos autres outils envoient

LLMxRay ouvre un second port, **11435**, qui se comporte exactement comme Ollama et lui transmet tout. Pointez VS Code Copilot, Open WebUI, Continue, n8n ou votre propre script vers `http://localhost:11435` et chaque tour qu'ils envoient apparaît ici : client, modèle, taille de l'invite, part venue du cache, vitesse de préremplissage et de génération, appels d'outils.

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ page Live : chaque tour,
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  cache réutilisé, préremplissage,
vos scripts ─────┘        (LLMxRay)                   └─ là où le cache a cassé
```

![Live : des tours venus de deux clients, avec les constats](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

Sélectionnez un tour pour voir de quoi l'invite est faite et le point exact où elle a cessé de correspondre à la précédente, c'est-à-dire là où le cache a cassé. Les constats sont des phrases simples, chacune liée au tour qui la prouve : un client qui relit toute son invite à chaque tour, un modèle qui tourne en partie sur CPU, des schémas d'outils qui occupent 40 % de chaque invite. Seuls les comptes et les durées sont conservés, en mémoire. Le texte des invites est une option qui écrit dans un fichier local. Rien ne quitte votre machine.

Les deux ports écoutent sur votre réseau, pas seulement sur localhost : la page Live peut tourner en plein écran sur un second écran ou une autre machine pendant que les agents travaillent.

### Labo de cache

Un modèle local ne réutilise son cache d'invite que tant que l'invite correspond dès le tout premier token. Un seul horodatage en haut sacrifie tout ce qui suit. Le labo trouve les valeurs qui changent entre les tours, montre où la réutilisation meurt, puis **mesure** sur votre propre démon ce que rapporte leur déplacement à la fin.

![Labo de cache : diagnostic et résultat mesuré](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

Mesuré sur une vraie invite de 324 tokens : 4 tokens réutilisés et 64,6 ms de préremplissage avec l'horodatage devant, 290 réutilisés et 18,6 ms avec l'horodatage derrière. **3,5x plus rapide, mêmes mots.**

### Comparer

La même invite contre jusqu'à quatre emplacements, chacun avec son modèle, sa température et son invite système, en streaming côte à côte. Préréglages en un clic : balayage de température, paire déterministe, comparaison de langues. Un diff mot à mot montre exactement ce qui change entre deux réponses.

![Comparer : balayage de température sur un modèle](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

### Benchmark chirurgical

Notez les modèles sur des jeux de questions sélectionnés (MMLU-Pro, ARC-Challenge, HellaSwag, GSM8K, TruthfulQA) à partir des **vrais logprobs des tokens**, pas de l'apparence de la réponse. Confiance contre exactitude par catégorie, pour voir où un modèle se trompe avec assurance. Importez vos propres jeux en JSON.

![Benchmark : confiance contre exactitude](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

### Labo de décision

Les modèles de décision (nimble, tev1, clef) répondent aux questions typées par des probabilités plutôt que par du texte. Donnez au labo une situation et demandez un choix parmi des candidats, une probabilité oui/non, ou un score sur une échelle. Chaque réponse revient sous forme de la distribution propre du modèle, dessinée en barres.

![Labo de décision : les barres de probabilité derrière chaque réponse](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

### Observatoire des protocoles

La même invite à travers les trois protocoles de service d'Ollama, en parallèle : natif `/api/chat`, compatible OpenAI `/v1/chat/completions`, et compatible Anthropic `/v1/messages`. Streaming côte à côte, métriques par protocole, et un diff d'enveloppe qui montre comment chacun encadre les raisons d'arrêt, les comptes de tokens et les erreurs.

![Observatoire des protocoles : trois protocoles côte à côte](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

### Base de connaissances et embeddings

Déposez des fichiers PDF, DOCX, Markdown ou CSV. Ils sont découpés, vectorisés et interrogeables, pour voir ce que la recherche renvoie vraiment avant qu'un modèle ne le lise. La page Embeddings compare deux textes par similarité cosinus, visualise les vecteurs, et montre ce que coûte la troncature Matryoshka.

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

Tout reste dans l'IndexedDB de votre navigateur.

### Complétion de code

Fill-in-the-middle pour Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder et StarCoder : un préfixe, un suffixe, et le modèle comble le vide. L'aperçu assemblé montre le résultat tel que votre éditeur l'afficherait.

![Complétion de code : préfixe, suffixe et aperçu assemblé](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

### Atelier d'outils

Un canevas de nœuds pour construire des définitions d'outils, avec le TypeScript synchronisé dans les deux sens : modifiez les nœuds ou modifiez le code. Sondez une API, générez le schéma, et testez l'outil par un appel réel.

![Atelier d'outils : canevas de nœuds avec le panneau de code ouvert](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

### Analytique et coûts

Percentiles de latence (P50 / P95 / P99) pour les requêtes et les premiers tokens, qualité au fil des tours, erreurs par modèle, carte de chaleur d'utilisation, et température contre tokens par seconde. La page des coûts valorise votre usage local au tarif du cloud, pour voir ce que tourner en local vous fait économiser.

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

### Mon système et modèles

Matériel, exécution et inférence sur une seule page : CPU, mémoire, GPU, quels modèles sont chargés et où. L'onglet Modèles liste chaque modèle installé avec ses paramètres, son gabarit et son moteur, et en télécharge de nouveaux depuis le catalogue.

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

### Aussi dans la boîte

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

Testé avec **Ollama 0.40.x** (vérifié sur 0.40.4, octobre 2026). Fonctionne à partir de 0.20 ; les versions plus anciennes discutent mais n'ont ni `think` ni `format` par schéma JSON. **Recommandé : 0.33.3 ou plus récent**, qui rapporte la réutilisation du cache d'invite, si bien que la vitesse de préremplissage est mesurée sur les tokens réellement évalués.

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

Vue 3.5, TypeScript 5.9 (strict), Vite 7, Tailwind CSS 4, un store Pinia par domaine, Chart.js et D3 pour les graphiques, Vue Flow pour le canevas d'outils, CodeMirror 6 pour le code. Le stockage est l'IndexedDB du navigateur. Le backend est Ollama, en local.

Le streaming lit le NDJSON d'Ollama via `fetch()` et un `ReadableStream`, et les tokens mettent l'interface à jour à travers Pinia. La confiance du chat est approchée à partir de la latence entre tokens et étiquetée comme telle ; les benchmarks utilisent les vrais logprobs. La détection du matériel est un petit plugin Vite qui interroge directement l'OS. Le port Live est un proxy transparent qui garde comptes et durées en mémoire.

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (port 5173) |
| `npm run build` | Vérification des types et build de production |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |

---

## Contribuer

Les contributions sont bienvenues. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour l'installation et les règles. Les traductions communautaires sont particulièrement bienvenues : des squelettes sont prêts pour l'hébreu et le japonais.

## Licence

[Apache License 2.0](LICENSE)

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
