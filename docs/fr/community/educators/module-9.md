# Module 9 : Ce que coûtent les mots

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**Le Linguiste** — Découvrez le coût caché de la langue

**Durée :** 60 min | **Difficulté :** Intermédiaire | **Prérequis :** [Module 1 (Qu'est-ce qu'un token ?)](./module-1), [Module 4 (Que voit le modèle ?)](./module-4)

</div>

## Le Moment Eureka

> La même phrase coûte 3x plus de tokens en arabe qu'en anglais — non pas parce qu'elle est plus longue, mais parce que le tokenizer a été entraîné principalement sur de l'anglais. Cette taxe invisible affecte la longueur du contexte, la vitesse et la qualité pour des milliards de locuteurs non anglophones.

Les modèles de langage ne traitent pas le texte directement. Ils le font d'abord passer par un tokenizer — un algorithme de compression qui découpe le texte en morceaux de sous-mots. L'algorithme le plus courant, le Byte Pair Encoding (BPE), apprend ses règles de fusion à partir du corpus d'entraînement qu'on lui fournit. Quand ce corpus est composé à 80-90 % d'anglais, le tokenizer devient extrêmement efficace pour compresser les mots anglais en tokens compacts. Les mots anglais courants comme "the", "hello" ou "information" deviennent chacun un seul token. Mais le même tokenizer, face à du texte arabe, hindi ou chinois, n'a jamais appris les règles de fusion pour ces écritures. Il retombe sur un encodage octet par octet ou caractère par caractère, produisant trois à cinq fois plus de tokens pour le même contenu sémantique.

Ce n'est pas un choix de conception délibéré. Personne n'a décidé que l'arabe devrait coûter plus cher. C'est une conséquence statistique du déséquilibre des données d'entraînement — et cela a des conséquences réelles. Plus de tokens signifie moins de place dans la fenêtre de contexte, une génération plus lente, des coûts d'API plus élevés, et dans de nombreux cas une qualité de sortie inférieure. Le biais de tokenisation est invisible pour les utilisateurs : le prompt a la même longueur apparente à l'écran quelle que soit la langue. Mais à l'intérieur du modèle, la charge de calcul est radicalement différente. LLMxRay rend cette taxe invisible visible.

---

## Contexte Conceptuel

### Qu'est-ce que le biais de tokenisation ?

Les tokenizers BPE construisent leur vocabulaire en fusionnant itérativement les paires de caractères les plus fréquentes dans les données d'entraînement. Après des milliers d'opérations de fusion, les séquences anglaises courantes comme "tion", "ing" et "the" deviennent des tokens uniques. Le tokenizer a effectivement appris à compresser l'anglais efficacement parce qu'il en a vu beaucoup pendant l'entraînement.

Les langues sous-représentées dans le corpus d'entraînement ne bénéficient jamais de cette compression. Les caractères arabes, l'écriture devanagari, les idéogrammes CJK — ceux-ci sont fusionnés moins fréquemment ou pas du tout. Quand le tokenizer les rencontre au moment de l'inférence, il retombe sur un encodage en octets UTF-8 bruts. Un seul caractère arabe représentant un morphème complet peut devenir trois ou quatre tokens. Un seul caractère chinois portant autant de sens qu'un mot anglais peut devenir deux ou trois tokens.

Ce n'est pas un bug dans l'algorithme. Le BPE fait exactement ce pour quoi il a été conçu : compresser les motifs fréquents. Le biais vient des données, pas de l'algorithme. Mais l'effet est le même : un désavantage structurel pour chaque langue qui n'était pas bien représentée dans le jeu d'entraînement du tokenizer.

![Comment fonctionne le biais de tokenisation](/educators/fr/tokenizer-bias-pipeline.svg)

### La taxe de tokens

Prenons un exemple concret. Le mot anglais "Hello" est un seul token dans la plupart des tokenizers modernes. L'équivalent arabe, "مرحبا", fait typiquement cinq tokens — chaque caractère encodé séparément parce que le tokenizer n'a jamais appris à fusionner les séquences de caractères arabes. La phrase anglaise "The weather is nice today" pourrait coûter six tokens. Le même sens en arabe, "الطقس جميل اليوم", pourrait coûter dix-huit tokens.

