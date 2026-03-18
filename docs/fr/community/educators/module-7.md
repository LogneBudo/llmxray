# Module 7 : Comment comparer les modèles ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**Le Scientifique** — Concevez des expériences, mesurez les résultats, tirez des conclusions

**Durée :** 90 min | **Difficulté :** Avancé | **Prérequis :** [Module 3](./module-3), [Module 5](./module-5)

</div>

## Le Moment Eureka

> Aucun modèle n’est universellement le meilleur. Un modèle qui excelle en raisonnement scientifique peut échouer en véracité. Un modèle rapide peut battre un modèle lent sur des tâches simples. Les benchmarks ne vous disent pas quel modèle est « meilleur » — ils vous disent quel modèle est meilleur *pour quoi*.

Ce module transforme les étudiants de consommateurs passifs de classements en expérimentateurs actifs qui conçoivent leurs propres évaluations. En exécutant des benchmarks contrôlés et des comparaisons côte à côte dans LLMxRay, les étudiants découvrent que le choix d’un modèle est toujours un compromis — et que le « meilleur » modèle dépend entièrement de la tâche, des contraintes et de la définition du succès.

La méthode scientifique s’applique directement : formulez une hypothèse (« le modèle plus grand sera plus précis »), concevez une expérience (exécutez le même benchmark sur les deux), collectez les données (précision, confiance, latence) et tirez des conclusions. Parfois l’hypothèse se vérifie. Parfois un modèle à 1 milliard de paramètres surpasse un modèle à 8 milliards sur une catégorie spécifique. Cette surprise est la leçon.

---

## Contexte Conceptuel

### Pourquoi comparer les modèles ?

Différents modèles ont différentes forces. Cela semble évident, mais la culture des classements encourage un score unique qui masque la réalité : le choix d’un modèle est multidimensionnel.

La taille n’est pas tout. Un modèle 7B bien entraîné peut battre un modèle 13B mal entraîné sur des tâches spécifiques. Un modèle affiné pour le code peut dominer HumanEval mais trébucher sur le raisonnement de bon sens. Un modèle optimisé pour le suivi d’instructions peut être moins bon en écriture créative qu’un modèle de base avec le même nombre de paramètres.

Les dimensions qui comptent dépendent de votre cas d’usage :
- **Vitesse** — Un chatbot nécessite une latence inférieure à la seconde. Un pipeline d’analyse par lots peut attendre.
- **Précision** — Un assistant médical nécessite une précision factuelle quasi parfaite. Un outil de brainstorming peut tolérer des écarts créatifs.
- **Longueur du contexte** — Résumer un document de 50 pages nécessite une grande fenêtre de contexte. Un bot de questions-réponses peut n’avoir besoin que de 2K tokens.
- **Support d’outils** — Un workflow agentique nécessite un tool calling fiable. Un tuteur conversationnel non.
- **Calibration** — Un modèle qui sait ce qu’il ne sait pas est plus sûr qu’un modèle qui a confiance à tort.

La comparaison ne vise pas à couronner un vainqueur. Il s’agit de comprendre l’espace des compromis pour faire un choix éclairé.

### Ce que les benchmarks mesurent réellement

Chaque benchmark teste une tranche étroite de capacité. Comprendre ce que chaque benchmark mesure — et ce qu’il ne mesure pas — est essentiel pour interpréter les résultats.

| Benchmark | Ce qu’il teste | Format | Exemple |
|---|---|---|---|
| **ARC** | Raisonnement scientifique (du primaire à l’université) | Choix multiple (4 options) | "Which property of a mineral can be determined just by looking at it?" |
| **MMLU-Pro** | Connaissances académiques larges dans plus de 50 domaines | Choix multiple (10 options) | Questions couvrant STEM, sciences humaines, sciences sociales, domaines professionnels |
| **HellaSwag** | Complétion par bon sens (intuition physique/sociale) | Choix multiple (4 options) | "A woman is cooking pasta. She drains the water and..." |
| **GSM8K** | Mathématiques de niveau primaire avec raisonnement en plusieurs étapes | Choix multiple (numérique) | "If a train travels 60 mph for 2.5 hours, then 40 mph for 1.5 hours..." |
| **TruthfulQA** | Résistance aux idées reçues erronées | Choix multiple (variable) | "Can you see the Great Wall of China from space?" |

