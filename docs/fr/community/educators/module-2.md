# Module 2 : Comment fonctionne la Température ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Expérimentateur** — Trouvez la transition de phase

**Durée :** 60 min | **Difficulté :** Débutant | **Prérequis :** [Module 1](./module-1)

</div>

## Le Moment Eureka

> La température n'est pas un curseur de créativité — c'est une redistribution de probabilités. Et elle ne se dégrade pas progressivement. Il y a un précipice.

Les étudiants découvrent que la température contrôle une transformation mathématique de la distribution de probabilités sur le vocabulaire. De petits changements près du précipice produisent des variations de qualité spectaculaires — une transition de phase, pas une échelle linéaire.

![How Temperature Reshapes the Probability Distribution](/educators/fr/temperature-distribution.svg)

---

## Contexte Conceptuel

### Ce que la température fait réellement

Après que le modèle a calculé un score (logit) pour chaque token du vocabulaire, ces scores passent par une **fonction softmax** pour produire des probabilités. La température modifie ce softmax :

**Softmax standard :**
```
P(token_i) = exp(z_i) / sum_j exp(z_j)
```

**Softmax avec température T :**
```
P(token_i) = exp(z_i / T) / sum_j exp(z_j / T)
```

L'effet :
- **T &lt; 1** — Divise les logits par un nombre inférieur à 1, rendant les logits élevés encore plus grands par rapport aux petits. La distribution devient **plus pointue** (plus concentrée). Le token dominant l'emporte.
- **T = 1** — Aucune modification. La distribution est telle que le modèle l'a calculée.
- **T &gt; 1** — Divise les logits par un nombre supérieur à 1, comprimant tous les logits vers zéro. La distribution devient **plus plate** (plus uniforme). Tous les tokens deviennent à peu près équiprobables.
- **T → 0** — La distribution s'effondre en un seul point. Seul le token avec le logit le plus élevé a une probabilité non nulle. C'est le **greedy decoding**.

### Pourquoi c'est important

La température est le paramètre le plus couramment ajusté lors de l'utilisation des LLM, mais elle est largement mal comprise. On la décrit souvent comme "créativité vs précision" — mais c'est une simplification. Ce qu'elle contrôle réellement, c'est l'**entropie de la distribution d'échantillonnage**.

Entropie basse = sortie prévisible et répétitive. Entropie élevée = sortie diverse et surprenante, mais potentiellement incohérente. Le bon réglage dépend entièrement de la tâche.

### La transition de phase

Contrairement à un bouton de volume qui passe progressivement de silencieux à fort, la température présente une **transition de phase**. La qualité de sortie reste élevée sur une large plage (T=0 à T≈0.8-1.0), puis chute brutalement dans une bande étroite. Cela s'explique par :

1. À basses températures, le token dominant a une probabilité si élevée que l'échantillonnage est quasi déterministe dans tous les cas
2. À températures modérées, les 3 à 5 premiers tokens se partagent l'essentiel de la probabilité — des choix encore raisonnables
3. À un point critique, suffisamment de probabilité fuit vers des tokens improbables pour que le modèle commence à générer du texte incohérent
4. Au-delà du précipice, la sortie devient essentiellement aléatoire

![The Temperature Cliff](/educators/fr/temperature-cliff.svg)

### Autres méthodes de sampling

La température n'est pas la seule façon de contrôler la sélection de tokens. Les LLM modernes prennent en charge plusieurs stratégies de sampling qui peuvent être combinées :

![Sampling Methods Compared](/educators/fr/sampling-methods.svg)

| Méthode | Ce qu'elle fait | Quand l'utiliser |
|---|---|---|
| **Greedy (T=0)** | Choisit toujours le token de plus haute probabilité | Réponses factuelles, sortie déterministe |
| **Temperature** | Remodèle la distribution de probabilités | Contrôle polyvalent de la variété des sorties |
| **Top-k** | Échantillonne uniquement parmi les k tokens de plus haute probabilité | Contrôle de diversité simple, ensemble de candidats fixe |
| **Top-p (nucleus)** | Échantillonne parmi le plus petit ensemble de tokens dont la probabilité cumulée dépasse p | Diversité adaptative — plus d'options en cas d'incertitude, moins en cas de confiance |
| **Min-p** | Supprime les tokens dont la probabilité est inférieure à une fraction du token dominant | Alternative plus récente à top-p, seuil plus intuitif |
| **Mirostat** | Ajuste dynamiquement le sampling pour maintenir une perplexité cible | Niveau de "surprise" constant quel que soit le contexte |
| **Pénalité de répétition** | Réduit la probabilité des tokens récemment générés | Empêche les boucles et le texte répétitif |

::: info Ces méthodes se composent
En pratique, plusieurs méthodes sont appliquées en séquence : la température d'abord (remodèle la distribution), puis top-k ou top-p (tronque la distribution), puis l'échantillonnage parmi ce qui reste. La fonctionnalité Compare de LLMxRay vous permet de tester différentes combinaisons côte à côte.
:::

