# Module 8 : La vue d'ensemble

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**Le Chercheur** — Concevez, exécutez et publiez une recherche originale en IA

**Durée :** 120 min | **Difficulté :** Avancé | **Prérequis :** [Modules 1-7](./index)

</div>

## Le Moment Eureka

> Vous pouvez contribuer à la recherche en IA — avec des outils que vous savez déjà utiliser. Chaque benchmark que vous exécutez, chaque erreur de calibration que vous mesurez, chaque comparaison que vous documentez est un point de données que la communauté ne possède pas encore.

Au cours des sept modules précédents, vous avez construit une boîte à outils complète pour comprendre les modèles de langage de l'intérieur. Vous avez appris à voir les tokens se générer, à manipuler l'aléatoire qui façonne les sorties, à détecter la fabrication, à naviguer dans les espaces vectoriels, à sonder les limites du contexte, à connecter les modèles au monde extérieur, et à mesurer les performances avec rigueur scientifique. Chacune de ces compétences avait de la valeur en soi. Ensemble, elles font de vous bien plus qu'un étudiant — elles font de vous un chercheur.

LLMxRay n'est pas seulement un outil d'apprentissage. C'est un instrument de recherche. Parce qu'il fonctionne entièrement sur des modèles locaux via Ollama, chaque configuration d'étudiant est un environnement de test unique. Votre matériel, votre niveau de quantification, votre VRAM disponible, la taille de votre fenêtre de contexte — tout cela produit des résultats qui diffèrent de ceux de quiconque. Dans la recherche traditionnelle en IA, cette variation est du bruit à éliminer. Dans la recherche communautaire sur les modèles ouverts, cette variation est le signal. Quand trente étudiants exécutent la même suite de benchmarks sur trente machines différentes, l'agrégat nous apprend quelque chose qu'aucun laboratoire isolé ne pourrait découvrir : comment ces modèles se comportent réellement dans la nature, sur le matériel que les vrais utilisateurs possèdent.

---

## Contexte Conceptuel

### De l'observateur au chercheur

Le parcours que vous avez suivi à travers ce programme suit un arc délibéré. Le **Module 1** vous a appris à voir les tokens — les unités atomiques de la sortie d'un modèle de langage — se générer en temps réel, révélant que le texte n'est pas produit d'un seul coup mais morceau par morceau. Le **Module 2** vous a montré la transition de phase de la température : comment un seul paramètre transforme une machine déterministe en machine créative, et comment les logprobs quantifient cette transformation. Le **Module 3** a révélé l'hallucination — la vérité inconfortable que la confiance mesure la fréquence des motifs, pas l'exactitude factuelle, et qu'un modèle peut être sûr à 95 % et complètement faux.

Le **Module 4** a cartographié l'espace vectoriel : vous avez découvert que le sens a une géométrie, que les embeddings se regroupent par sujet, et que les scores de similarité alimentent les systèmes de recherche. Le **Module 5** a exposé les limites de la mémoire : vous avez vu les modèles perdre leur cohérence à mesure que le contexte se remplit, compris comment le RAG étend les connaissances sans étendre le contexte, et saisi la contrainte fondamentale que chaque token de contexte coûte de l'attention. Le **Module 6** a connecté le langage à l'action : vous avez construit des outils, observé le modèle décider quand et comment les appeler, et constaté l'écart entre le tool calling structuré et la réalité désordonnée des arguments en langage naturel. Le **Module 7** vous a donné des instruments de mesure : benchmarks standardisés, comparaisons contrôlées, cartes thermiques, graphiques radar, analyse de la calibration, et la méthode scientifique appliquée à l'évaluation de l'IA.

Maintenant vous combinez le tout. Une question de recherche sur la calibration mobilise le Module 3 (hallucination), le Module 7 (benchmarking) et le Module 2 (effets de la température). Une étude sur la qualité des embeddings multilingues utilise le Module 4 (espace vectoriel) et le Module 5 (recherche). Une investigation sur la fiabilité du tool calling nécessite le Module 6 (appels de fonctions) et le Module 7 (comparaison contrôlée). Les modules n'ont jamais été des sujets séparés — ils étaient les facettes d'une compréhension unique et profonde que vous possédez désormais.

### Qu'est-ce qui fait une bonne recherche en IA ?

