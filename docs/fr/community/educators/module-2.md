# Module 2 : Comment fonctionne la Temperature ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Experimentateur** — Trouvez la transition de phase

**Duree :** 60 min | **Difficulte :** Debutant | **Prerequis :** [Module 1](./module-1)

</div>

## Le Moment Eureka

> La temperature n'est pas un curseur de creativite — c'est une redistribution de probabilites. Et elle ne se degrade pas progressivement. Il y a un precipice.

Les etudiants decouvrent que la temperature controle une transformation mathematique de la distribution de probabilites sur le vocabulaire. De petits changements pres du precipice produisent des variations de qualite spectaculaires — une transition de phase, pas une echelle lineaire.

![How Temperature Reshapes the Probability Distribution](/educators/temperature-distribution.svg)

---

## Contexte Conceptuel

### Ce que la temperature fait reellement

Apres que le modele a calcule un score (logit) pour chaque token du vocabulaire, ces scores passent par une **fonction softmax** pour produire des probabilites. La temperature modifie ce softmax :

**Softmax standard :**
```
P(token_i) = exp(z_i) / sum_j exp(z_j)
```

**Softmax avec temperature T :**
```
P(token_i) = exp(z_i / T) / sum_j exp(z_j / T)
```

L'effet :
- **T &lt; 1** — Divise les logits par un nombre inferieur a 1, rendant les logits eleves encore plus grands par rapport aux petits. La distribution devient **plus pointue** (plus concentree). Le token dominant l'emporte.
- **T = 1** — Aucune modification. La distribution est telle que le modele l'a calculee.
- **T &gt; 1** — Divise les logits par un nombre superieur a 1, comprimant tous les logits vers zero. La distribution devient **plus plate** (plus uniforme). Tous les tokens deviennent a peu pres equiprobables.
- **T → 0** — La distribution s'effondre en un seul point. Seul le token avec le logit le plus eleve a une probabilite non nulle. C'est le **greedy decoding**.

### Pourquoi c'est important

La temperature est le parametre le plus couramment ajuste lors de l'utilisation des LLM, mais elle est largement mal comprise. On la decrit souvent comme "creativite vs precision" — mais c'est une simplification. Ce qu'elle controle reellement, c'est l'**entropie de la distribution d'echantillonnage**.

Entropie basse = sortie previsible et repetitive. Entropie elevee = sortie diverse et surprenante, mais potentiellement incoherente. Le bon reglage depend entierement de la tache.

### La transition de phase

Contrairement a un bouton de volume qui passe progressivement de silencieux a fort, la temperature presente une **transition de phase**. La qualite de sortie reste elevee sur une large plage (T=0 a T≈0.8-1.0), puis chute brutalement dans une bande etroite. Cela s'explique par :

1. A basses temperatures, le token dominant a une probabilite si elevee que l'echantillonnage est quasi deterministe dans tous les cas
2. A temperatures moderees, les 3 a 5 premiers tokens se partagent l'essentiel de la probabilite — des choix encore raisonnables
3. A un point critique, suffisamment de probabilite fuit vers des tokens improbables pour que le modele commence a generer du texte incoherent
4. Au-dela du precipice, la sortie devient essentiellement aleatoire

![The Temperature Cliff](/educators/temperature-cliff.svg)

### Autres methodes de sampling

La temperature n'est pas la seule facon de controler la selection de tokens. Les LLM modernes prennent en charge plusieurs strategies de sampling qui peuvent etre combinees :

![Sampling Methods Compared](/educators/sampling-methods.svg)

| Methode | Ce qu'elle fait | Quand l'utiliser |
|---|---|---|
| **Greedy (T=0)** | Choisit toujours le token de plus haute probabilite | Reponses factuelles, sortie deterministe |
| **Temperature** | Remodele la distribution de probabilites | Controle polyvalent de la variete des sorties |
| **Top-k** | Echantillonne uniquement parmi les k tokens de plus haute probabilite | Controle de diversite simple, ensemble de candidats fixe |
| **Top-p (nucleus)** | Echantillonne parmi le plus petit ensemble de tokens dont la probabilite cumulee depasse p | Diversite adaptative — plus d'options en cas d'incertitude, moins en cas de confiance |
| **Min-p** | Supprime les tokens dont la probabilite est inferieure a une fraction du token dominant | Alternative plus recente a top-p, seuil plus intuitif |
| **Mirostat** | Ajuste dynamiquement le sampling pour maintenir une perplexite cible | Niveau de "surprise" constant quel que soit le contexte |
| **Penalite de repetition** | Reduit la probabilite des tokens recemment generes | Empeche les boucles et le texte repetitif |