![Radar des benchmarks](/educators/fr/benchmark-radar.svg)

Un score agrégé unique masque les variations par catégorie. Un modèle obtenant 65 % sur ARC pourrait obtenir 85 % sur les questions de physique mais seulement 40 % en biologie. Les 50+ domaines de MMLU-Pro signifient qu’un modèle peut exceller en droit et échouer en chimie — et la moyenne masque les deux. Examinez toujours les décompositions par catégorie.

::: warning Les benchmarks ne sont pas des bulletins scolaires
Un score de benchmark vous indique comment un modèle performe sur un jeu de test spécifique dans des conditions spécifiques. Il ne vous dit pas comment le modèle performera sur votre tâche, avec vos données, sous vos contraintes. Les benchmarks sont un point de départ pour la comparaison, pas un verdict final.
:::

### Le problème de la calibration de la confiance

Un modèle peut être précis à 90 % mais mal **calibré** — ce qui signifie que ses scores de confiance ne corrèlent pas avec sa précision réelle. C’est l’un des aspects les plus importants et les moins discutés de l’évaluation des modèles.

LLMxRay mesure la confiance à l’aide de **logprobs réels** obtenus via le streaming SSE à travers l’endpoint compatible OpenAI `/v1/chat/completions`. Ce n’est pas une simulation — ce sont les distributions de probabilité réelles que le modèle calcule sur son vocabulaire à chaque position de token.

**La calibration** signifie : quand un modèle dit qu’il est confiant à 80 %, a-t-il raison environ 80 % du temps ? Un modèle parfaitement calibré produirait une ligne diagonale sur un graphique confiance-versus-précision. En pratique, la plupart des modèles sont **surconfiants** — ils attribuent des probabilités élevées même quand ils se trompent.

![Calibration de la confiance](/educators/fr/confidence-calibration.svg)

Le **graphique de dispersion confiance vs précision** dans le BenchmarkResultsPanel de LLMxRay révèle la qualité de la calibration d’un coup d’œil :
- Points regroupés le long de la diagonale = bien calibré
- Points au-dessus de la diagonale = sous-confiant (conservateur mais sûr)
- Points en dessous de la diagonale = surconfiant (dangereux — le modèle semble sûr de lui mais se trompe)

**L’erreur de calibration** est l’écart moyen entre la confiance et la précision à travers les intervalles de confiance. Un modèle avec 85 % de précision et 92 % de confiance moyenne a une erreur de calibration de 7 points de pourcentage. Cet écart compte : il signifie que vous ne pouvez pas faire confiance à la certitude auto-déclarée du modèle.

### Modèles de réflexion vs modèles standard

Certains modèles — DeepSeek-R1, QwQ et d’autres de la famille « raisonnement » — utilisent un **raisonnement explicite par chaîne de pensée** avant de produire leur réponse finale. Ils enveloppent leur délibération interne dans des blocs `<think>`, travaillant le problème étape par étape avant de s’engager sur une réponse.

![Modèles de réflexion vs modèles standard](/educators/fr/thinking-vs-standard.svg)

Dans LLMxRay, cette distinction a des conséquences concrètes :
- **Budgets de tokens dynamiques** : Les modèles de réflexion reçoivent un budget de **2048 tokens** (pour accommoder la trace de raisonnement), tandis que les modèles standard reçoivent **64 tokens** (suffisant pour une réponse à choix multiple). Cela évite de pénaliser les modèles de réflexion pour leur processus de raisonnement verbeux.
- **Réflexion visible** : Pendant les exécutions de benchmarks, le BenchmarkLiveView affiche le contenu du bloc `<think>` en streaming temps réel. Vous pouvez observer le modèle raisonner sur chaque question — parfois correctement, parfois s’engageant sur une mauvaise piste avant de se corriger.
- **Compromis vitesse vs précision** : Les modèles de réflexion sont significativement plus lents (souvent 5 à 10 fois) car ils génèrent des centaines de tokens de raisonnement avant de répondre. Mais sur les benchmarks intensifs en raisonnement comme GSM8K et ARC, ils atteignent souvent une précision substantiellement plus élevée.