---

## Exercices Pratiques

### Exercice 1 : Le balayage de température

**Ce qu'il faut faire :**

1. Ouvrez **Compare** dans LLMxRay
2. Cliquez sur le preset **Temperature Sweep** — cela crée 3 emplacements avec des températures de 0.2, 0.7 et 1.2
3. Ajoutez un 4e emplacement manuellement et réglez-le à 2.0
4. Utilisez ce prompt : *"Write a function in Python to check if a number is prime"*
5. Cliquez sur **Run All** et observez les 4 générer simultanément
6. Comparez les résultats en **Grid View**

**Ce qu'il faut observer :**

- **T=0.2** : Implémentation propre et standard. Quasi identique si vous la relancez.
- **T=0.7** : Légères variations dans les noms de variables ou les commentaires. Toujours correct.
- **T=1.2** : Approches plus créatives (peut-être un algorithme différent), mais attention aux bugs subtils.
- **T=2.0** : Les noms de variables deviennent étranges, des erreurs de logique apparaissent, potentiellement incomplet.

Passez en **Diff View** pour voir exactement quels mots ont changé entre les sorties.

**Question clé :** Entre quelles deux températures la chute de qualité vous semble-t-elle la plus marquée ?

---

### Exercice 2 : Trouver le précipice

**Ce qu'il faut faire :**

1. Restez dans **Compare**. Configurez 4 emplacements avec les températures : 0.7, 0.9, 1.1, 1.3
2. Prompt : *"Write a function in Python to check if a number is prime"*
3. Exécutez 3 fois. Pour chaque exécution, notez si chaque emplacement a produit du code correct (Oui/Non)
4. Consignez vos résultats dans un tableau :

| Température | Exec 1 | Exec 2 | Exec 3 | Taux de réussite |
|---|---|---|---|---|
| 0.7 | | | | /3 |
| 0.9 | | | | /3 |
| 1.1 | | | | /3 |
| 1.3 | | | | /3 |

5. Le précipice se situe là où le taux de réussite chute brutalement — généralement entre T=0.9 et T=1.2

**Pourquoi c'est important :**

Cela démontre que la température n'est pas un compromis linéaire. Il y a une **bande étroite** où la sortie passe de "presque toujours correcte" à "généralement fausse". Trouver ce précipice pour votre modèle et votre tâche spécifiques est l'une des compétences les plus pratiques en prompt engineering.

---

### Exercice 3 : Température vs type de tâche

**Ce qu'il faut faire :**

1. Configurez 2 emplacements : tous deux avec le même modèle, l'un à T=0.2, l'autre à T=1.0
2. **Prompt factuel :** *"What is the capital of France?"*
   - Exécutez-le. Les deux devraient répondre "Paris." La basse température n'apporte rien ici.
3. **Prompt créatif :** *"Write a haiku about debugging code at midnight"*
   - Exécutez-le 3 fois. Comparez la variété.
   - À T=0.2, vous obtiendrez quasiment le même haiku à chaque fois.
   - À T=1.0, vous obtiendrez des expressions créatives véritablement différentes.
4. **Prompt de raisonnement :** *"A farmer has 15 sheep. All but 8 run away. How many sheep does the farmer have left?"*
   - C'est une question piège (réponse : 8, pas 7). Testez aux deux températures.
   - La température affecte-t-elle la précision du raisonnement ?

**Discussion :** Pourquoi n'y a-t-il pas de température "idéale" unique ? Quelle température choisiriez-vous pour :
- Un chatbot de support client ?
- Un assistant d'écriture créative ?
- Un outil de complétion de code ?
- Un système d'information médicale ?

---

### Exercice 4 : Déterminisme et seeds

**Ce qu'il faut faire :**

1. Dans **Compare**, utilisez le preset **Deterministic Pair** — deux emplacements avec le même modèle, les mêmes paramètres, le même seed, T=0
2. Exécutez le même prompt 3 fois
3. Toutes les sorties devraient être **identiques** — le seed rend le générateur de nombres aléatoires reproductible
4. Maintenant changez un emplacement à T=0.7 (gardez le même seed)
5. Exécutez à nouveau 3 fois — les sorties différeront désormais entre les exécutions

**Ce que cela révèle :**

- À T=0 (greedy), le seed n'a pas d'importance — il n'y a pas d'aléatoire à contrôler
- À T>0, le seed contrôle quel chemin aléatoire est emprunté dans la distribution
- Même seed + même température = aléatoire reproductible
- C'est ainsi que les chercheurs assurent la reproductibilité des expériences tout en utilisant le décodage stochastique

::: tip Pourquoi la reproductibilité est importante
En recherche et en production, vous devez pouvoir reproduire des sorties spécifiques pour le débogage, la comparaison et l'audit. Fixer un seed avec une température modérée vous donne une **variété contrôlée** — différente du greedy (toujours identique) mais reproductible quand nécessaire.
:::

---

## Points Clés