C'est la "taxe de tokens" — une surtaxe cachée que les locuteurs non anglophones paient pour chaque interaction avec un modèle de langage. Cette taxe se répercute sur chaque dimension d'utilisation du modèle :

- **Fenêtre de contexte** : une fenêtre de 4 096 tokens contient environ 3 000 mots d'anglais mais seulement 1 000 mots de contenu arabe
- **Latence** : plus de tokens signifie plus de passes en avant à travers le mécanisme d'attention, augmentant le temps jusqu'au premier token et réduisant les tokens par seconde
- **Coût API** : les API commerciales facturent au token — les utilisateurs arabes paient trois fois plus pour la même conversation
- **Qualité** : les modèles qui ont vu moins de données d'entraînement dans une langue produisent une sortie de moindre qualité dans cette langue, et le nombre de tokens gonflé signifie moins de place pour la réponse du modèle

![La taxe de tokens à travers les langues](/educators/fr/token-tax-comparison.svg)

### Pourquoi c'est important

La taxe de tokens n'est pas une préoccupation abstraite d'équité. Elle a des conséquences concrètes d'ingénierie qui affectent des milliards de personnes.

Un développeur construisant un chatbot pour des locuteurs arabes fait face à un paysage de contraintes fondamentalement différent de celui qui construit pour des locuteurs anglais. La même fenêtre de contexte de 4 096 tokens qui contient confortablement un prompt système, un historique de conversation et une réponse en anglais devient sévèrement étriquée en arabe. Le prompt système seul pourrait consommer un tiers du budget. Ajoutez quelques tours d'historique de conversation et il reste à peine de la place pour que le modèle génère une réponse utile.

Le problème se compose avec la rareté des données. Les langues sous-représentées dans les données d'entraînement du tokenizer sont généralement aussi sous-représentées dans les données de préentraînement du modèle. Donc non seulement l'arabe coûte plus de tokens — le modèle a aussi vu moins de texte arabe pendant l'entraînement, ce qui le rend moins compétent en arabe. La taxe de tokens et l'écart de qualité se renforcent mutuellement : une pire tokenisation signifie une utilisation moins efficace de la fenêtre de contexte, ce qui signifie une sortie de moindre qualité, ce qui fait paraître la langue encore plus difficile pour le modèle.

Pour les systèmes de génération augmentée par la recherche (RAG), l'impact est encore plus sévère. Si vos documents récupérés sont dans une langue à coût élevé en tokens, moins de fragments tiennent dans la fenêtre de contexte, réduisant la quantité d'informations pertinentes que le modèle peut voir avant de générer sa réponse.

![La fenêtre de contexte rétrécit pour les non-anglophones](/educators/fr/context-shrink.svg)

### Peut-on y remédier ?

Plusieurs approches tentent de réduire le biais de tokenisation :

**Les tokenizers multilingues.** SentencePiece et les modèles Unigram peuvent être entraînés sur des corpus multilingues équilibrés. Des modèles comme mT5 et BLOOM ont utilisé des tokenizers entraînés sur des données de plus de 100 langues, produisant des comptages de tokens plus équitables entre les écritures. Le compromis : un vocabulaire plus large est nécessaire pour représenter efficacement de nombreuses langues, ce qui signifie une matrice d'embedding plus grande, ce qui signifie plus de mémoire GPU.

**Les modèles spécifiques à une langue.** AceGPT pour l'arabe, Yi pour le chinois et Sarvam pour l'hindi utilisent des tokenizers entraînés principalement sur leur langue cible. Ces modèles atteignent une efficacité de tokenisation proche de l'anglais pour leur langue — mais uniquement pour cette langue. On échange la capacité multilingue contre l'efficacité monolingue.

