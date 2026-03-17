# Module 1 : Qu'est-ce qu'un token ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Observateur** — Voir l'invisible

**Durée :** 45 min | **Difficulté :** Débutant | **Prérequis :** Aucun

</div>

## Le Moment Eureka

> L'IA ne pense pas en mots. Elle pense en tokens. Et les tokens ne sont pas ce que vous imaginez.

C'est l'intuition fondamentale qui change tout dans la compréhension des modèles de langage par les étudiants. Chaque concept qui suit — température, fenêtres de contexte, embeddings, tool calling — repose sur la compréhension de ce que sont réellement les tokens.

![Du Texte au Token à la Prédiction](/educators/fr/token-pipeline.svg)

---

## Contexte Conceptuel

### Qu'est-ce qu'un token ?

Un **token** est la plus petite unité de texte traitée par un modèle de langage. Les tokens ne sont ni des mots, ni des caractères, ni des syllabes — ce sont des **unités sous-lexicales** déterminées par un algorithme statistique entraîné sur un large corpus.

L'algorithme dominant est le **Byte-Pair Encoding (BPE)**, introduit en NLP par Sennrich et al. (2016). Le BPE commence par les caractères individuels et fusionne itérativement les paires adjacentes les plus fréquentes jusqu'à atteindre une taille de vocabulaire cible (généralement 32 000 à 128 000 tokens).

Par exemple, le mot "understanding" pourrait être tokenisé ainsi :
- `["under", "stand", "ing"]` (3 tokens)

Tandis que "AI" pourrait donner :
- `["AI"]` (1 token — suffisamment courant pour constituer une entrée unique)

### Pourquoi la tokenisation est-elle importante ?

Chaque aspect du comportement des LLM se mesure en tokens :

| Aspect | Impact des tokens |
|---|---|
| **Coût** | La tarification des API se fait au token |
| **Vitesse** | Les modèles génèrent un token par étape d'inférence |
| **Fenêtre de contexte** | Le nombre maximum de tokens que le modèle peut voir en une fois |
| **Qualité** | Les frontières de tokens affectent ce que le modèle peut "voir" à l'intérieur d'un mot |
| **Équité** | Les langues ayant moins de tokens dans le vocabulaire nécessitent plus de tokens par phrase |

### Comment fonctionne le BPE (simplifié)

1. Commencer avec tous les octets individuels (256 tokens de base)
2. Compter toutes les paires adjacentes dans le corpus d'entraînement
3. Fusionner la paire la plus fréquente en un nouveau token
4. Répéter jusqu'à atteindre la taille de vocabulaire cible

Cela signifie :
- Les mots courants deviennent des tokens uniques : `"the"`, `"and"`, `"is"`
- Les mots rares sont décomposés en morceaux : `"tokenization"` → `["token", "ization"]`
- Les mots très rares sont réduits à des caractères individuels

La famille LLaMA 3 utilise un tokenizer BPE avec un vocabulaire de 128 000 tokens, entraîné principalement sur du texte anglais (Grattafiori et al., 2024).

![Comment fonctionne la tokenisation BPE](/educators/fr/bpe-process.svg)

---

## Exercices Pratiques

### Exercice 1 : Voir les tokens arriver en temps réel

**Ce qu'il faut faire :**

1. Ouvrez **Chat Diagnostics** dans LLMxRay et sélectionnez un modèle (ex. `llama3.2`)
2. Envoyez : *"Explain what gravity is in one sentence"*
3. Observez les tokens arriver un par un — chaque token apparaît au fur et à mesure que le modèle le produit
4. Ouvrez l'onglet **Stream** — voyez chaque token avec son horodatage et sa latence inter-token
5. Remarquez la **coloration de confiance** : les tokens verts sont arrivés rapidement (confiance élevée), les tokens orange/rouges sont arrivés lentement (confiance plus faible)

**Ce qu'il faut observer :**