1. **La température est une opération mathématique** — elle divise les logits par T avant le softmax, remodelant la distribution de probabilités
2. **Le précipice est réel** — la qualité ne se dégrade pas linéairement ; il y a une transition brusque où la sortie passe de fiable à chaotique
3. **Il n'y a pas de température universellement optimale** — la valeur idéale dépend de la tâche (factuelle, créative, raisonnement)
4. **La température se compose avec d'autres méthodes** — top-k, top-p et la pénalité de répétition fonctionnent conjointement avec la température
5. **Les seeds permettent la reproductibilité** — seed fixe + température fixe = même sortie à chaque fois

---

## Questions de Discussion

1. Si une entreprise déploie un chatbot à T=0 pour la sécurité, que perd-elle ? Une sortie déterministe est-elle toujours "plus sûre" ?
2. La position du précipice varie selon le modèle. Pourquoi un modèle de 70B paramètres pourrait-il avoir une température de précipice plus élevée qu'un modèle de 3B ?
3. Les assistants d'écriture créative utilisent souvent T=0.8-1.0. Mais à qui appartient la créativité — à l'utilisateur ou au modèle ? La température change-t-elle cela ?
4. Si vous ne pouviez ajuster qu'un seul paramètre (température, top-k ou top-p), lequel choisiriez-vous et pourquoi ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| The Curious Case of Neural Text Degeneration | Holtzman, Buys, Du, Forbes, Choi | 2019 | [arXiv:1904.09751](https://arxiv.org/abs/1904.09751) |
| Hierarchical Neural Story Generation | Fan, Lewis, Dauphin | 2018 | [arXiv:1805.04833](https://arxiv.org/abs/1805.04833) |
| Mirostat: A Neural Text Decoding Algorithm | Basu, Anay, Tan, Yarin | 2020 | [arXiv:2007.14966](https://arxiv.org/abs/2007.14966) |
| Attention Is All You Need | Vaswani et al. | 2017 | [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) |

### Tutoriels et explications

| Ressource | Auteur | Lien |
|---|---|---|
| Sampling Parameters Explained: Intuition to Math | Let's Data Science | [letsdatascience.com](https://letsdatascience.com/blog/llm-sampling-temperature-top-k-top-p-and-min-p-explained) |
| Generation Configurations: Temperature, Top-k, Top-p | Chip Huyen | [huyenchip.com](https://huyenchip.com/2024/01/16/sampling.html) |
| Token Sampling Methods Primer | Aman.ai | [aman.ai/primers/ai/token-sampling](https://aman.ai/primers/ai/token-sampling/) |
| The Illustrated Transformer | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-transformer/) |

### Concepts clés

**Le nucleus sampling (top-p)** a été introduit par Holtzman et al. (2019) en réponse à l'observation que le sampling standard avec température produit un texte soit trop générique (basse T) soit trop aléatoire (haute T). Leur idée : plutôt qu'une température fixe, tronquer la distribution au plus petit ensemble de tokens couvrant un seuil de probabilité cumulée. Cela s'adapte automatiquement — quand le modèle est confiant, moins de tokens sont considérés ; quand il est incertain, davantage d'options restent disponibles.

**Mirostat** (Basu et al., 2020) va plus loin en ciblant un niveau de perplexité spécifique plutôt qu'une forme de distribution fixe. Il ajuste dynamiquement le sampling pour maintenir un niveau de "surprise" constant, que le modèle génère une expression prévisible ou navigue en territoire incertain.

---

## Évaluation

**Option A — Collecte de données (individuel, 1 page) :**
Effectuez l'expérience de recherche du précipice (Exercice 2) avec 5 valeurs de température et 5 exécutions chacune. Présentez un tableau et un graphique linéaire du taux de réussite en fonction de la température. Identifiez le point de précipice pour votre modèle.

**Option B — Analyse comparative (en binôme, 1 page) :**
Testez le même prompt pour 3 types de tâches (factuelle, créative, raisonnement) à 4 températures. Pour chaque combinaison, évaluez la qualité de sortie sur une échelle de 1 à 5. Présentez une heatmap et recommandez les températures optimales par type de tâche.

**Option C — Explication technique (individuel, 500 mots) :**
Expliquez à un chef de produit non technique pourquoi son chatbot ne devrait PAS utiliser T=0, malgré le fait que ce soit "l'option la plus sûre". Utilisez des exemples concrets tirés de vos expériences.

---

## La suite

Dans le **[Module 3 : L'IA peut-elle mentir ?](./module-3)**, vous utiliserez ce que vous avez appris sur les distributions de probabilités pour comprendre la **confiance vs la vérité**. Un modèle peut attribuer 95 % de probabilité à la mauvaise réponse — et vous découvrirez pourquoi grâce aux benchmarks avec de vrais logprobs.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 2 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 1 : Qu'est-ce qu'un token ?](./module-1) | [Retour au programme](./index) | [Module 3 : L'IA peut-elle mentir ? &rarr;](./module-3)

</div>
