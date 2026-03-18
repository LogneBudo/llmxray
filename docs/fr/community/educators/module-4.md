# Module 4 : Que voit le modèle ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Explorateur** — Cartographiez le sens dans l'espace vectoriel

**Durée :** 45 min | **Difficulté :** Intermédiaire | **Prérequis :** [Module 1](./module-1), [Module 3](./module-3)

</div>

## Le Moment Eureka

> Les embeddings capturent le thème, pas le sentiment — "I love this" et "I hate this" sont similaires pour le modèle parce qu'ils partagent le même sujet.

Cette intuition brise l'idée reçue selon laquelle des sentiments opposés impliquent des représentations opposées. Les étudiants s'attendent à ce qu'inverser l'émotion d'une phrase envoie son embedding à l'autre bout de l'espace vectoriel. Au lieu de cela, ils découvrent que les modèles d'embedding encodent **le sujet du texte** — le thème commun, le domaine, le contexte — bien plus fortement que **ce que l'auteur ressent** à ce sujet. Le vecteur de "I love this movie" se trouve proche de "I hate this movie" parce que les deux parlent de cinéma et de réactions personnelles.

Comprendre cela transforme la façon dont les étudiants pensent la recherche, la récupération d'information et les systèmes de recommandation. Lorsqu'un système RAG trouve des documents "similaires" à votre requête, il fait correspondre le thème et le contexte — pas l'accord ou le sentiment. Une recherche portant sur "benefits of remote work" récupérera aussi des documents sur "problems with remote work" parce qu'ils partagent le même voisinage sémantique.

---

## Contexte Conceptuel

### Que sont les embeddings ?

Un **embedding** est un vecteur de longueur fixe composé de nombres à virgule flottante qui représente le sens d'un texte. Lorsque vous soumettez une phrase à un modèle d'embedding, il renvoie quelque chose comme :

```
"The cat sat on the mat" → [0.023, -0.187, 0.541, ..., -0.092]
                            ← 768 ou 1024 dimensions →
```

Ce vecteur n'est pas lisible par un humain. On ne peut pas regarder la dimension 347 et dire "ceci est la dimension du chat". Mais collectivement, le motif d'activations sur toutes les dimensions encode des informations sémantiques — thème, registre, structure grammaticale, domaine — d'une manière qui permet la comparaison mathématique.

Les embeddings sont le pont entre le langage humain et le calcul machine. Le texte est désordonné, de longueur variable et ambigu. Les vecteurs sont de longueur fixe, numériques et peuvent être comparés par simple arithmétique.

![Fonctionnement des Embeddings](/educators/fr/embedding-pipeline.svg)

### Pourquoi des vecteurs ? La similarité comme distance

La puissance des embeddings repose sur un principe simple : **des sens similaires produisent des vecteurs similaires**. Cela se mesure à l'aide de la **cosine similarity** — le cosinus de l'angle entre deux vecteurs dans un espace de grande dimension.

| Cosine similarity | Interprétation |
|---|---|
| **1.0** | Sens identique (même texte ou paraphrase) |
| **0.7 - 0.9** | Étroitement liés (même thème, contexte similaire) |
| **0.4 - 0.7** | Partiellement liés (thèmes qui se recoupent) |
| **0.0 - 0.4** | Sans rapport (sujets entièrement différents) |
| **Négatif** | Rare en pratique avec les modèles modernes |

Cela fait des embeddings le fondement de :
- **La recherche sémantique** — trouver des documents par le sens, pas par les mots-clés
- **Le RAG (Retrieval-Augmented Generation)** — fournir du contexte pertinent à un modèle génératif
- **Le clustering** — regrouper automatiquement des documents similaires
- **La détection d'anomalies** — trouver le document qui n'appartient pas au groupe

### Thème vs sentiment — l'intuition clé

C'est ici que l'intuition nous trompe. Considérez ces trois phrases :

1. "I love this movie, the acting was brilliant"
2. "I hate this movie, the acting was terrible"
3. "The cat sat on the mat"