**Des données d'entraînement équilibrées.** La solution la plus directe est d'entraîner le tokenizer sur un corpus qui représente toutes les langues cibles proportionnellement. Des projets comme le jeu de données ROOTS de BigScience et l'initiative "No Language Left Behind" de Meta travaillent vers cet objectif. Mais la représentation proportionnelle est elle-même une question — chaque langue devrait-elle avoir un poids égal, ou le poids devrait-il refléter la population de locuteurs, la présence sur internet, ou une autre métrique ?

**L'expansion du vocabulaire.** Certains chercheurs proposent d'ajouter des tokens spécifiques à une langue à un vocabulaire existant sans réentraîner depuis zéro. Cela peut améliorer l'efficacité pour les langues sous-représentées, mais les nouveaux tokens commencent avec des embeddings aléatoires qui doivent être affinés, et le vocabulaire élargi augmente la taille du modèle.

Aucune solution parfaite n'existe encore. Chaque approche implique des compromis entre taille du vocabulaire, taille du modèle, coût d'entraînement et équité multilingue. Mais la prise de conscience est la première étape. Si vous pouvez mesurer le biais — et LLMxRay vous permet de le mesurer directement — vous pouvez prendre des décisions éclairées sur le choix du modèle, le budget de contexte et la conception des prompts pour vos langues cibles.

---

## Exercices Pratiques

### Exercice 1 : Le compteur de tokens

**Ce qu'il faut faire :**

1. Ouvrez la page **Compare** de LLMxRay
2. Sélectionnez le preset **Language Compare**
3. Tapez le prompt suivant : `The weather is nice today`
4. Le système détectera l'anglais. Quand la fenêtre de conflit apparaît, sélectionnez **Français** et **Arabe** comme langues cibles de traduction
5. Lancez la comparaison dans les trois langues avec le même modèle
6. Enregistrez le **nombre de tokens du prompt** pour chaque langue depuis la ComparisonMetricsBar

**Ce que vous allez découvrir :**

La même phrase de six mots produit des comptages de tokens radicalement différents selon la langue. Calculez le ratio : combien de fois plus de tokens l'arabe nécessite-t-il par rapport à l'anglais ? Et le français ? Le français, en tant que langue à écriture latine, devrait se situer quelque part entre l'anglais et l'arabe — il partage une grande partie du même jeu de caractères que l'anglais mais utilise des caractères accentués et des mots plus longs.

::: tip Pourquoi Language Compare ?
Le preset Language Compare gère automatiquement la traduction et exécute le même modèle sur chaque variante linguistique dans des conditions identiques. Cela élimine la qualité de traduction comme variable — le sens est maintenu constant tandis que la langue change.
:::

---

### Exercice 2 : Le rétrécissement du contexte

**Ce qu'il faut faire :**

1. Avec le contexte réglé à **4 096 tokens**, préparez un paragraphe d'environ 500 mots en anglais
2. Collez-le dans la page **Compare** avec le preset **Language Compare** sélectionné
3. Après la traduction et l'exécution, vérifiez le **nombre de tokens du prompt** pour chaque langue (anglais, français, arabe)
4. Pour chaque langue, calculez :
   - Quel pourcentage du budget de 4 096 tokens le prompt consomme-t-il ?
   - Combien de tokens restent pour la réponse du modèle ?
   - Si le prompt système utilise 200 tokens, quel est le contexte restant effectif ?

**Ce que vous allez découvrir :**

Un paragraphe de 500 mots en anglais pourrait utiliser environ 600 tokens (environ 15 % du budget). Le même contenu en arabe pourrait utiliser 1 800 tokens (44 % du budget). Après avoir pris en compte le prompt système, l'utilisateur arabe dispose d'environ la moitié de l'espace de réponse dont bénéficie l'utilisateur anglais. C'est le rétrécissement du contexte en action — la même information, le même modèle, la même fenêtre de contexte, mais une expérience utilisateur radicalement différente.

---

### Exercice 3 : Le test de vitesse

**Ce qu'il faut faire :**