L’intuition clé est que la « réflexion » n’est pas gratuite. Un modèle de réflexion qui prend 15 secondes par question peut être impraticable pour un chatbot temps réel, même si sa précision est supérieure de 20 points. Le bon choix dépend de la capacité de votre application à supporter la latence.

::: warning Le budget de tokens affecte les résultats
Si vous exécutez un modèle de réflexion avec un budget de tokens de modèle standard (64 tokens), la trace de raisonnement sera tronquée et la précision chutera dramatiquement. LLMxRay détecte automatiquement les capacités du modèle et attribue le budget approprié, mais soyez conscient de cela lors de l’interprétation des résultats provenant d’autres outils.
:::

### Au-delà des benchmarks : comparaison en conditions réelles

Les benchmarks testent la performance en choix multiple dans des conditions contrôlées. Les tâches réelles sont ouvertes, ambiguës et subjectives. Un modèle qui excelle sur ARC pourrait produire une prose sans vie. Un modèle qui obtient de mauvais scores sur MMLU-Pro pourrait être un excellent partenaire d’écriture créative.

La page **Compare** de LLMxRay comble ce fossé. Elle vous permet d’envoyer le même prompt à plusieurs modèles — ou au même modèle avec des paramètres différents — et de voir les résultats côte à côte.

Fonctionnalités clés de comparaison :
- **ComparisonGrid** : Visualisez les sorties de jusqu’à quatre configurations de modèles simultanément, avec défilement synchronisé.
- **ComparisonDiffView** : Les diffs au niveau des mots mettent en évidence exactement ce qui a changé entre deux sorties. Un seul changement de température peut transformer une réponse de formelle à familière.
- **ComparisonMetricsBar** : Latence, nombre de tokens et débit pour chaque configuration, affichés sous forme de barres comparatives.
- **Preset Temperature Sweep** : Exécute automatiquement le même prompt aux températures 0.2, 0.7 et 1.2, isolant l’effet de l’aléatoire sur la qualité de la sortie.
- **Preset Deterministic Pair** : Exécute deux configurations avec le même seed, garantissant que toute différence est due à la variable que vous avez modifiée (modèle, prompt système, température) et non à l’échantillonnage aléatoire.

C’est là où la science rencontre l’art. Les benchmarks vous donnent des chiffres. Les comparaisons vous donnent l’intuition.

---

## Exercices Pratiques

### Exercice 1 : Le duel de benchmarks

**Ce qu’il faut faire :**

1. Ouvrez la page **Benchmark** dans LLMxRay
2. Dans le **BenchmarkConfigurator**, sélectionnez un petit modèle (par ex. `llama3.2:1b`) et un modèle plus grand (par ex. `llama3.1:8b`)
3. Sélectionnez la suite de benchmarks **ARC**
4. Exécutez le benchmark sur les deux modèles (vous pouvez les exécuter séquentiellement ou en parallèle si votre matériel le permet)
5. Pendant l’exécution de chaque benchmark, observez attentivement le **BenchmarkLiveView** :
   - Pourcentage de progression en temps réel
   - Indicateurs verts/rouges pour les réponses correctes/incorrectes
   - Barres de progression par catégorie se remplissant au fur et à mesure
   - Pour les modèles de réflexion, le contenu du bloc `<think>` en streaming direct
6. Une fois les deux exécutions terminées, comparez les résultats dans le **BenchmarkResultsPanel** :
   - **Précision globale** : Quel modèle a obtenu le meilleur score ? De combien ?
   - **Décomposition par catégorie** : Y a-t-il des catégories où le petit modèle égale ou dépasse le grand ?
   - **Confiance moyenne** : Quel modèle est le plus confiant globalement ? Une confiance plus élevée est-elle corrélée à une meilleure précision ?
   - **Latence** : À quel point le petit modèle est-il plus rapide ? Calculez le ratio précision-par-seconde.

**Ce que vous allez découvrir :**

Le modèle plus grand l’emportera probablement en précision globale — mais la marge pourrait être plus faible que vous ne le pensez. Sur certaines catégories (en particulier celles nécessitant de la reconnaissance de motifs plutôt qu’un raisonnement profond), le petit modèle peut tenir bon. Et le petit modèle sera presque certainement plus rapide, parfois de 5 à 10 fois. C’est le compromis fondamental : le gain de précision vaut-il le coût en latence pour votre application spécifique ?

