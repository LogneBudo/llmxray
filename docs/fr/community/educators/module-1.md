# Module 1 : Qu'est-ce qu'un token ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Observateur** — Voir l'invisible

**Duree :** 45 min | **Difficulte :** Debutant | **Prerequis :** Aucun

</div>

## Le Moment Eureka

> L'IA ne pense pas en mots. Elle pense en tokens. Et les tokens ne sont pas ce que vous imaginez.

C'est l'intuition fondamentale qui change tout dans la comprehension des modeles de langage par les etudiants. Chaque concept qui suit — temperature, fenetres de contexte, embeddings, tool calling — repose sur la comprehension de ce que sont reellement les tokens.

---

## Contexte Conceptuel

### Qu'est-ce qu'un token ?

Un **token** est la plus petite unite de texte traitee par un modele de langage. Les tokens ne sont ni des mots, ni des caracteres, ni des syllabes — ce sont des **unites sous-lexicales** determinees par un algorithme statistique entraine sur un large corpus.

L'algorithme dominant est le **Byte-Pair Encoding (BPE)**, introduit en NLP par Sennrich et al. (2016). Le BPE commence par les caracteres individuels et fusionne iterativement les paires adjacentes les plus frequentes jusqu'a atteindre une taille de vocabulaire cible (generalement 32 000 a 128 000 tokens).

Par exemple, le mot "understanding" pourrait etre tokenise ainsi :
- `["under", "stand", "ing"]` (3 tokens)

Tandis que "AI" pourrait donner :
- `["AI"]` (1 token — suffisamment courant pour constituer une entree unique)

### Pourquoi la tokenisation est-elle importante ?

Chaque aspect du comportement des LLM se mesure en tokens :

| Aspect | Impact des tokens |
|---|---|
| **Cout** | La tarification des API se fait au token |
| **Vitesse** | Les modeles generent un token par etape d'inference |
| **Fenetre de contexte** | Le nombre maximum de tokens que le modele peut voir en une fois |
| **Qualite** | Les frontieres de tokens affectent ce que le modele peut "voir" a l'interieur d'un mot |
| **Equite** | Les langues ayant moins de tokens dans le vocabulaire necessitent plus de tokens par phrase |

### Comment fonctionne le BPE (simplifie)

1. Commencer avec tous les octets individuels (256 tokens de base)
2. Compter toutes les paires adjacentes dans le corpus d'entrainement
3. Fusionner la paire la plus frequente en un nouveau token
4. Repeter jusqu'a atteindre la taille de vocabulaire cible

Cela signifie :
- Les mots courants deviennent des tokens uniques : `"the"`, `"and"`, `"is"`
- Les mots rares sont decomposes en morceaux : `"tokenization"` → `["token", "ization"]`
- Les mots tres rares sont reduits a des caracteres individuels

La famille LLaMA 3 utilise un tokenizer BPE avec un vocabulaire de 128 000 tokens, entraine principalement sur du texte anglais (Grattafiori et al., 2024).

---

## Exercices Pratiques

### Exercice 1 : Voir les tokens arriver en temps reel

**Ce qu'il faut faire :**

1. Ouvrez **Chat Diagnostics** dans LLMxRay et selectionnez un modele (ex. `llama3.2`)
2. Envoyez : *"Explain what gravity is in one sentence"*
3. Observez les tokens arriver un par un — chaque token apparait au fur et a mesure que le modele le produit
4. Ouvrez l'onglet **Stream** — voyez chaque token avec son horodatage et sa latence inter-token
5. Remarquez la **coloration de confiance** : les tokens verts sont arrives rapidement (confiance elevee), les tokens orange/rouges sont arrives lentement (confiance plus faible)

**Ce qu'il faut observer :**

- Les tokens ne sont pas toujours des mots complets. Vous verrez des mots partiels, de la ponctuation et des espaces comme tokens separes.
- Certains tokens arrivent presque instantanement (le modele etait tres certain). D'autres prennent plus de temps (le modele "choisissait" entre plusieurs options).
- Le premier token prend le plus de temps (Time to First Token / TTFT) — c'est le moment ou le modele traite l'integralite de votre prompt.

::: info Qu'est-ce que la coloration de confiance ?
LLMxRay estime la confiance des tokens a partir de la **latence inter-token**. Une generation plus rapide suggere que le modele avait une prediction dominante pour le token suivant. C'est une approximation pratique — pour une mesure de confiance mathematiquement precise, la fonctionnalite Benchmark utilise de vrais logprobs via l'endpoint compatible OpenAI. Voir le Module 3 pour l'histoire complete sur la confiance et la verite.
:::