1. Choisissez un prompt de longueur modérée (2-3 phrases)
2. Exécutez-le via **Compare** avec le preset **Language Compare** dans trois langues : anglais, français et arabe
3. Utilisez le **même modèle** pour les trois
4. Depuis le panneau de métriques, enregistrez pour chaque langue :
   - **TTFT** (Time to First Token — temps jusqu'au premier token)
   - **Tokens par seconde** (vitesse de génération)
   - **Temps de génération total**

**Ce que vous allez découvrir :**

Plus de tokens signifie plus de calcul. Le mécanisme d'attention croît de manière quadratique avec la longueur de séquence dans les transformers standards, donc un prompt 3x plus long en tokens ne prend pas juste 3x plus de temps — il peut prendre significativement plus. Comparez le TTFT entre les langues : le modèle est-il plus lent à commencer à générer quand le prompt contient plus de tokens ? Comparez les tokens par seconde : même si la réponse arabe génère plus de tokens, ces tokens sont-ils produits au même rythme ? La différence de vitesse est une autre dimension de la taxe de tokens qui affecte les applications en temps réel comme les chatbots et les assistants vocaux.

---

### Exercice 4 : Le test d'égalité des embeddings

**Ce qu'il faut faire :**

1. Allez sur la page **Embeddings**
2. Ouvrez le **Calculateur de similarité**
3. Dans **Texte A**, entrez : `I love this movie`
4. Dans **Texte B**, entrez : `أحب هذا الفيلم`
5. Générez les embeddings et vérifiez le score de **cosine similarity**
6. Essayez des paires supplémentaires :
   - `The cat sat on the mat` / `جلست القطة على الحصيرة`
   - `Machine learning is transforming healthcare` / `التعلم الآلي يحول الرعاية الصحية`

**Ce que vous allez découvrir :**

Malgré les chemins de tokenisation radicalement différents — l'anglais compressé en tokens compacts, l'arabe fragmenté en morceaux au niveau des octets — le modèle d'embedding projette les deux phrases vers des points proches dans l'espace vectoriel. La cosine similarity devrait être élevée (0,7+), indiquant que le modèle a appris à extraire le sens indépendamment de la tokenisation de surface. Cela révèle quelque chose de profond : la tokenisation est une étape de compression avec perte, mais les couches plus profondes du modèle peuvent parfois récupérer l'efficacité perdue. Le sens survit au goulot d'étranglement de la tokenisation — mais le coût de calcul, non.

::: warning Modèle d'embedding requis
Vous avez besoin d'un modèle d'embedding installé dans Ollama (par ex. `nomic-embed-text` ou `bge-m3`). Le modèle multilingue `bge-m3` fonctionne le mieux pour les comparaisons interlinguistiques.
:::

---

## Points Clés

1. **Les tokenizers ont un biais linguistique hérité de la distribution des données d'entraînement.** Les règles de fusion BPE reflètent la fréquence dans le corpus — des données d'entraînement dominées par l'anglais produisent des tokenizers optimisés pour l'anglais. C'est une conséquence statistique, pas un choix de conception délibéré, mais l'effet est structurel.
2. **Les langues non anglophones paient une "taxe de tokens" — même sens, plus de tokens, moins de contexte.** Le texte arabe, hindi et chinois peut coûter 3 à 5 fois plus de tokens que l'anglais pour le même contenu sémantique. Cette taxe est invisible pour les utilisateurs mais réelle dans ses conséquences.
3. **La taxe de tokens affecte la fenêtre de contexte, la vitesse, la qualité de génération et le coût API.** Une fenêtre de contexte de 4 096 tokens est effectivement une fenêtre de 1 300 tokens pour les utilisateurs arabes. Plus de tokens signifie une inférence plus lente. Les API commerciales facturent au token quelle que soit la langue.
4. **Le preset Language Compare de LLMxRay rend cette taxe invisible visible.** En faisant passer le même sens à travers différentes langues dans des conditions contrôlées, vous pouvez mesurer directement la pénalité de tokenisation et ses effets en aval sur la latence et la consommation de contexte.
5. **Les tokenizers multilingues améliorent mais n'éliminent pas le biais — la prise de conscience compte.** SentencePiece, les données d'entraînement équilibrées et les modèles spécifiques à une langue aident tous. Mais aucune solution parfaite n'existe encore. Comprendre le biais est le prérequis pour l'atténuer dans vos propres systèmes.

---

## Questions de Discussion

1. Si vous construisiez un chatbot pour des locuteurs arabes, comment la taxe de tokens affecterait-elle vos décisions d'architecture (choix du modèle, taille du contexte, prompt engineering) ?
2. Les entreprises d'IA devraient-elles facturer au token de manière égale entre les langues, sachant que certaines langues coûtent intrinsèquement plus de tokens ? Est-ce équitable ?
3. Comment le biais de tokenisation se rapporte-t-il au problème plus large de la domination de l'anglais dans la recherche et le déploiement de l'IA ?
4. Un tokenizer multilingue "parfait" pourrait-il exister ? Quels compromis nécessiterait-il (taille du vocabulaire, taille du modèle, coût d'entraînement) ?
5. Comment le biais de tokenisation pourrait-il affecter les taux d'hallucination dans les langues sous-représentées ? (Lien avec le [Module 3](./module-3).)

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Language Model Tokenizers Introduce Unfairness Between Languages | Petrov et al. | 2023 | [arXiv:2305.15425](https://arxiv.org/abs/2305.15425) |
| All Languages Are Not Created (Tokenized) Equal | Ahia et al. | 2023 | [arXiv:2305.13707](https://arxiv.org/abs/2305.13707) |
| Tokenizer Choice For LLM Training | Rust et al. | 2021 | [arXiv:2012.15613](https://arxiv.org/abs/2012.15613) |
| No Language Left Behind | Costa-jussa et al. (Meta) | 2022 | [arXiv:2207.04672](https://arxiv.org/abs/2207.04672) |

### Tutoriels

| Ressource | Auteur | Lien |
|---|---|---|
| The Tokenizer Playground | HuggingFace | [huggingface.co/tokenizers](https://huggingface.co/spaces/Xenova/the-tokenizer-playground) |
| Understanding BPE Tokenization | Lilian Weng | [lilianweng.github.io](https://lilianweng.github.io/posts/2023-01-27-the-transformer-family-v2/) |

---

## Évaluation

**Option A — Rapport de données individuel (1 page) :**
Exécutez le preset Language Compare sur 4 langues ou plus en utilisant le même modèle et le même prompt. Documentez les ratios de tokens entre chaque langue et l'anglais, les différences de TTFT et la perte de contexte effective pour chaque langue. Calculez quel pourcentage d'un budget de 4 096 tokens chaque langue consomme pour le même contenu. Incluez des captures d'écran de LLMxRay montrant la ComparisonMetricsBar et les vues diff.

**Option B — Présentation en binôme (diaporama, 8-10 diapositives) :**
Comparez l'efficacité de tokenisation de 2 modèles différents sur 3 langues. Pour chaque combinaison modèle-langue, enregistrez le nombre de tokens du prompt, le TTFT et les tokens par seconde. Quel modèle a un écart linguistique plus faible ? Le modèle avec le meilleur tokenizer multilingue est-il aussi meilleur pour générer des réponses dans les langues non anglophones ? Présentez vos résultats avec des tableaux de données et des captures d'écran de LLMxRay.

**Option C — Article de politique de groupe (500 mots) :**
Concevez un modèle de "tarification équitable" pour un service d'API d'IA multilingue. La tarification devrait-elle tenir compte du biais de tokenisation ? Si une requête en arabe coûte 3x plus de tokens que la même requête en anglais, l'utilisateur arabe devrait-il payer 3x plus, le même montant, ou quelque chose entre les deux ? Justifiez votre modèle de tarification avec des données de vos expériences Language Compare. Considérez les perspectives du fournisseur d'API (les coûts de calcul sont réels), de l'utilisateur final (l'équité compte) et de la société (l'équité linguistique dans l'accès à l'IA).

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 9 sur 9** du Kit Enseignants LLMxRay
[&larr; Module 8 : La vue d'ensemble](./module-8) | [Retour au programme](./index)

</div>