---

### Exercice 2 : La carte thermique des catégories

**Ce qu’il faut faire :**

1. Exécutez **MMLU-Pro** sur un modèle de votre choix (ce benchmark comporte plus de 50 catégories, donc cela prend plus de temps — soyez patient)
2. Exécutez **ARC** sur le même modèle si ce n’est pas déjà fait
3. Ouvrez le **BenchmarkComparisonLedger**
4. Examinez le **graphique radar** : chaque axe représente un benchmark ou une catégorie, avec les scores affichés en rangs percentiles. Remarquez la forme — est-elle à peu près circulaire (équilibrée) ou en pointes (spécialiste) ?
5. Examinez la **carte thermique** (modèles x catégories) : chaque cellule est colorée du rouge (faible précision) au vert (haute précision)
6. Répondez à ces questions :
   - Dans quelles 3 catégories le modèle performe-t-il le mieux ?
   - Dans quelles 3 catégories performe-t-il le moins bien ?
   - Y a-t-il un motif ? Les catégories STEM se regroupent-elles ? Les sciences humaines ?
   - Comparez les catégories scientifiques ARC avec les catégories scientifiques MMLU-Pro. Sont-elles corrélées ?

**Ce que vous allez découvrir :**

Les modèles ne sont pas uniformément capables. La carte thermique rend cela viscéralement clair — un seul modèle peut varier de 90 % dans une catégorie à 30 % dans une autre. Les catégories nécessitant du rappel factuel (dates historiques, géographie) obtiennent souvent des scores différents de celles nécessitant du raisonnement (physique, logique). La forme irrégulière du graphique radar est la preuve visuelle qu’aucun chiffre unique ne capture les capacités d’un modèle.

::: warning MMLU-Pro est volumineux
MMLU-Pro contient des milliers de questions réparties sur plus de 50 domaines. Une exécution complète peut prendre de 30 à 60 minutes selon votre matériel et la vitesse du modèle. Pour une utilisation en classe, envisagez d’exécuter un sous-ensemble de catégories ou d’utiliser l’option d’exécution rapide si disponible.
:::

---

### Exercice 3 : Analyse de la calibration de la confiance

**Ce qu’il faut faire :**

1. À partir de vos résultats de benchmarks (Exercice 1 ou 2), ouvrez le **BenchmarkResultsPanel** pour chaque modèle
2. Localisez le **graphique de dispersion confiance vs précision**
3. Pour chaque modèle, analysez :
   - Les réponses à haute confiance (>80 % de logprob) sont-elles plus souvent correctes que les réponses à faible confiance (<50 %) ?
   - Où se situent la plupart des points par rapport à la ligne diagonale ?
   - Le modèle est-il surconfiant (points sous la diagonale) ou sous-confiant (points au-dessus) ?
4. Calculez l’**erreur de calibration** pour chaque modèle :
   - Regroupez les réponses par intervalles de confiance (par ex. 0-20 %, 20-40 %, 40-60 %, 60-80 %, 80-100 %)
   - Pour chaque intervalle, calculez : |confiance moyenne - précision réelle|
   - Moyennez sur tous les intervalles = Expected Calibration Error (ECE)
5. Comparez : Quel modèle est le mieux calibré ? Le modèle le plus précis est-il aussi le mieux calibré ?

**Ce que vous allez découvrir :**

Une meilleure précision n’implique pas une meilleure calibration. Un modèle peut être précis à 75 % avec une excellente calibration (il « sait ce qu’il ne sait pas ») tandis qu’un autre modèle est précis à 80 % mais mal calibré (il est surconfiant sur les questions qu’il rate). Pour les applications critiques en termes de sécurité, la calibration compte autant que la précision — parfois davantage. Un modèle bien calibré permet de définir des seuils de confiance significatifs pour la prise de décision automatisée.

---

### Exercice 4 : Le laboratoire de comparaison

**Ce qu’il faut faire :**

1. Ouvrez la page **Compare** dans LLMxRay
2. Sélectionnez un seul modèle et utilisez le preset **Temperature Sweep**, qui configure trois exécutions aux températures 0.2, 0.7 et 1.2
3. Entrez un prompt créatif : *"Write a haiku about artificial intelligence"*
4. Lancez la comparaison et examinez le **ComparisonGrid** :
   - À 0.2 : Comment se lit la sortie ? Est-elle prévisible ? Générique ?
   - À 0.7 : Y a-t-il plus de variété ? Cela a-t-il encore du sens ?
   - À 1.2 : Est-ce créatif ou chaotique ? La structure du haiku (5-7-5) est-elle encore respectée ?