- Les tokens ne sont pas toujours des mots complets. Vous verrez des mots partiels, de la ponctuation et des espaces comme tokens séparés.
- Certains tokens arrivent presque instantanément (le modèle était très certain). D'autres prennent plus de temps (le modèle "choisissait" entre plusieurs options).
- Le premier token prend le plus de temps (Time to First Token / TTFT) — c'est le moment où le modèle traite l'intégralité de votre prompt.

::: info Qu'est-ce que la coloration de confiance ?
LLMxRay estime la confiance des tokens à partir de la **latence inter-token**. Une génération plus rapide suggère que le modèle avait une prédiction dominante pour le token suivant. C'est une approximation pratique — pour une mesure de confiance mathématiquement précise, la fonctionnalité Benchmark utilise de vrais logprobs via l'endpoint compatible OpenAI. Voir le Module 3 pour l'histoire complète sur la confiance et la vérité.
:::

---

### Exercice 2 : Le choc du tokenizer

**Ce qu'il faut faire :**

1. Dans le chat, demandez : *"Count the letters in the word 'strawberry'"*
2. Le modèle dira probablement 10 — mais `strawberry` contient 10 lettres dont 3 r. Beaucoup de modèles comptent 2 r au lieu de 3.
3. Maintenant demandez : *"How many words are in this sentence: The quick brown fox jumps over the lazy dog"*
4. Le modèle répond correctement (9 mots) — compter les mots est plus facile que compter les lettres

**Pourquoi cela se produit :**

Le mot `strawberry` est tokenisé en quelque chose comme `["str", "aw", "berry"]` — le modèle ne voit jamais les lettres individuelles. Il traite ces morceaux comme des unités atomiques. Compter les lettres nécessite un raisonnement au niveau des caractères, mais le modèle opère au niveau des tokens.

Ce n'est pas un bug — c'est une conséquence fondamentale de la tokenisation sous-lexicale. Le modèle ne peut littéralement pas "voir" les lettres individuelles à l'intérieur d'un token.

![Pourquoi les LLMs ne peuvent pas compter les lettres dans Strawberry](/educators/fr/strawberry-tokenization.svg)