::: info Ces methodes se composent
En pratique, plusieurs methodes sont appliquees en sequence : la temperature d'abord (remodele la distribution), puis top-k ou top-p (tronque la distribution), puis l'echantillonnage parmi ce qui reste. La fonctionnalite Compare de LLMxRay vous permet de tester differentes combinaisons cote a cote.
:::

---

## Exercices Pratiques

### Exercice 1 : Le balayage de temperature

**Ce qu'il faut faire :**

1. Ouvrez **Compare** dans LLMxRay
2. Cliquez sur le preset **Temperature Sweep** — cela cree 3 emplacements avec des temperatures de 0.2, 0.7 et 1.2
3. Ajoutez un 4e emplacement manuellement et reglez-le a 2.0
4. Utilisez ce prompt : *"Write a function in Python to check if a number is prime"*
5. Cliquez sur **Run All** et observez les 4 generer simultanement
6. Comparez les resultats en **Grid View**

**Ce qu'il faut observer :**

- **T=0.2** : Implementation propre et standard. Quasi identique si vous la relancez.
- **T=0.7** : Legeres variations dans les noms de variables ou les commentaires. Toujours correct.
- **T=1.2** : Approches plus creatives (peut-etre un algorithme different), mais attention aux bugs subtils.
- **T=2.0** : Les noms de variables deviennent etranges, des erreurs de logique apparaissent, potentiellement incomplet.

Passez en **Diff View** pour voir exactement quels mots ont change entre les sorties.

**Question cle :** Entre quelles deux temperatures la chute de qualite vous semble-t-elle la plus marquee ?

---

### Exercice 2 : Trouver le precipice

**Ce qu'il faut faire :**

1. Restez dans **Compare**. Configurez 4 emplacements avec les temperatures : 0.7, 0.9, 1.1, 1.3
2. Prompt : *"Write a function in Python to check if a number is prime"*
3. Executez 3 fois. Pour chaque execution, notez si chaque emplacement a produit du code correct (Oui/Non)
4. Consignez vos resultats dans un tableau :

| Temperature | Exec 1 | Exec 2 | Exec 3 | Taux de reussite |
|---|---|---|---|---|
| 0.7 | | | | /3 |
| 0.9 | | | | /3 |
| 1.1 | | | | /3 |
| 1.3 | | | | /3 |

5. Le precipice se situe la ou le taux de reussite chute brutalement — generalement entre T=0.9 et T=1.2

**Pourquoi c'est important :**

Cela demontre que la temperature n'est pas un compromis lineaire. Il y a une **bande etroite** ou la sortie passe de "presque toujours correcte" a "generalement fausse". Trouver ce precipice pour votre modele et votre tache specifiques est l'une des competences les plus pratiques en prompt engineering.

---

### Exercice 3 : Temperature vs type de tache

**Ce qu'il faut faire :**

1. Configurez 2 emplacements : tous deux avec le meme modele, l'un a T=0.2, l'autre a T=1.0
2. **Prompt factuel :** *"What is the capital of France?"*
   - Executez-le. Les deux devraient repondre "Paris." La basse temperature n'apporte rien ici.
3. **Prompt creatif :** *"Write a haiku about debugging code at midnight"*
   - Executez-le 3 fois. Comparez la variete.
   - A T=0.2, vous obtiendrez quasiment le meme haiku a chaque fois.
   - A T=1.0, vous obtiendrez des expressions creatives veritablement differentes.
4. **Prompt de raisonnement :** *"A farmer has 15 sheep. All but 8 run away. How many sheep does the farmer have left?"*
   - C'est une question piege (reponse : 8, pas 7). Testez aux deux temperatures.
   - La temperature affecte-t-elle la precision du raisonnement ?

**Discussion :** Pourquoi n'y a-t-il pas de temperature "ideale" unique ? Quelle temperature choisiriez-vous pour :
- Un chatbot de support client ?
- Un assistant d'ecriture creative ?
- Un outil de completion de code ?
- Un systeme d'information medicale ?

---

### Exercice 4 : Determinisme et seeds

**Ce qu'il faut faire :**

1. Dans **Compare**, utilisez le preset **Deterministic Pair** — deux emplacements avec le meme modele, les memes parametres, le meme seed, T=0
2. Executez le meme prompt 3 fois
3. Toutes les sorties devraient etre **identiques** — le seed rend le generateur de nombres aleatoires reproductible
4. Maintenant changez un emplacement a T=0.7 (gardez le meme seed)
5. Executez a nouveau 3 fois — les sorties differeront desormais entre les executions