Trois principes séparent la recherche rigoureuse de l'expérimentation informelle :

**La reproductibilité.** Le même modèle, le même seed, le même contexte, la même température doivent produire le même résultat. Le preset Deterministic Pair de la page Compare de LLMxRay existe précisément dans ce but : il verrouille le seed aléatoire pour que les différences entre les exécutions ne puissent provenir que de la variable que vous testez. Si quelqu'un ne peut pas reproduire votre résultat en suivant votre méthodologie, le résultat est anecdotique — pas scientifique.

**La méthodologie.** Contrôlez vos variables. Changez une seule chose à la fois. Mesurez ce qui compte, et rapportez ce que vous trouvez — pas ce que vous espériez trouver. Un résultat négatif (« la température n'a eu aucun effet sur la précision factuelle ») a autant de valeur qu'un résultat positif. La communauté a besoin de savoir ce qui ne fonctionne pas autant que ce qui fonctionne.

**La portée.** Une question ciblée traitée en profondeur vaut mieux qu'un survol superficiel d'un sujet vaste. « Comment la quantification affecte-t-elle l'erreur de calibration sur TruthfulQA pour les modèles Llama 3.2 de 1B à 8B ? » est une meilleure question de recherche que « Quel modèle est le meilleur ? ». La première peut être tranchée par des données. La seconde non.

![Le cycle de recherche](/educators/fr/research-cycle.svg)

### La boîte à outils de recherche LLMxRay

Chaque fonctionnalité que vous avez utilisée dans ce programme correspond à une capacité de recherche :

| Fonctionnalité LLMxRay | Capacité de recherche |
|---|---|
| **Page Benchmark** | Évaluation standardisée avec logprobs réels via streaming SSE. Exécutez TruthfulQA, ARC, MMLU-Pro, HellaSwag, GSM8K. Collectez précision, confiance, erreur de calibration et décompositions par catégorie. |
| **Page Compare** | Expériences contrôlées. Preset Deterministic Pair pour les comparaisons à seed verrouillé. Temperature Sweep pour les études paramétriques. Diffs côte à côte, ComparisonMetricsBar pour la latence et le nombre de tokens. |
| **Page Embeddings** | Analyse sémantique. Scores de cosine similarity, projections 2D/3D, visualisation de clusters. Comparez les modèles d'embedding (bge-m3, nomic-embed-text) sur les mêmes entrées. |
| **RAG / Base de connaissances** | Études sur l'efficacité de la recherche. Mesurez comment le découpage des documents, le modèle d'embedding et le seuil de similarité affectent la qualité des réponses. Les vecteurs stockés dans IndexedDB signifient zéro coût. |
| **Atelier d'outils** | Test des capacités agentiques. Construisez des outils personnalisés, testez-les en chat, mesurez le taux de succès, la précision des arguments et les modes de défaillance selon les modèles. |
| **Page AI Training** | Curation de données et export JSONL. Curez des paires question-réponse, étiquetez-les par domaine, exportez des jeux de données prêts pour l'entraînement et le partage communautaire. |
| **Analyse de session** | Introspection détaillée. Timing token par token, distributions de logprobs, parsing des blocs `<think>` pour les modèles de réflexion, cartes thermiques de confiance. Étiqueté « Illustratif » pour les données d'introspection synthétiques. |

![La boîte à outils de recherche LLMxRay](/educators/fr/research-toolkit.svg)

### Contribuer à la communauté

Votre recherche a une valeur qui dépasse votre propre apprentissage. Le projet LLMxRay propose trois chemins de contribution :

**Chemin 1 : Suites de benchmarks personnalisées.** Concevez 20 questions ou plus pour un domaine spécialisé — histoire de France, théorie musicale, terminologie médicale, concepts de programmation, sciences environnementales — tout domaine dans lequel vous avez une expertise. Validez votre suite en l'exécutant sur au moins deux modèles pour vous assurer que les questions discriminent (ni trop faciles ni trop difficiles). Soumettez votre suite via un GitHub Pull Request dans le répertoire `community-benchmarks/`. Vos questions deviennent accessibles à tous les utilisateurs de LLMxRay.

**Chemin 2 : Modèles d'outils personnalisés.** Construisez un outil utile dans l'Atelier d'outils — un convertisseur d'unités, un formateur de citations, un générateur de cartes mémoire linguistiques, un réviseur de code. Testez-le en chat avec plusieurs modèles. Documentez le schéma de l'outil, le comportement attendu et les limitations connues. Soumettez-le via un PR dans `community-tools/`. Votre outil devient un modèle dont d'autres peuvent s'inspirer et qu'ils peuvent étendre.

**Chemin 3 : Résultats de recherche.** Partagez vos résultats dans les GitHub Discussions sous la catégorie « Show and Tell ». Rédigez votre méthodologie : quels modèles, quels paramètres, quels benchmarks, ce que vous avez trouvé. Incluez des captures d'écran de cartes thermiques, graphiques radar, graphiques de dispersion de confiance et vues diff de LLMxRay. Publiez vos tableaux de données pour que d'autres puissent comparer. Même un court article documentant une découverte surprenante (« Phi-3 mini surpasse Llama 3 8B sur les questions TruthfulQA en français ») enrichit le savoir collectif.

![Chemins de contribution](/educators/fr/contribution-paths.svg)

::: tip Chaque configuration est unique — et c'est précieux
Vous pourriez penser que vos résultats sur un portable avec 8 Go de RAM et un modèle quantifié en 4 bits sont « moins valides » que ceux d'une station de travail avec 48 Go de VRAM exécutant des poids en pleine précision. Ils ne sont pas moins valides — ils sont différemment informatifs. La plupart des utilisateurs réels utilisent des modèles quantifiés sur du matériel grand public. Vos résultats reflètent l'expérience réelle de la majorité. Indiquez les spécifications de votre matériel avec vos résultats et laissez la communauté tirer des conclusions agrégées.
:::

---

## Exercices Pratiques

### Exercice 1 : Formulez votre question de recherche

**Ce qu'il faut faire :**

Choisissez l'une des directions de recherche suivantes, ou proposez la vôtre :

**(a) Comment la taille du modèle affecte-t-elle la calibration ?**
Sélectionnez 3 modèles de tailles différentes (par ex. Phi-3 mini 3.8B, Llama 3.2 3B, Llama 3.1 8B). Exécutez chacun sur la suite de benchmarks TruthfulQA. Pour chaque modèle, enregistrez la précision globale et la précision pondérée par la confiance. Comparez confiance vs précision selon les classes de taille. Le modèle plus grand « sait-il ce qu'il sait » mieux, ou est-il simplement plus confiant sur tout — y compris ses erreurs ?

**(b) La température affecte-t-elle la précision factuelle ?**
Sélectionnez un modèle et exécutez le benchmark ARC à 5 températures différentes (0.1, 0.3, 0.5, 0.7, 1.0). Utilisez le preset Deterministic Pair de la page Compare pour contrôler l'échantillonnage aléatoire. Enregistrez la précision à chaque température. Tracez la courbe. Y a-t-il une température optimale ? La précision se dégrade-t-elle progressivement ou s'effondre-t-elle brusquement ?

**(c) Les embeddings capturent-ils bien le sens entre les langues ?**
Choisissez 10 paires de phrases — le même sens exprimé dans deux langues (par ex. anglais et français). Générez des embeddings avec bge-m3 et nomic-embed-text sur la page Embeddings. Enregistrez la cosine similarity pour chaque paire dans chaque modèle. Quel modèle d'embedding produit la meilleure similarité interlinguistique ? Certains types de phrases (factuelles, émotionnelles, idiomatiques) sont-ils plus difficiles à aligner entre les langues ?

**(d) Le tool calling est-il fiable selon la taille du modèle ?**
Construisez 3 outils dans l'Atelier d'outils (par ex. une calculatrice, un convertisseur de dates, un convertisseur d'unités). Testez chaque outil sur 3 modèles de tailles différentes. Pour chaque combinaison, exécutez 5 prompts censés déclencher l'outil. Suivez : Le modèle a-t-il appelé le bon outil ? Les arguments étaient-ils corrects ? A-t-il halluciné un outil qui n'existe pas ? Calculez le taux de succès par modèle et par outil.

Avant de commencer : rédigez une **hypothèse en 2 phrases**. Que vous attendez-vous à trouver, et pourquoi ? Cela vous oblige à vous engager sur une prédiction avant que les données n'arrivent — le fondement de la méthode scientifique.

::: tip Comment choisir une bonne question de recherche
Les meilleures questions sont assez spécifiques pour être traitées en une seule session, mais assez intéressantes pour que la réponse ne soit pas évidente. « Quel modèle est le meilleur ? » est trop vague. « Llama 3.1 8B obtient-il un meilleur score que Phi-3 mini sur les questions ARC de biologie ? » est ciblé, testable et véritablement incertain.
:::

---

### Exercice 2 : Exécutez l'expérience

**Ce qu'il faut faire :**

1. Ouvrez les pages LLMxRay pertinentes pour la direction de recherche que vous avez choisie
2. Documentez votre dispositif expérimental avant de commencer :
   - Quels modèles (nom, nombre de paramètres, niveau de quantification)
   - Quels paramètres (température, seed, longueur de contexte, prompt système)
   - Quelles suites de benchmarks ou fonctionnalités vous allez utiliser
   - Combien d'exécutions par condition (minimum 1 pour les benchmarks, 3-5 pour les tâches non déterministes)
3. Menez votre expérience de manière systématique :
   - Pour les études de benchmarks : utilisez la **page Benchmark** et enregistrez toutes les métriques — précision, confiance, latence, nombre de tokens, décompositions par catégorie
   - Pour les études de comparaison : utilisez la **page Compare** avec le preset **Deterministic Pair** pour garantir des conditions contrôlées
   - Pour les études d'embeddings : utilisez la **page Embeddings** et enregistrez les scores de cosine similarity pour chaque paire
   - Pour les études de tool calling : utilisez le **Chat Diagnostics** avec les outils activés et enregistrez chaque appel d'outil, ses arguments et le résultat
4. Prenez des captures d'écran des visualisations clés : cartes thermiques, graphiques radar, graphiques de dispersion de confiance, vues diff, projections d'embeddings
5. Consignez tout dans un tableau — même les résultats qui semblent inintéressants

**Ce que vous allez découvrir :**

La vraie recherche est désordonnée. Les modèles se comportent de manière inattendue. Une exécution de benchmark prend plus de temps que prévu. Un résultat contredit votre hypothèse et vous devez comprendre pourquoi. Ce n'est pas un échec — c'est le processus. La discipline de tout consigner, même les parties ennuyeuses, est ce qui sépare la recherche de l'expérimentation informelle.

::: tip Utilisez l'export JSONL pour la reproductibilité
Si vous curez des questions ou construisez des jeux de données, utilisez la **page AI Training** pour exporter vos données au format JSONL. Ce format lisible par machine garantit que d'autres puissent charger votre jeu de données exact et reproduire votre évaluation. Incluez le fichier JSONL lorsque vous partagez vos résultats.
:::

---

### Exercice 3 : Analysez et interprétez

**Ce qu'il faut faire :**

1. Rassemblez toutes vos données enregistrées et organisez-les dans un tableau récapitulatif :

| Condition | Précision | Confiance (moy.) | Erreur de calibration | Latence (moy.) | Notes |
|---|---|---|---|---|---|
| Modèle A / Paramètre 1 | ... | ... | ... | ... | ... |
| Modèle A / Paramètre 2 | ... | ... | ... | ... | ... |
| Modèle B / Paramètre 1 | ... | ... | ... | ... | ... |

2. Cherchez des motifs :
   - Votre hypothèse se vérifie-t-elle ? Où se brise-t-elle ?
   - Y a-t-il des catégories ou des types de questions où les résultats divergent fortement ?
   - Y a-t-il eu des surprises — des résultats que vous n'aviez pas prédits ?
3. Calculez les statistiques clés :
   - **Écarts de précision** entre les conditions (par ex. « le Modèle B a obtenu 8,3 points de pourcentage de plus sur les questions de sciences »)
   - **Erreur de calibration** — l'écart moyen entre confiance et précision à travers les intervalles de confiance
   - **Scores de similarité** pour les études d'embeddings — moyenne, minimum, maximum sur vos paires de phrases
4. Identifiez au moins une **question de suivi** soulevée par vos résultats. Une bonne recherche génère toujours plus de questions qu'elle n'en résout. (« Le modèle 3B était mieux calibré que le modèle 8B sur les questions de santé — cela se vérifie-t-il pour d'autres catégories ? »)

**Discussion :**

- Où vous êtes-vous trompé ? La partie la plus intéressante de toute expérience est quand l'hypothèse échoue. Que cet échec vous apprend-il sur le fonctionnement réel de ces modèles ?
- Si vous refaisiez l'expérience avec des modèles différents ou du matériel différent, vous attendriez-vous aux mêmes résultats ? Pourquoi ou pourquoi pas ?
- Que faudrait-il faire pour que vos résultats soient généralisables au-delà de votre configuration spécifique ?

::: tip Les résultats négatifs sont des résultats
Si vous avez émis l'hypothèse que la température affecte la précision factuelle et que vous avez constaté que non, c'est une découverte qui mérite d'être rapportée. La communauté bénéficie de savoir qu'une variable ne compte pas, car cela évite à d'autres de tester la même chose. Ne rejetez jamais un résultat simplement parce qu'il est « ennuyeux ».
:::

---

### Exercice 4 : Emballez et partagez

**Ce qu'il faut faire :**

Choisissez l'un des formats de contribution suivants :

**(a) Résumé de recherche dans les GitHub Discussions (500-800 mots) :**

1. Rendez-vous sur la page GitHub Discussions de LLMxRay et créez un nouveau post sous **Show and Tell**
2. Structurez votre post :
   - **Question** : Qu'avez-vous investigué ?
   - **Hypothèse** : Qu'aviez-vous prédit ?
   - **Dispositif** : Modèles, paramètres, matériel, quantification
   - **Résultats** : Tableaux de données et métriques clés
   - **Captures d'écran** : Intégrez au moins 2 visualisations de LLMxRay (cartes thermiques, graphiques radar, graphiques de dispersion, vues diff)
   - **Conclusions** : Qu'avez-vous appris ? Qu'est-ce qui vous a surpris ?
   - **Suite** : Que testeriez-vous ensuite ?
3. Étiquetez votre post avec les labels pertinents (benchmark, comparison, embeddings, tools)

**(b) Suite de benchmarks personnalisée (20+ questions, soumise en PR) :**

1. Choisissez un domaine dans lequel vous avez une expertise
2. Rédigez au moins 20 questions à choix multiples (4 options chacune, une correcte) en suivant le format utilisé par les suites de benchmarks existantes de LLMxRay
3. Validez votre suite en l'exécutant sur 2 modèles différents — vérifiez que les questions discriminent (ni 100 % ni 0 % de précision globale)
4. Utilisez la **page AI Training** pour organiser et exporter vos questions au format JSONL
5. Soumettez un Pull Request dans le répertoire `community-benchmarks/` avec votre fichier de suite et un README décrivant le domaine, le niveau de difficulté et les résultats de validation

**(c) Modèle d'outil personnalisé (construit, testé et soumis en PR) :**

1. Construisez un outil dans l'**Atelier d'outils** qui résout un vrai problème (pas un exemple jouet)
2. Testez-le dans le **Chat Diagnostics** avec au moins 2 modèles différents — documentez quels modèles l'appellent correctement et lesquels échouent
3. Enregistrez le taux de succès, les modes de défaillance courants et tout problème de formatage des arguments
4. Soumettez un Pull Request dans `community-tools/` avec le schéma JSON de votre outil, une description de son utilité et vos résultats de test

::: tip Écrire pour la communauté
Lorsque vous partagez vos résultats, écrivez pour quelqu'un qui n'était pas dans votre classe. Expliquez votre dispositif complètement. Incluez les spécifications matérielles (CPU, RAM, GPU le cas échéant). Précisez les noms exacts des modèles et les niveaux de quantification (par ex. « llama3.1:8b-instruct-q4_K_M »). Plus votre documentation est précise, plus votre contribution est utile.
:::

---

## Points Clés

1. **La reproductibilité est le fondement de la recherche.** Sans conditions contrôlées — seeds fixés, paramètres documentés, méthodologie explicite — vos résultats sont des anecdotes, pas des preuves. Le preset Deterministic Pair et l'infrastructure de benchmarks de LLMxRay existent pour rendre la reproductibilité facile.
2. **Les modèles locaux font de chacun un chercheur.** Vous n'avez pas besoin d'un cluster GPU ou d'un budget API pour faire de la recherche significative en IA. Un portable exécutant un modèle quantifié en 4 bits via Ollama est un environnement de recherche légitime, et les résultats reflètent la manière dont la plupart des gens utilisent réellement ces modèles.
3. **La variation entre les matériels est une qualité, pas un défaut.** Quand le même modèle produit des profils de latence différents, des débits différents, ou même des sorties subtilement différentes sur des machines et des niveaux de quantification différents, cette variation nous apprend quelque chose d'important sur la réalité du déploiement. Indiquez vos spécifications et laissez les données agrégées parler.
4. **La communauté grandit par le partage des découvertes.** Une suite de benchmarks personnalisée, un modèle d'outil bien documenté, ou un court article sur un résultat surprenant — chaque contribution facilite le travail du prochain chercheur. La science ouverte n'est pas une affaire de percées individuelles ; c'est une affaire de progrès collectif.
5. **Les compétences de ce programme s'appliquent à tout système d'IA.** Mécanique des tokens, dynamique de la température, détection des hallucinations, espaces vectoriels, limites du contexte, tool calling, méthodologie de benchmarking et conception de recherche — ce ne sont pas des compétences spécifiques à LLMxRay. Elles s'appliquent à tout modèle de langage, tout framework d'inférence, tout scénario de déploiement. Vous comprenez désormais l'IA au niveau où vous pouvez évaluer n'importe quel système de manière critique.

---

## Questions de Discussion

1. Que feriez-vous différemment si vous pouviez relancer votre expérience depuis le début ? Quelles variables ajouteriez-vous, supprimeriez-vous ou contrôleriez-vous plus soigneusement ?
2. Comment vos résultats de benchmarks se comparent-ils aux scores publiés sur le HuggingFace Open LLM Leaderboard ? S'ils diffèrent, qu'est-ce qui pourrait expliquer l'écart — la quantification, le formatage des prompts, la méthodologie d'évaluation, les effets du matériel ?
3. Si 30 étudiants d'une classe exécutent chacun le même benchmark sur du matériel différent (différents CPU, différentes quantités de RAM, différents niveaux de quantification), que pourrions-nous apprendre de l'agrégat qu'aucune exécution individuelle ne pourrait révéler ? Comment concevriez-vous l'analyse ?
4. Quelles considérations éthiques devraient guider la recherche en IA, même au niveau étudiant ? Pensez aux biais dans les données, au tri sélectif des résultats, à la surgénéralisation à partir de petits échantillons, et à la responsabilité qui accompagne la publication de résultats sur lesquels d'autres pourraient s'appuyer.
5. Si vous pouviez ajouter une fonctionnalité à LLMxRay pour en faire un meilleur outil de recherche, laquelle serait-ce ? Un nouveau type de benchmark ? Un pipeline de comparaison automatisé ? Un protocole intégré de partage de résultats ? Pourquoi cette fonctionnalité compterait-elle ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Lessons from the Trenches on Reproducible ML | Pineau et al. | 2021 | [arXiv:2003.12206](https://arxiv.org/abs/2003.12206) |
| Model Cards for Model Reporting | Mitchell et al. | 2019 | [arXiv:1810.03993](https://arxiv.org/abs/1810.03993) |
| Datasheets for Datasets | Gebru et al. | 2021 | [arXiv:1803.09010](https://arxiv.org/abs/1803.09010) |
| On the Dangers of Stochastic Parrots | Bender, Gebru, McMillan-Major, Shmitchell | 2021 | [doi:10.1145/3442188.3445922](https://doi.org/10.1145/3442188.3445922) |

### Ressources communautaires

| Ressource | Description | Lien |
|---|---|---|
| GitHub Discussions LLMxRay | Partagez vos découvertes, posez des questions, parcourez la recherche communautaire | [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions) |
| HuggingFace Open LLM Leaderboard | Classements en direct des modèles ouverts sur les benchmarks standards | [huggingface.co/spaces/open-llm-leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) |
| Papers With Code | Parcourez les résultats de pointe, jeux de données et benchmarks | [paperswithcode.com](https://paperswithcode.com/) |

---

## Évaluation

**Option A — Rapport de recherche complet (individuel, 1500-2000 mots) :**
Rédigez un article de recherche complet avec cinq sections : Introduction (formulez votre question et pourquoi elle compte), Méthodologie (modèles, paramètres, matériel, procédure — suffisamment de détails pour que quelqu'un puisse reproduire votre travail), Résultats (tableaux de données et au moins 2 visualisations de LLMxRay — cartes thermiques, graphiques radar, graphiques de dispersion ou vues diff), Discussion (interprétez vos résultats, confrontez votre hypothèse, reconnaissez les limitations, comparez aux résultats publiés quand c'est possible), et Conclusion (résumez ce que vous avez appris et proposez des pistes de recherche). L'article doit inclure des données quantitatives — pourcentages de précision, valeurs d'erreur de calibration, scores de similarité ou mesures de latence — et non de simples impressions qualitatives.

**Option B — Contribution communautaire + présentation (en binôme, diaporama + PR) :**
Créez et soumettez soit une suite de benchmarks personnalisée (20+ questions validées dans `community-benchmarks/`), soit un modèle d'outil personnalisé (testé sur 2+ modèles, soumis dans `community-tools/`). Préparez une présentation de 10 à 15 diapositives couvrant : ce que vous avez construit, pourquoi vous avez choisi ce domaine/outil, comment vous l'avez validé (quels modèles, quels résultats), ce que vous avez appris du processus, et comment la communauté peut utiliser votre contribution. Le PR doit être soumis (il n'a pas besoin d'être fusionné) et le diaporama doit inclure des captures d'écran de LLMxRay.

**Option C — Recueil de recherche de la classe (classe entière, document collectif) :**
Chaque étudiant contribue une découverte ciblée — une seule question de recherche, étudiée avec une méthodologie documentée, produisant des résultats quantitatifs. Une équipe éditoriale désignée compile toutes les contributions dans un rapport de classe qui agrège les résultats à travers différents matériels, modèles, niveaux de quantification et questions de recherche. Le recueil doit inclure : une introduction expliquant la méthodologie collective, des sections individuelles pour la découverte de chaque étudiant, et une section de synthèse qui tire des conclusions transversales à partir des données agrégées. Publiez le recueil comme document collectif et partagez-le dans les GitHub Discussions.

---

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(124,58,237,0.06)); border: 1px solid rgba(168,85,247,0.3); padding: 1.5rem 2rem; border-radius: 12px; margin: 2rem 0;">

### Félicitations

Vous avez terminé l'intégralité du Kit Enseignants LLMxRay — huit modules qui vous ont conduit de l'observation de votre premier token apparaissant à l'écran jusqu'à la conception et la publication d'une recherche originale en IA.

En chemin, vous avez appris la **mécanique des tokens** (comment les modèles génèrent du texte morceau par morceau), la **dynamique de la température** (comment un seul paramètre contrôle la frontière entre déterminisme et créativité), la **détection des hallucinations** (pourquoi la confiance n'est pas la vérité), les **espaces vectoriels** (comment le sens devient géométrie), les **limites du contexte** (pourquoi les modèles oublient et comment la recherche étend la mémoire), le **tool calling** (comment le langage se connecte à l'action), la **méthodologie de benchmarking** (comment mesurer ce qui compte), et désormais les **compétences de recherche** (comment poser les bonnes questions, rassembler des preuves rigoureuses et partager ce que vous découvrez).

Ce ne sont pas des concepts abstraits. Ce sont des compétences pratiques qui s'appliquent à tout système d'IA que vous évaluerez, déploierez ou construirez un jour. Les modèles changeront. Les architectures évolueront. Les benchmarks seront remplacés. Mais la capacité de regarder à l'intérieur d'un système, de mesurer son comportement, de questionner ses sorties et de communiquer clairement vos conclusions — cela est permanent.

La communauté LLMxRay grandit chaque fois que quelqu'un partage une suite de benchmarks, documente un résultat surprenant ou construit un outil qui résout un vrai problème. Vous faites désormais partie de cette communauté. Continuez à expérimenter. Continuez à questionner. Continuez à contribuer.

</div>

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 8 sur 9 — Le Grand Projet** du Kit Enseignants LLMxRay
[&larr; Module 7 : Comment comparer les modèles ?](./module-7) | [Module 9 : Ce que coûtent les mots &rarr;](./module-9) | [Retour au programme](./index)

</div>