::: tip Essayez par vous-même
Visitez le [playground Tiktokenizer](https://tiktokenizer.vercel.app/) ou le [HuggingFace Tokenizer Playground](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) pour visualiser comment différents modèles tokenisent le même texte. Comparez comment `llama` et `gpt-4` tokenisent `"strawberry"` — ils peuvent le découper différemment.
:::

**Contexte de recherche :** Fu et al. (2024) ont mené une étude systématique de ce phénomène dans leur article *"Why Do Large Language Models Struggle to Count Letters?"* Ils ont découvert que les erreurs corrèlent fortement avec la fréquence des lettres et la longueur des mots, et non avec la fréquence d'apparition du mot dans les données d'entraînement — confirmant que la limitation est architecturale (tokenisation), et non un manque de connaissances.

---

### Exercice 3 : Le biais linguistique de la tokenisation

**Ce qu'il faut faire :**

1. Envoyez ce prompt au modèle : *"Say hello in one sentence"*
2. Ouvrez l'onglet **Stream** et comptez les tokens dans la réponse
3. Maintenant envoyez : *"Dis bonjour en une phrase"* (la même demande en français)
4. Comptez à nouveau les tokens — la réponse en français utilisera probablement plus de tokens
5. Essayez la même chose en allemand, espagnol, chinois, arabe ou toute autre langue que vous connaissez
6. Notez le nombre de tokens pour chaque langue

**Ce que vous allez découvrir :**

Le même contenu sémantique nécessite **significativement plus de tokens** dans les langues autres que l'anglais. Ce n'est pas parce que le français est "plus complexe" — c'est parce que le vocabulaire du tokenizer a été construit principalement à partir de texte anglais.

| Langue | Ratio typique de tokens par rapport à l'anglais |
|---|---|
| Anglais | 1,0x (référence) |
| Français | 1,3-1,5x |
| Allemand | 1,4-1,6x |
| Chinois | 1,5-2,0x |
| Arabe | 2,0-3,0x |
| Certaines langues africaines | Jusqu'à 5-15x |

![Biais linguistique des tokenizers](/educators/fr/language-bias.svg)

**Pourquoi c'est important en pratique :**

- Un utilisateur francophone atteint la limite de la fenêtre de contexte **30 à 50 % plus tôt** qu'un utilisateur anglophone
- Les coûts d'API sont **proportionnellement plus élevés** pour les langues non anglophones
- La génération est **plus lente** (plus de tokens à produire pour le même contenu)
- La qualité peut se dégrader parce que le modèle dispose de moins de "tokens de réflexion"

::: warning Ceci est un domaine de recherche actif
Petrov et al. (2023) ont montré dans leur article NeurIPS *"Language Model Tokenizers Introduce Unfairness Between Languages"* que le même texte peut nécessiter jusqu'à **15x plus de tokens** dans certaines langues par rapport à l'anglais, sur 17 tokenizers différents. Ce n'est pas seulement une préoccupation théorique — cela a des implications réelles en termes de coût, de latence et de qualité.

Explorez leur [démo interactive](https://aleksandarpetrov.github.io/tokenization-fairness/) pour visualiser la disparité entre les langues.
:::

---

### Exercice 4 : Vitesse et confiance

**Ce qu'il faut faire :**

1. Menez plusieurs conversations avec le modèle sur différents sujets
2. Pour chaque réponse, observez la coloration de confiance dans le flux de tokens
3. Remarquez les schémas récurrents :
   - Phrases courantes ("I think", "The answer is") → vert (rapide, confiant)
   - Termes techniques, chiffres, noms propres → plus orange (plus lent, moins certain)
   - Formulations créatives ou inhabituelles → orange/rouge majoritaire (le plus lent, le moins certain)
4. Ouvrez deux onglets Stream côte à côte (de sessions différentes) et comparez les distributions de latence

**Matière à réflexion :**

- La vitesse (latence inter-token) est un **indicateur indirect** de la confiance, pas une mesure directe
- Le modèle génère les continuations "évidentes" plus rapidement que les continuations surprenantes
- Cela reflète le fonctionnement de la distribution de probabilité softmax : lorsqu'un token a une probabilité nettement supérieure aux alternatives, le calcul converge plus rapidement
- Pour une mesure de confiance **précise**, il faut les logprobs réels — que LLMxRay fournit via la fonctionnalité Benchmark (Module 3)

---

## Points Clés

1. **Les tokens sont l'unité atomique** du calcul des LLM — ni les mots, ni les caractères
2. **La tokenisation BPE** crée un vocabulaire à partir de schémas statistiques, pas de règles linguistiques
3. **Les frontières de tokens** déterminent ce sur quoi le modèle peut ou ne peut pas raisonner (comptage de lettres, manipulation de caractères)
4. **Le biais linguistique** des tokenizers crée une inégalité mesurable en termes de coût, vitesse et qualité entre les langues
5. **La vitesse corrèle avec la confiance** mais n'est pas identique — c'est une approximation utile

---

## Questions de Discussion

Pour une discussion en classe ou en séminaire :

1. Si les tokenizers sont entraînés sur des corpus à dominante anglophone, à quoi ressemblerait un tokenizer multilingue "équitable" ? Est-ce même possible avec une taille de vocabulaire fixe ?
2. Le problème du "strawberry" montre que les modèles ne peuvent pas raisonner sur les caractères à l'intérieur des tokens. Quelles autres tâches apparemment simples pourraient être affectées par les frontières de tokens ?
3. Les entreprises d'IA devraient-elles divulguer le biais linguistique de leur tokenizer ? Comment cela changerait-il la façon dont les utilisateurs non anglophones interagissent avec l'IA ?
4. Si vous deviez concevoir un tokenizer pour un domaine spécifique (médical, juridique, code), comment modifieriez-vous le processus d'entraînement ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Neural Machine Translation of Rare Words with Subword Units | Sennrich, Haddow, Birch | 2016 | [arXiv:1508.07909](https://arxiv.org/abs/1508.07909) |
| SentencePiece: A simple and language independent subword tokenizer | Kudo, Richardson | 2018 | [arXiv:1808.06226](https://arxiv.org/abs/1808.06226) |
| Language Model Tokenizers Introduce Unfairness Between Languages | Petrov, La Malfa, Torr, Bibi | 2023 | [arXiv:2305.15425](https://arxiv.org/abs/2305.15425) |
| Why Do Large Language Models Struggle to Count Letters? | Fu, Ferrando, Conde, Arriaga, Reviriego | 2024 | [arXiv:2412.18626](https://arxiv.org/abs/2412.18626) |
| Attention Is All You Need | Vaswani et al. | 2017 | [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) |
| The Llama 3 Herd of Models | Grattafiori et al. (Meta AI) | 2024 | [arXiv:2407.21783](https://arxiv.org/abs/2407.21783) |

### Tutoriels et explications visuelles

| Ressource | Auteur | Lien |
|---|---|---|
| Let's build the GPT Tokenizer (video, 2h13m) | Andrej Karpathy | [YouTube](https://www.youtube.com/watch?v=zduSFxRajkE) |
| The Illustrated Transformer | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-transformer/) |
| HuggingFace NLP Course, Chapter 6: Tokenizers | Hugging Face | [huggingface.co/learn](https://huggingface.co/learn/llm-course/en/chapter6/5) |
| LLM Sampling Parameters Explained | Let's Data Science | [letsdatascience.com](https://letsdatascience.com/blog/llm-sampling-temperature-top-k-top-p-and-min-p-explained) |

### Outils interactifs

| Outil | Lien | Description |
|---|---|---|
| Tiktokenizer | [tiktokenizer.vercel.app](https://tiktokenizer.vercel.app/) | Visualiser la tokenisation GPT avec un code couleur |
| HuggingFace Tokenizer Playground | [huggingface.co/spaces/Xenova](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) | Comparer la tokenisation entre modèles ouverts (LLaMA, Mistral, etc.) |
| OpenAI Tokenizer | [platform.openai.com/tokenizer](https://platform.openai.com/tokenizer) | Visualiseur officiel de tokens OpenAI |

### Cours universitaires associés

| Cours | Institution | Lien |
|---|---|---|
| CS224N: NLP with Deep Learning | Stanford | [web.stanford.edu/class/cs224n](https://web.stanford.edu/class/cs224n/) |
| 11-711: Advanced NLP | CMU | [phontron.com/class/anlp2024](https://www.phontron.com/class/anlp2024/) |

---

## Évaluation

**Option A — Réflexion écrite (individuel, 300 mots) :**
Décrivez un élément de la tokenisation qui vous a surpris, en vous appuyant sur vos expériences dans LLMxRay (incluez des captures d'écran).

**Option B — Analyse de données (individuel ou en binôme, 1 page) :**
Tokenisez le même paragraphe dans 4 langues ou plus à l'aide du HuggingFace Tokenizer Playground. Présentez un tableau des nombres de tokens, calculez les ratios par rapport à l'anglais et discutez des implications en termes d'équité.

**Option C — Présentation (groupes de 2-3, 5 minutes) :**
Concevez et présentez un "défi de tokenisation" — une tâche que les LLM devraient pouvoir accomplir mais ne peuvent pas à cause des frontières de tokens. Faites-en la démonstration en direct dans LLMxRay et expliquez pourquoi le tokenizer est le goulot d'étranglement.

---

## La suite

Dans le **[Module 2 : Comment fonctionne la température ?](./module-2)**, vous utiliserez ce que vous avez appris sur les tokens pour comprendre comment le modèle *choisit* entre eux. La température contrôle la distribution de probabilité sur le vocabulaire — et vous découvrirez que ce n'est pas un curseur linéaire mais une transition de phase.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 1 sur 8** du Kit Enseignants LLMxRay
[Retour au programme](./index) | [Suivant : Module 2 — Comment fonctionne la température ? &rarr;](./module-2)

</div>