**Ce que cela revele :**

- A T=0 (greedy), le seed n'a pas d'importance — il n'y a pas d'aleatoire a controler
- A T>0, le seed controle quel chemin aleatoire est emprunte dans la distribution
- Meme seed + meme temperature = aleatoire reproductible
- C'est ainsi que les chercheurs assurent la reproductibilite des experiences tout en utilisant le decodage stochastique

::: tip Pourquoi la reproductibilite est importante
En recherche et en production, vous devez pouvoir reproduire des sorties specifiques pour le debogage, la comparaison et l'audit. Fixer un seed avec une temperature moderee vous donne une **variete controlee** — differente du greedy (toujours identique) mais reproductible quand necessaire.
:::

---

## Points Cles

1. **La temperature est une operation mathematique** — elle divise les logits par T avant le softmax, remodelant la distribution de probabilites
2. **Le precipice est reel** — la qualite ne se degrade pas lineairement ; il y a une transition brusque ou la sortie passe de fiable a chaotique
3. **Il n'y a pas de temperature universellement optimale** — la valeur ideale depend de la tache (factuelle, creative, raisonnement)
4. **La temperature se compose avec d'autres methodes** — top-k, top-p et la penalite de repetition fonctionnent conjointement avec la temperature
5. **Les seeds permettent la reproductibilite** — seed fixe + temperature fixe = meme sortie a chaque fois

---

## Questions de Discussion

1. Si une entreprise deploie un chatbot a T=0 pour la securite, que perd-elle ? Une sortie deterministe est-elle toujours "plus sure" ?
2. La position du precipice varie selon le modele. Pourquoi un modele de 70B parametres pourrait-il avoir une temperature de precipice plus elevee qu'un modele de 3B ?
3. Les assistants d'ecriture creative utilisent souvent T=0.8-1.0. Mais a qui appartient la creativite — a l'utilisateur ou au modele ? La temperature change-t-elle cela ?
4. Si vous ne pouviez ajuster qu'un seul parametre (temperature, top-k ou top-p), lequel choisiriez-vous et pourquoi ?

---

## Lectures Complementaires

### Articles academiques

| Article | Auteurs | Annee | Lien |
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

### Concepts cles

**Le nucleus sampling (top-p)** a ete introduit par Holtzman et al. (2019) en reponse a l'observation que le sampling standard avec temperature produit un texte soit trop generique (basse T) soit trop aleatoire (haute T). Leur idee : plutot qu'une temperature fixe, tronquer la distribution au plus petit ensemble de tokens couvrant un seuil de probabilite cumulee. Cela s'adapte automatiquement — quand le modele est confiant, moins de tokens sont consideres ; quand il est incertain, davantage d'options restent disponibles.

**Mirostat** (Basu et al., 2020) va plus loin en ciblant un niveau de perplexite specifique plutot qu'une forme de distribution fixe. Il ajuste dynamiquement le sampling pour maintenir un niveau de "surprise" constant, que le modele genere une expression previsible ou navigue en territoire incertain.

---

## Evaluation

**Option A — Collecte de donnees (individuel, 1 page) :**
Effectuez l'experience de recherche du precipice (Exercice 2) avec 5 valeurs de temperature et 5 executions chacune. Presentez un tableau et un graphique lineaire du taux de reussite en fonction de la temperature. Identifiez le point de precipice pour votre modele.

**Option B — Analyse comparative (en binome, 1 page) :**
Testez le meme prompt pour 3 types de taches (factuelle, creative, raisonnement) a 4 temperatures. Pour chaque combinaison, evaluez la qualite de sortie sur une echelle de 1 a 5. Presentez une heatmap et recommandez les temperatures optimales par type de tache.

**Option C — Explication technique (individuel, 500 mots) :**
Expliquez a un chef de produit non technique pourquoi son chatbot ne devrait PAS utiliser T=0, malgre le fait que ce soit "l'option la plus sure". Utilisez des exemples concrets tires de vos experiences.

---

## La suite

Dans le **[Module 3 : L'IA peut-elle mentir ?](./module-3)**, vous utiliserez ce que vous avez appris sur les distributions de probabilites pour comprendre la **confiance vs la verite**. Un modele peut attribuer 95 % de probabilite a la mauvaise reponse — et vous decouvrirez pourquoi grace aux benchmarks avec de vrais logprobs.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 2 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 1 : Qu'est-ce qu'un token ?](./module-1) | [Retour au programme](./index) | [Module 3 : L'IA peut-elle mentir ? &rarr;](./module-3)

</div>