5. Passez au **ComparisonDiffView** pour voir les différences exactes au niveau des mots entre les paires de sorties. Combien de mots changent entre 0.2 et 0.7 ? Entre 0.7 et 1.2 ?
6. Vérifiez le **ComparisonMetricsBar** : La température affecte-t-elle la vitesse de génération ou le nombre de tokens ?
7. Essayez maintenant le preset **Deterministic Pair** avec le même seed mais deux températures différentes (par ex. 0.3 et 0.9). Relancez le prompt du haiku. Puisque le seed est fixé, toute différence est purement due à la température — pas à l’échantillonnage aléatoire.
8. Enfin, essayez un prompt factuel : *"What is the capital of Australia?"* La température affecte-t-elle la précision factuelle, ou seulement la variation créative ?

**Ce que vous allez découvrir :**

La température est un outil de précision, pas un curseur de qualité. Une température basse produit une sortie sûre et prévisible — bonne pour les tâches factuelles, fade pour les tâches créatives. Une température élevée introduit de la diversité et de la surprise, mais aussi de l’incohérence et des erreurs structurelles. La comparaison Deterministic Pair prouve que la température seule — et non le hasard — provoque les différences. Et les questions factuelles sont largement invariantes à la température car la bonne réponse possède une masse de probabilité écrasante à toute température raisonnable. C’est le pont entre la théorie du Module 2 et les preuves expérimentales réelles.

---

## Points Clés

1. **Aucun modèle n’est universellement le meilleur.** Chaque modèle a un profil de forces et de faiblesses que la décomposition par catégorie révèle. Les scores agrégés dissimulent plus qu’ils ne révèlent.
2. **Les benchmarks mesurent des tranches étroites.** ARC teste le raisonnement scientifique. TruthfulQA teste la résistance aux idées reçues. MMLU-Pro teste l’étendue. Aucun benchmark unique ne capture « l’intelligence » — et exécuter plusieurs benchmarks est essentiel pour un portrait complet.
3. **La calibration est aussi importante que la précision.** Un modèle qui sait quand il est incertain est plus sûr et plus utile qu’un modèle toujours confiant. Les logprobs réels du streaming SSE vous donnent des données de calibration fiables.
4. **Les modèles de réflexion échangent la vitesse contre la précision.** Le raisonnement par chaîne de pensée dans les blocs `<think>` peut améliorer dramatiquement les performances sur les tâches de raisonnement, mais avec un coût en latence de 5 à 10 fois. Les budgets de tokens dynamiques garantissent une comparaison équitable.
5. **La comparaison contrôlée est la méthode scientifique appliquée à l’IA.** Les balayages de température, les paires déterministes et les diffs côte à côte vous permettent d’isoler des variables et de tirer des conclusions causales — pas seulement des corrélations issues des classements.

---

## Questions de Discussion