---

### Exercice 2 : Le choc du tokenizer

**Ce qu'il faut faire :**

1. Dans le chat, demandez : *"Count the letters in the word 'strawberry'"*
2. Le modele dira probablement 10 — mais `strawberry` contient 10 lettres dont 3 r. Beaucoup de modeles comptent 2 r au lieu de 3.
3. Maintenant demandez : *"How many words are in this sentence: The quick brown fox jumps over the lazy dog"*
4. Le modele repond correctement (9 mots) — compter les mots est plus facile que compter les lettres

**Pourquoi cela se produit :**

Le mot `strawberry` est tokenise en quelque chose comme `["str", "aw", "berry"]` — le modele ne voit jamais les lettres individuelles. Il traite ces morceaux comme des unites atomiques. Compter les lettres necessite un raisonnement au niveau des caracteres, mais le modele opere au niveau des tokens.

Ce n'est pas un bug — c'est une consequence fondamentale de la tokenisation sous-lexicale. Le modele ne peut litteralement pas "voir" les lettres individuelles a l'interieur d'un token.

::: tip Essayez par vous-meme
Visitez le [playground Tiktokenizer](https://tiktokenizer.vercel.app/) ou le [HuggingFace Tokenizer Playground](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) pour visualiser comment differents modeles tokenisent le meme texte. Comparez comment `llama` et `gpt-4` tokenisent `"strawberry"` — ils peuvent le decouper differemment.
:::

**Contexte de recherche :** Fu et al. (2024) ont mene une etude systematique de ce phenomene dans leur article *"Why Do Large Language Models Struggle to Count Letters?"* Ils ont decouvert que les erreurs correlent fortement avec la frequence des lettres et la longueur des mots, et non avec la frequence d'apparition du mot dans les donnees d'entrainement — confirmant que la limitation est architecturale (tokenisation), et non un manque de connaissances.

---

### Exercice 3 : Le biais linguistique de la tokenisation

**Ce qu'il faut faire :**

1. Envoyez ce prompt au modele : *"Say hello in one sentence"*
2. Ouvrez l'onglet **Stream** et comptez les tokens dans la reponse
3. Maintenant envoyez : *"Dis bonjour en une phrase"* (la meme demande en francais)
4. Comptez a nouveau les tokens — la reponse en francais utilisera probablement plus de tokens
5. Essayez la meme chose en allemand, espagnol, chinois, arabe ou toute autre langue que vous connaissez
6. Notez le nombre de tokens pour chaque langue

**Ce que vous allez decouvrir :**

Le meme contenu semantique necessite **significativement plus de tokens** dans les langues autres que l'anglais. Ce n'est pas parce que le francais est "plus complexe" — c'est parce que le vocabulaire du tokenizer a ete construit principalement a partir de texte anglais.

| Langue | Ratio typique de tokens par rapport a l'anglais |
|---|---|
| Anglais | 1,0x (reference) |
| Francais | 1,3-1,5x |
| Allemand | 1,4-1,6x |
| Chinois | 1,5-2,0x |
| Arabe | 2,0-3,0x |
| Certaines langues africaines | Jusqu'a 5-15x |

**Pourquoi c'est important en pratique :**

- Un utilisateur francophone atteint la limite de la fenetre de contexte **30 a 50 % plus tot** qu'un utilisateur anglophone
- Les couts d'API sont **proportionnellement plus eleves** pour les langues non anglophones
- La generation est **plus lente** (plus de tokens a produire pour le meme contenu)
- La qualite peut se degrader parce que le modele dispose de moins de "tokens de reflexion"

::: warning Ceci est un domaine de recherche actif
Petrov et al. (2023) ont montre dans leur article NeurIPS *"Language Model Tokenizers Introduce Unfairness Between Languages"* que le meme texte peut necessiter jusqu'a **15x plus de tokens** dans certaines langues par rapport a l'anglais, sur 17 tokenizers differents. Ce n'est pas seulement une preoccupation theorique — cela a des implications reelles en termes de cout, de latence et de qualite.

Explorez leur [demo interactive](https://aleksandarpetrov.github.io/tokenization-fairness/) pour visualiser la disparite entre les langues.
:::

---

### Exercice 4 : Vitesse et confiance

**Ce qu'il faut faire :**

1. Menez plusieurs conversations avec le modele sur differents sujets
2. Pour chaque reponse, observez la coloration de confiance dans le flux de tokens
3. Remarquez les schemas recurrents :
   - Phrases courantes ("I think", "The answer is") → vert (rapide, confiant)
   - Termes techniques, chiffres, noms propres → plus orange (plus lent, moins certain)
   - Formulations creatives ou inhabituelles → orange/rouge majoritaire (le plus lent, le moins certain)
4. Ouvrez deux onglets Stream cote a cote (de sessions differentes) et comparez les distributions de latence

**Matiere a reflexion :**

- La vitesse (latence inter-token) est un **indicateur indirect** de la confiance, pas une mesure directe
- Le modele genere les continuations "evidentes" plus rapidement que les continuations surprenantes
- Cela reflete le fonctionnement de la distribution de probabilite softmax : lorsqu'un token a une probabilite nettement superieure aux alternatives, le calcul converge plus rapidement
- Pour une mesure de confiance **precise**, il faut les logprobs reels — que LLMxRay fournit via la fonctionnalite Benchmark (Module 3)

---

## Points Cles

1. **Les tokens sont l'unite atomique** du calcul des LLM — ni les mots, ni les caracteres
2. **La tokenisation BPE** cree un vocabulaire a partir de schemas statistiques, pas de regles linguistiques
3. **Les frontieres de tokens** determinent ce sur quoi le modele peut ou ne peut pas raisonner (comptage de lettres, manipulation de caracteres)
4. **Le biais linguistique** des tokenizers cree une inegalite mesurable en termes de cout, vitesse et qualite entre les langues
5. **La vitesse correle avec la confiance** mais n'est pas identique — c'est une approximation utile

---

## Questions de Discussion

Pour une discussion en classe ou en seminaire :

1. Si les tokenizers sont entraines sur des corpus a dominante anglophone, a quoi ressemblerait un tokenizer multilingue "equitable" ? Est-ce meme possible avec une taille de vocabulaire fixe ?
2. Le probleme du "strawberry" montre que les modeles ne peuvent pas raisonner sur les caracteres a l'interieur des tokens. Quelles autres taches apparemment simples pourraient etre affectees par les frontieres de tokens ?
3. Les entreprises d'IA devraient-elles divulguer le biais linguistique de leur tokenizer ? Comment cela changerait-il la facon dont les utilisateurs non anglophones interagissent avec l'IA ?
4. Si vous deviez concevoir un tokenizer pour un domaine specifique (medical, juridique, code), comment modifieriez-vous le processus d'entrainement ?

---

## Lectures Complementaires

### Articles academiques

| Article | Auteurs | Annee | Lien |
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
| HuggingFace Tokenizer Playground | [huggingface.co/spaces/Xenova](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) | Comparer la tokenisation entre modeles ouverts (LLaMA, Mistral, etc.) |
| OpenAI Tokenizer | [platform.openai.com/tokenizer](https://platform.openai.com/tokenizer) | Visualiseur officiel de tokens OpenAI |

### Cours universitaires associes

| Cours | Institution | Lien |
|---|---|---|
| CS224N: NLP with Deep Learning | Stanford | [web.stanford.edu/class/cs224n](https://web.stanford.edu/class/cs224n/) |
| 11-711: Advanced NLP | CMU | [phontron.com/class/anlp2024](https://www.phontron.com/class/anlp2024/) |

---

## Evaluation

**Option A — Reflexion ecrite (individuel, 300 mots) :**
Decrivez un element de la tokenisation qui vous a surpris, en vous appuyant sur vos experiences dans LLMxRay (incluez des captures d'ecran).

**Option B — Analyse de donnees (individuel ou en binome, 1 page) :**
Tokenisez le meme paragraphe dans 4 langues ou plus a l'aide du HuggingFace Tokenizer Playground. Presentez un tableau des nombres de tokens, calculez les ratios par rapport a l'anglais et discutez des implications en termes d'equite.

**Option C — Presentation (groupes de 2-3, 5 minutes) :**
Concevez et presentez un "defi de tokenisation" — une tache que les LLM devraient pouvoir accomplir mais ne peuvent pas a cause des frontieres de tokens. Faites-en la demonstration en direct dans LLMxRay et expliquez pourquoi le tokenizer est le goulot d'etranglement.

---

## La suite

Dans le **[Module 2 : Comment fonctionne la temperature ?](./module-2)**, vous utiliserez ce que vous avez appris sur les tokens pour comprendre comment le modele *choisit* entre eux. La temperature controle la distribution de probabilite sur le vocabulaire — et vous decouvrirez que ce n'est pas un curseur lineaire mais une transition de phase.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 1 sur 8** du Kit Enseignants LLMxRay
[Retour au programme](./index) | [Suivant : Module 2 — Comment fonctionne la temperature ? &rarr;](./module-2)

</div>