La plupart des gens s'attendent à ce que (1) et (2) soient **très éloignées** parce que les sentiments sont opposés. Mais les modèles d'embedding placent (1) et (2) **proches l'une de l'autre** — et toutes deux loin de (3).

Pourquoi ? Parce que la cosine similarity capture le **contexte partagé** : les deux phrases parlent de cinéma, de qualité de jeu d'acteur, d'évaluation personnelle d'un divertissement. Elles partagent le vocabulaire ("movie", "acting"), la structure grammaticale (sujet + opinion + justification) et le domaine (critique cinématographique). Le seul mot "love" vs "hate" contribue bien moins au vecteur global que l'écrasant chevauchement thématique.

Ce n'est pas un défaut. Les modèles d'embedding sont entraînés avec des objectifs du type "prédire si ces deux phrases apparaissaient à proximité dans un document" ou "ces deux textes parlent-ils du même sujet". Ces objectifs optimisent la **parenté thématique**, pas la polarité du sentiment.

![Thème vs Sentiment dans l'espace vectoriel](/educators/fr/topic-vs-sentiment.svg)

::: warning L'analyse de sentiment nécessite des outils différents
Si vous devez détecter le sentiment, il vous faut un modèle entraîné spécifiquement pour cette tâche (un classifieur), ou demander explicitement à un modèle génératif de raisonner sur le sentiment. Les modèles d'embedding généralistes ne sont pas conçus pour séparer "love" de "hate" — ils sont conçus pour séparer "movies" de "cats".
:::

### Dimensionnalité — ce que chaque dimension "signifie"

Les modèles d'embedding produisent des vecteurs de centaines ou de milliers de dimensions :

| Modèle | Dimensions |
|---|---|
| all-minilm | 384 |
| nomic-embed-text | 768 |
| mxbai-embed-large | 1024 |
| bge-m3 | 1024 |

Une question naturelle : que représente chaque dimension ? La réponse est : **rien individuellement, tout collectivement**. Chaque dimension est une caractéristique numérique apprise qui, isolément, n'a aucune signification interprétable. Mais le motif sur l'ensemble des dimensions encode une information sémantique riche.

C'est analogue au fonctionnement des valeurs RVB dans les images. Savoir qu'un pixel a R=200 ne vous dit presque rien. Mais la combinaison R=200, V=100, B=50 vous indique que c'est un orange chaud. De même, une seule dimension d'un embedding est dépourvue de sens, mais le vecteur complet encode la signification.

Certaines dimensions s'activeront fortement pour certains concepts (vous pourriez remarquer que la dimension 142 tend à être élevée pour du texte juridique et basse pour des recettes de cuisine), mais ce sont des **représentations distribuées** — le sens est réparti sur de nombreuses dimensions, et chaque dimension participe à la représentation de nombreux concepts différents.

### En quoi les modèles d'embedding diffèrent des modèles génératifs

C'est une source de confusion fréquente. Les modèles avec lesquels vous conversez (llama3, mistral, deepseek) et ceux qui produisent des embeddings (nomic-embed-text, bge-m3) sont architecturalement différents :

| Aspect | Modèle génératif | Modèle d'embedding |
|---|---|---|
| **Architecture** | Transformer décodeur seul | Encodeur seul ou encodeur-décodeur |
| **Objectif d'entraînement** | Prédire le token suivant | Produire des vecteurs similaires pour des textes apparentés |
| **Sortie** | Un token à la fois (streaming) | Un vecteur de longueur fixe par entrée |
| **Traitement de l'entrée** | Voit les tokens de gauche à droite | Voit tous les tokens simultanément (bidirectionnel) |
| **Cas d'usage** | Conversation, génération, raisonnement | Recherche, récupération, clustering, classification |

Les modèles d'embedding sont généralement beaucoup plus petits et plus rapides que les modèles génératifs. Produire un embedding pour un paragraphe prend des millisecondes, pas des secondes. C'est pourquoi les systèmes RAG peuvent parcourir des milliers de documents en temps réel — le calcul lourd (produire l'embedding de chaque document) n'est effectué qu'une seule fois, et la comparaison n'est que de l'arithmétique.

![Comparaison des modèles d'embedding](/educators/fr/embedding-models.svg)

---

## Exercices Pratiques

### Exercice 1 : Le piège du sentiment

**Ce qu'il faut faire :**

1. Ouvrez la page **Embeddings** dans LLMxRay et accédez au **Similarity Calculator**
2. Assurez-vous qu'un modèle d'embedding est téléchargé dans Ollama (nomic-embed-text est recommandé)
3. Comparez ces deux phrases :
   - Text A : *"I love this movie"*
   - Text B : *"I hate this movie"*
4. Notez le score de cosine similarity
5. Maintenant comparez :
   - Text A : *"I love this movie"*
   - Text B : *"The cat sat on the mat"*
6. Notez le score de cosine similarity

::: warning Un modèle d'embedding doit être téléchargé dans Ollama
Avant de commencer ces exercices, assurez-vous d'avoir au moins un modèle d'embedding disponible. Exécutez `ollama pull nomic-embed-text` dans votre terminal. Pour l'exercice 3, vous aurez également besoin de `ollama pull bge-m3` pour la comparaison multilingue.
:::

**Ce que vous allez découvrir :**

La similarité entre "I love this movie" et "I hate this movie" sera **étonnamment élevée** (généralement 0.85-0.95). La similarité entre "I love this movie" et "The cat sat on the mat" sera **bien plus basse** (généralement 0.2-0.4).

C'est le moment eureka : le modèle perçoit ces phrases comme "toutes deux à propos de cinéma" vs "l'une à propos de cinéma, l'autre à propos de chats". Le sentiment ne fait presque pas bouger l'aiguille.

**Essayez d'autres paires :**
- "This restaurant is amazing" vs "This restaurant is terrible" (similarité élevée)
- "This restaurant is amazing" vs "Quantum mechanics describes particle behavior" (similarité faible)
- "I'm happy" vs "I'm sad" (plus élevé que vous ne le pensez)

---

### Exercice 2 : Embedding d'un seul mot

**Ce qu'il faut faire :**

1. Accédez au **Embed Playground** dans la page Embeddings
2. Produisez l'embedding de chacun de ces mots individuellement :
   - *"king"*
   - *"queen"*
   - *"man"*
   - *"woman"*
3. Pour chaque mot, observez la **visualisation du vecteur** — le diagramme en barres montrant les activations positives (bleu) et négatives (rouge) selon les dimensions
4. Notez les statistiques affichées : dimensionnalité, norme L2, pourcentage de parcimonie, temps d'inférence

**Ce qu'il faut observer :**

- Les visualisations de "king" et "queen" partagent des motifs visibles — des groupes de dimensions qui s'activent de manière similaire, reflétant la sémantique partagée de "royauté"
- "man" et "woman" partagent également des motifs — reflétant la sémantique partagée de "humain/personne"
- La statistique de parcimonie indique quel pourcentage de dimensions est proche de zéro. La plupart des dimensions portent du signal ; les embeddings sont des représentations **denses**
- Les dimensions individuelles ont des pics positifs ou négatifs, mais aucun pic isolé ne signifie quoi que ce soit en soi — c'est le motif global qui compte

**Réflexion :**

Le célèbre résultat de Word2Vec `king - man + woman ≈ queen` a démontré que les embeddings encodent une **structure relationnelle**. Les modèles d'embedding modernes sont bien plus sophistiqués, mais le principe reste valable : les relations sémantiques sont des relations géométriques dans l'espace vectoriel.

---

### Exercice 3 : Similarité translinguistique

**Ce qu'il faut faire :**

1. Dans le **Similarity Calculator**, sélectionnez **bge-m3** comme modèle d'embedding (un modèle multilingue)
2. Comparez :
   - Text A : *"The weather is nice today"*
   - Text B : *"Il fait beau aujourd'hui"* (l'équivalent français)
3. Notez le score de cosine similarity
4. Passez maintenant à **nomic-embed-text** (principalement anglais) et relancez la même comparaison
5. Notez le second score et comparez

**Ce que vous allez découvrir :**

Avec bge-m3 (multilingue), les phrases anglaise et française auront une **similarité élevée** (généralement 0.75-0.90) parce que le modèle a été entraîné sur du texte parallèle dans plusieurs langues et a appris que ces phrases signifient la même chose.

Avec nomic-embed-text (centré sur l'anglais), la similarité sera **sensiblement plus basse** parce que le modèle dispose de moins de signal d'entraînement pour aligner les représentations française et anglaise.

**Essayez d'autres paires :**
- "Good morning" vs "Bonjour" (concept de salutation)
- "Machine learning is transforming industry" vs "L'apprentissage automatique transforme l'industrie"
- Essayez une langue plus éloignée de l'anglais — allemand, chinois, arabe — et observez si l'écart se creuse

**Pourquoi c'est important :**

Les modèles d'embedding multilingues sont le fondement de la recherche translinguistique. Un utilisateur effectuant une recherche en français peut trouver des documents pertinents en anglais — non pas grâce à la traduction, mais parce que le modèle projette les deux langues dans un espace sémantique partagé. C'est ainsi que fonctionnent les systèmes RAG multilingues.

---

### Exercice 4 : Comparaison de modèles

**Ce qu'il faut faire :**

1. Accédez à l'onglet **Model Comparison** dans la page Embeddings
2. Entrez le texte : *"Artificial intelligence is changing how we work and live"*
3. Sélectionnez deux modèles : **nomic-embed-text** et **mxbai-embed-large**
4. Lancez l'embedding et comparez :
   - **Dimensions** : combien de nombres chaque modèle produit-il ?
   - **Norme L2** : quelle est la "longueur" de chaque vecteur ?
   - **Parcimonie** : quel pourcentage de dimensions est proche de zéro ?
   - **Temps d'inférence** : combien de temps chaque modèle a-t-il pris ?

**Ce qu'il faut observer :**

| Métrique | Ce qu'elle vous indique |
|---|---|
| **Dimensions** | Plus de dimensions peuvent capturer plus de nuances, mais coûtent davantage en stockage et en calcul |
| **Norme L2** | Certains modèles normalisent les vecteurs (norme L2 ≈ 1.0), d'autres non. Les vecteurs normalisés rendent la cosine similarity équivalente au produit scalaire. |
| **Parcimonie** | Une faible parcimonie signifie que la plupart des dimensions portent du signal. Une forte parcimonie pourrait indiquer que le modèle "gaspille" de la capacité. |
| **Temps d'inférence** | Les modèles plus grands prennent plus de temps. Pour la recherche en temps réel, la vitesse compte. |

**Discussion :**

- Un embedding à 1024 dimensions est-il "meilleur" qu'un embedding à 768 dimensions ?
- Si vous construisiez un système de recherche sur 10 millions de documents, préféreriez-vous moins de dimensions (plus rapide) ou plus de dimensions (potentiellement plus précis) ?
- La différence de temps d'inférence a-t-elle de l'importance pour le traitement par lots vs les requêtes en temps réel ?

---

## Points Clés

1. **Les embeddings sont des vecteurs denses** qui encodent le sens du texte dans un format que les ordinateurs peuvent comparer mathématiquement.
2. **La cosine similarity capture la parenté thématique**, pas le sentiment. Des opinions opposées sur le même sujet produisent des embeddings similaires.
3. **Aucune dimension isolée n'a de signification** — l'information sémantique est distribuée collectivement sur toutes les dimensions.
4. **Les modèles multilingues projettent les langues dans un espace partagé**, permettant la recherche et la récupération translinguistiques sans traduction.
5. **Les modèles d'embedding ne sont pas des modèles génératifs** — ce sont des encodeurs plus petits, plus rapides et bidirectionnels, conçus pour la représentation, pas pour la génération.

---

## Questions de Discussion

1. Si les embeddings capturent le thème mais pas le sentiment, comment un système d'avis de produits devrait-il être conçu ? Peut-on combiner les embeddings avec autre chose pour obtenir les deux ?
2. Une entreprise souhaite construire un moteur de recherche multilingue pour le support client. Sur la base de vos expériences, recommanderiez-vous un grand modèle multilingue unique ou des modèles séparés par langue ? Quels sont les compromis ?
3. Les dimensions d'embedding sont souvent 768 ou 1024. Pourquoi pas 10 000 ? Pourquoi pas 50 ? Quelles contraintes déterminent la dimensionnalité "optimale" ?
4. La célèbre analogie `king - man + woman = queen` fonctionne dans l'espace d'embedding. Pouvez-vous imaginer une analogie qui ne fonctionnerait PAS ? Qu'est-ce que cela vous apprendrait sur les données d'entraînement du modèle ?
5. Les systèmes RAG utilisent les embeddings pour trouver des documents pertinents. Sachant que les embeddings capturent le thème mais pas le sentiment, quels modes de défaillance faut-il anticiper lorsqu'un utilisateur pose une question sensible au sentiment comme "Qu'est-ce que les clients n'aiment pas dans notre produit ?"

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Efficient Estimation of Word Representations in Vector Space | Mikolov, Chen, Corrado, Dean | 2013 | [arXiv:1301.3781](https://arxiv.org/abs/1301.3781) |
| GloVe: Global Vectors for Word Representation | Pennington, Socher, Manning | 2014 | [aclanthology.org](https://aclanthology.org/D14-1162/) |
| Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks | Reimers, Gurevych | 2019 | [arXiv:1908.10084](https://arxiv.org/abs/1908.10084) |
| MTEB: Massive Text Embedding Benchmark | Muennighoff et al. | 2023 | [arXiv:2210.07316](https://arxiv.org/abs/2210.07316) |
| Matryoshka Representation Learning | Kusupati et al. | 2022 | [arXiv:2205.13147](https://arxiv.org/abs/2205.13147) |

### Tutoriels et explications visuelles

| Ressource | Auteur | Lien |
|---|---|---|
| The Illustrated Word2Vec | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-word2vec/) |
| Some Intuition on Word Embeddings | Lilian Weng | [lilianweng.github.io](https://lilianweng.github.io/posts/2017-10-15-word-embedding/) |

---

## Évaluation

**Option A — Rapport d'exploration (individuel, 1 page) :**
À l'aide du Similarity Calculator, testez 10 paires de phrases de votre choix — mélangez thèmes, sentiments et langues. Présentez un tableau des paires et de leurs scores de cosine similarity. Pour chaque paire, expliquez si le score correspondait à votre intuition et pourquoi.

**Option B — Évaluation de modèles (en binôme, 1 page) :**
Produisez les embeddings du même ensemble de 10 phrases avec deux modèles différents (par ex. nomic-embed-text vs bge-m3). Comparez les matrices de similarité. Où les modèles sont-ils d'accord ? Où divergent-ils ? Formulez des hypothèses sur les raisons, en vous appuyant sur ce que vous savez de l'entraînement de chaque modèle.

**Option C — Conception de système (groupes de 2-3, présentation de 5 minutes) :**
Concevez un système de recherche documentaire pour une bibliothèque universitaire. Précisez quel modèle d'embedding vous utiliseriez, comment vous géreriez les documents multilingues, et quelles limitations vous signaleriez aux utilisateurs (indice : thème vs sentiment). Présentez votre architecture et justifiez chaque choix par des preuves tirées de vos expériences LLMxRay.

---

## La Suite

Dans le **[Module 5 : Quand le modèle oublie-t-il ?](./module-5)**, vous explorerez la fenêtre de contexte — la quantité finie de texte qu'un modèle peut "voir" en une seule fois. Vous découvrirez ce qui se passe lorsqu'une conversation dépasse la limite, pourquoi les modèles perdent le fil des instructions enfouies dans des prompts longs, et comment la longueur du contexte détermine ce que les LLM peuvent et ne peuvent pas faire.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 4 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 3 : L'IA peut-elle mentir ?](./module-3) | [Retour au programme](./index) | [Module 5 : Quand le modèle oublie-t-il ? &rarr;](./module-5)

</div>