1. Si vous deviez choisir un modèle pour un **chatbot médical**, quels benchmarks seraient les plus importants ? Privilégieriez-vous la précision, la calibration ou la vitesse ? Quelles évaluations supplémentaires au-delà des benchmarks standards voudriez-vous exécuter ?
2. Pourquoi le score de benchmark d’un modèle pourrait-il **ne pas prédire son utilité en conditions réelles** ? Considérez les différences entre l’évaluation à choix multiple et la conversation ouverte. Quels facteurs les benchmarks manquent-ils ?
3. Comment les **modèles de réflexion modifient-ils le compromis vitesse/précision** ? Dans quelles applications le temps de raisonnement supplémentaire en vaut-il la peine, et dans quelles applications est-il inacceptable ? Pourrait-on utiliser un modèle de réflexion pour les questions difficiles et un modèle standard pour les questions faciles ?
4. Deux modèles obtiennent un score identique sur ARC (72 %) mais l’un est bien calibré et l’autre est surconfiant. **Lequel déploieriez-vous**, et pourquoi ? Votre réponse change-t-elle selon l’application ?
5. Les jeux de données de benchmark sont **statiques et publics**. Les développeurs de modèles peuvent (et le font) optimiser pour eux. Comment cela affecte-t-il la signification réelle des scores de benchmark ? À quoi ressemblerait un meilleur système d’évaluation ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Measuring Massive Multitask Language Understanding | Hendrycks et al. | 2021 | [arXiv:2009.03300](https://arxiv.org/abs/2009.03300) |
| Think you have Solved Question Answering? Try ARC | Clark et al. | 2018 | [arXiv:1803.05457](https://arxiv.org/abs/1803.05457) |
| HellaSwag: Can a Machine Really Finish Your Sentence? | Zellers et al. | 2019 | [arXiv:1905.07830](https://arxiv.org/abs/1905.07830) |
| Training Verifiers to Solve Math Word Problems (GSM8K) | Cobbe et al. | 2021 | [arXiv:2110.14168](https://arxiv.org/abs/2110.14168) |
| Chatbot Arena: An Open Platform for Evaluating LLMs | Zheng et al. | 2023 | [arXiv:2403.04132](https://arxiv.org/abs/2403.04132) |
| On Calibration of Modern Neural Networks | Guo, Pleiss, Sun, Weinberger | 2017 | [arXiv:1706.04599](https://arxiv.org/abs/1706.04599) |

### Tutoriels et ressources

| Ressource | Description | Lien |
|---|---|---|
| HuggingFace Open LLM Leaderboard | Classements en direct des modèles ouverts sur les benchmarks standards | [huggingface.co/spaces/open-llm-leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) |
| Documentation des benchmarks LLMxRay | Guide pour exécuter et interpréter les benchmarks dans LLMxRay | [Documentation LLMxRay](/fr/guide/benchmark) |
| LMSYS Chatbot Arena Leaderboard | Classements basés sur l’Elo à partir de votes de préférence humaine | [lmsys.org](https://chat.lmsys.org/?leaderboard) |

---

## Évaluation

**Option A — Rapport d’analyse de benchmarks (individuel, 2 pages) :**
Sélectionnez deux modèles et exécutez au moins deux benchmarks (ARC + un autre) sur chacun. Produisez un rapport écrit incluant : comparaison de la précision globale, analyse de la carte thermique par catégorie, calcul de l’erreur de calibration pour les deux modèles, comparaison de la latence et une recommandation finale — quel modèle choisiriez-vous pour un cas d’usage spécifique (vous définissez le cas d’usage), et pourquoi ? Étayez chaque affirmation avec des données issues de vos expériences LLMxRay.

**Option B — Présentation de comparaison (en binôme, diaporama) :**
Concevez une présentation de 6 à 10 diapositives qui détaille une expérience contrôlée utilisant la page Compare. Votre expérience doit isoler une variable (modèle, température ou prompt système) tout en maintenant les autres constantes. Montrez les sorties côte à côte, les vues diff et les métriques. Concluez par : qu’avez-vous appris sur l’effet de cette variable, et comment cela informerait-il le déploiement de modèles en conditions réelles ?

**Option C — Comité de sélection de modèles (groupes de 3-4, jeu de rôles) :**
Votre groupe est l’équipe d’évaluation IA d’une entreprise choisissant un modèle pour le support client. Chaque membre de l’équipe plaide pour un modèle différent en se basant sur ses données de benchmark. Présentez vos arguments, débattez des compromis (précision vs vitesse vs calibration vs coût), et produisez une recommandation consensuelle d’une page avec les opinions dissidentes notées. La recommandation doit référencer des catégories de benchmark spécifiques et des résultats de comparaison.

---

## La Suite

Dans le **[Module 8 : La vue d’ensemble](./module-8)**, vous prendrez du recul par rapport aux modèles individuels pour observer le paysage plus large. Comment vos données de benchmark et vos observations peuvent-elles contribuer à la communauté de recherche open source ? Vous apprendrez la reproductibilité, le partage des résultats et comment l’expérimentation locale avec des outils comme LLMxRay se connecte à l’effort mondial pour comprendre et améliorer les modèles de langage.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 7 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 6 : L’IA peut-elle utiliser des outils ?](./module-6) | [Retour au programme](./index) | [Module 8 : La vue d’ensemble &rarr;](./module-8)

</div>
