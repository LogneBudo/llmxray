# Module 5 : Quand le modèle oublie-t-il ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Archéologue** — Explorez les frontières de la mémoire

**Durée :** 60 min | **Difficulté :** Intermédiaire | **Prérequis :** [Module 1](./module-1), [Module 4](./module-4)

</div>

## Le Moment Eureka

> Le contexte n'est pas de la mémoire — c'est une fenêtre glissante. Le modèle ne se souvient pas de votre conversation. Il relit l'intégralité de la transcription à chaque fois, et lorsqu'il n'a plus de place, les anciens messages disparaissent tout simplement.

C'est l'intuition qui déconstruit l'illusion la plus répandue au sujet des assistants IA : qu'ils "se souviennent" de vous. Quand vous discutez avec un modèle de langage, cela ressemble à une conversation continue avec un être qui se rappelle ce que vous avez dit il y a cinq minutes. En réalité, chaque appel API envoie **l'intégralité de l'historique de conversation** depuis le début. Le modèle ne possède aucun état interne persistant entre les appels — pas de registre mémoire, pas de journal, pas de classeur. Il reçoit un bloc de texte, génère une réponse, et oublie immédiatement tout.

Les conséquences sont profondes. Il existe une limite stricte — la **fenêtre de contexte** (context window) — sur la quantité de texte que peut contenir ce bloc. Lorsque votre conversation la dépasse, les messages les plus anciens sont silencieusement supprimés. Le modèle ne résume pas gracieusement ce qu'il a perdu. Il ne signale pas qu'il ne peut plus voir vos instructions antérieures. Ces messages cessent simplement d'exister du point de vue du modèle, comme s'ils n'avaient jamais été écrits. Comprendre cela transforme la façon dont les étudiants conçoivent leurs prompts, structurent leurs conversations et évaluent la fiabilité des systèmes IA en production.

---

## Contexte Conceptuel

### Qu'est-ce qu'une fenêtre de contexte ?

Une **fenêtre de contexte** (context window) est le tampon de taille fixe en tokens qu'un modèle de langage peut traiter en un seul appel. Ce n'est pas de la mémoire. Ce n'est pas du stockage. C'est plutôt comme un bureau — on ne peut y étaler qu'une quantité limitée de papier avant que des feuilles ne commencent à tomber du bord.

Chaque fois que vous envoyez un message, l'application assemble un bloc de texte unique contenant :
- Le prompt système (instructions sur le comportement du modèle)
- L'historique complet de la conversation (tous les messages précédents de l'utilisateur et les réponses de l'assistant)
- Votre dernier message

Ce bloc entier est envoyé au modèle comme une seule entrée. Le modèle le lit en intégralité, génère une réponse, puis **ne retient rien**. La prochaine fois que vous envoyez un message, l'application reconstruit le bloc depuis le début, incluant désormais la réponse précédente du modèle dans l'historique.

La fenêtre de contexte définit la taille maximale de ce bloc, mesurée en tokens. Si le bloc assemblé dépasse la limite, quelque chose doit être coupé.

![La fenêtre de contexte](/educators/fr/context-window.svg)

### Budget de tokens : qui obtient quoi ?

La fenêtre de contexte est un **budget partagé**. Chaque composant de l'entrée est en concurrence pour le même pool de tokens :

| Composant | Coût typique en tokens | Notes |
|---|---|---|
| **Prompt système** | 50 - 500 tokens | Instructions, personnalité, règles |
| **Historique de conversation** | Croît à chaque tour | Chaque tour utilisateur + assistant ajoute des tokens |
| **Dernier message de l'utilisateur** | 10 - 500 tokens | La requête en cours |
| **Réservé pour la réponse** | Dépend du modèle | Le modèle a besoin d'espace pour générer sa sortie |

Considérons un modèle avec une fenêtre de contexte de 4 096 tokens. Si votre prompt système consomme 200 tokens et que vous réservez 500 tokens pour la réponse du modèle, il vous reste environ 3 396 tokens pour l'historique de conversation. Si chaque tour (message utilisateur + réponse de l'assistant) consomme en moyenne 300 tokens, vous pouvez loger environ **11 tours** avant que la fenêtre ne soit pleine.

Avec une fenêtre de 2 048 tokens, cette même configuration ne laisse de place que pour environ **4-5 tours**. La conversation se remplit remarquablement vite.

C'est pourquoi la longueur du prompt système est importante. Un prompt système verbeux qui consomme 800 tokens vole de l'espace directement à votre historique de conversation. Chaque token dépensé pour les instructions est un token indisponible pour le contexte.

![Répartition du budget de tokens](/educators/fr/token-budget.svg)

::: warning Les prompts système sont invisibles mais coûteux
De nombreuses applications IA injectent de longs prompts système que les utilisateurs ne voient jamais — définitions de personnalité, consignes de sécurité, règles de formatage de la sortie. Ceux-ci peuvent consommer des centaines, voire des milliers de tokens avant que l'utilisateur ne tape un seul mot. Lorsqu'un modèle semble "oublier" des parties antérieures de votre conversation, le prompt système caché peut en être partiellement responsable.
:::

### Que se passe-t-il lorsque le contexte déborde ?

Lorsque l'entrée assemblée dépasse la fenêtre de contexte, l'application doit la tronquer. La stratégie la plus courante est une **fenêtre glissante** (sliding window) : les messages les plus anciens de l'historique sont supprimés jusqu'à ce que l'entrée rentre dans la limite.

Ce n'est pas une dégradation gracieuse. Il n'y a pas de "mémoire floue" des messages plus anciens, pas de rappel partiel, pas de système de priorité qui conserve les éléments importants. C'est une coupure nette :

- **Avant la troncature** : Le modèle peut voir les messages 1 à 20
- **Après la troncature** : Le modèle peut voir les messages 8 à 20. Les messages 1 à 7 ont disparu.

Le modèle n'a aucune conscience que quelque chose a été supprimé. Il ne peut pas vous dire "Je connaissais votre nom mais je l'ai oublié". De son point de vue, la conversation commence simplement au message 8. Si vous lui avez communiqué votre nom au message 1 et que vous le demandez au message 21, il avouera son ignorance ou — pire — hallucinerait un nom.

Cela crée une catégorie de bugs subtils dans les applications IA :
- Les instructions données en début de conversation expirent silencieusement
- Le modèle contredit ses propres déclarations antérieures parce qu'il ne peut plus les voir
- Les utilisateurs perçoivent le modèle comme "amnésique" ou "incohérent" sans comprendre pourquoi

### Stratégies de mémoire : lutter contre l'oubli

La fenêtre de contexte étant fondamentalement limitée, les applications utilisent diverses stratégies pour préserver les informations importantes au fil de conversations plus longues. LLMxRay implémente une **approche à quatre niveaux**, chacun avec des compromis différents :

**1. Fenêtre glissante (sliding window, par défaut)**
La stratégie la plus simple : conserver les N messages les plus récents et supprimer tout ce qui est plus ancien. Rapide et prévisible, mais le contexte ancien disparaît complètement. Vous pouvez configurer la taille de la fenêtre (par ex. 20 messages) dans les Chat Settings.

**2. Résumé automatique (Auto-Summarization)**
Lorsque la conversation s'allonge, l'application demande au modèle de résumer les messages anciens en un paragraphe condensé. Ce résumé remplace les messages originaux, préservant l'essentiel tout en utilisant bien moins de tokens. Le compromis : les résumés perdent les nuances, les citations exactes et les détails spécifiques.

**3. Faits utilisateur (User Facts)**
L'application extrait et stocke les faits clés de la conversation (noms, préférences, objectifs déclarés) dans un format structuré en dehors de la fenêtre de contexte. Ces faits sont injectés dans chaque nouveau prompt sous forme d'une section "mémoire" compacte. Cela préserve les informations critiques, mais ne capture que ce que la logique d'extraction identifie comme important.

**4. Mémoire de messages RAG (RAG Message Memory)**
Les messages passés sont convertis en vecteurs (embeddings) et stockés dans IndexedDB. Quand l'utilisateur envoie un nouveau message, l'application recherche les messages passés sémantiquement similaires et injecte les plus pertinents dans le contexte. C'est la stratégie la plus sophistiquée — elle peut retrouver des informations datant de centaines de tours — mais elle dépend de la qualité des embeddings et de la pertinence de la correspondance.

![Stratégies de mémoire](/educators/fr/memory-strategies.svg)

::: warning Aucune stratégie n'est parfaite
Chaque stratégie de mémoire est une compression avec perte de la conversation originale. La fenêtre glissante perd tout ce qui se trouve au-delà de la fenêtre. Le résumé perd les détails. Les faits utilisateur perdent le contexte. La récupération RAG peut manquer des messages pertinents ou en ramener d'inutiles. La contrainte fondamentale — une fenêtre de contexte finie — ne peut pas être entièrement surmontée, seulement atténuée.
:::

### Longueur de contexte selon les modèles

Les modèles varient énormément quant à la taille de leur fenêtre de contexte :

| Modèle | Fenêtre de contexte | Pages de texte approximatives |
|---|---|---|
| Modèles anciens (ère GPT-2) | 1 024 tokens | ~1,5 pages |
| LLaMA 2 (7B) | 4 096 tokens | ~6 pages |
| LLaMA 3 (8B) | 8 192 tokens | ~12 pages |
| Mistral 7B | 32 768 tokens | ~50 pages |
| GPT-4 Turbo | 128 000 tokens | ~200 pages |
| Claude, Gemini (dernières versions) | 200 000+ tokens | ~300+ pages |

Une réaction naturelle : "Il suffit d'agrandir la fenêtre de contexte." Mais plus grand n'est pas toujours mieux :

- **Le coût de calcul croît quadratiquement** avec la longueur du contexte dans l'attention standard (O(n^2)). Doubler le contexte quadruple le calcul pour la self-attention. Les variantes d'attention efficace (FlashAttention, grouped-query attention) atténuent ce problème mais ne l'éliminent pas.
- **La latence augmente** car le modèle doit traiter davantage de tokens avant de générer son premier token de sortie (TTFT plus élevé).
- **Le problème du "perdu au milieu"** : Liu et al. (2023) ont démontré que les modèles sont significativement moins performants pour exploiter les informations placées au milieu de longs contextes par rapport aux informations situées au début ou à la fin. Disposer d'une grande fenêtre de contexte ne garantit pas que le modèle exploitera efficacement tout ce qu'elle contient.
- **Les modèles locaux sont contraints par la VRAM**. Faire tourner un contexte de 128K sur un GPU grand public n'est pas toujours réalisable. LLMxRay permet de configurer la fenêtre de contexte dans les Chat Settings précisément parce que le matériel local impose des limites réelles.

---

## Exercices Pratiques

### Exercice 1 : Remplir le seau

**Ce qu'il faut faire :**

1. Ouvrez **Chat Diagnostics** dans LLMxRay
2. Allez dans **Chat Settings** et réglez la fenêtre de contexte à **2 048 tokens**
3. Démarrez une conversation — posez au modèle une série de questions sur différents sujets
4. Après chaque message, consultez le **Metrics Dashboard** : observez le nombre de **prompt tokens** qui augmente à chaque tour
5. Continuez à discuter jusqu'à ce que vous remarquiez que les prompt tokens cessent de croître ou que les anciens messages disparaissent du contexte
6. Comptez combien de tours ont tenu avant que la fenêtre ne soit pleine
7. Changez maintenant la fenêtre de contexte à **8 192 tokens** dans les Chat Settings et répétez l'expérience

::: tip Utilisez la commande slash /context
Vous pouvez rapidement changer la taille de la fenêtre de contexte en tapant `/context 2048` ou `/context 8192` dans la zone de saisie du chat, au lieu de naviguer vers les Chat Settings à chaque fois.
:::

**Ce que vous allez découvrir :**

Avec 2 048 tokens, la conversation se remplit en environ 4-7 tours selon la longueur des messages. Avec 8 192, vous obtenez environ 4 fois plus de tours. La relation est approximativement linéaire — doubler le contexte, c'est doubler la longueur de la conversation.

Observez attentivement le Metrics Dashboard : les prompt tokens croissent régulièrement, puis atteignent un plateau lorsque la fenêtre glissante entre en action. Ce plateau est le moment où les messages anciens commencent à disparaître.

**Notez vos observations :**

| Fenêtre de contexte | Tours avant saturation | Prompt tokens au plateau |
|---|---|---|
| 2 048 | ? | ? |
| 8 192 | ? | ? |

---

### Exercice 2 : Le test d'amnésie

**Ce qu'il faut faire :**

1. Réglez la fenêtre de contexte à **2 048 tokens** dans les **Chat Settings**
2. Dans votre **premier message**, dites au modèle : *"My name is Alex and my favorite color is blue. Please remember this."*
3. Engagez une conversation sur des **sujets sans rapport** — posez des questions sur l'histoire, la science, la cuisine, n'importe quoi. Envoyez 5 à 10 messages.
4. Après plusieurs tours, demandez : *"What is my name and what is my favorite color?"*
5. Le modèle se souvient-il ? Notez la réponse.
6. Réglez maintenant la fenêtre de contexte à **8 192 tokens** et répétez l'expérience entière depuis l'étape 2
7. À quel moment le modèle oublie-t-il avec la fenêtre plus grande ?

**Ce que vous allez découvrir :**

Avec 2 048 tokens, le modèle oubliera probablement votre nom et votre couleur après seulement quelques tours de conversation sans rapport. Le message contenant vos informations personnelles a été poussé hors de la fenêtre glissante. Le modèle peut :
- Avouer son ignorance ("I don't have that information")
- Halluciner une réponse (affirmer avec assurance un nom incorrect)
- Se souvenir partiellement (retrouver un fait correct et un autre faux)

Avec 8 192 tokens, les faits survivent plus longtemps — mais ils finissent tout de même par disparaître si vous discutez assez longtemps. L'oubli est **inévitable** ; seul le moment change.

**L'observation critique :** Le modèle ne sait pas qu'il a oublié. Il ne dit jamais "Je connaissais votre nom mais il a été retiré de mon contexte". Il se comporte comme si l'information n'avait jamais existé.

---

### Exercice 3 : Anatomie du budget de tokens

**Ce qu'il faut faire :**

1. Ayez une conversation d'au moins 5 tours dans **Chat Diagnostics**
2. Ouvrez le **Prompt Inspector** (vue d'anatomie du prompt)
3. Examinez le **diagramme en barres empilées** montrant la répartition du budget de tokens : tokens du prompt système vs tokens de l'historique de conversation vs tokens du message utilisateur
4. Notez la taille actuelle du prompt système
5. Allez maintenant dans **Chat Settings** et changez le prompt système pour quelque chose de **très long** — collez un paragraphe entier d'instructions détaillées (par ex. *"You are a helpful assistant who always responds in bullet points. You must cite sources for every claim. You should use formal academic English. You must never use contractions. Always begin your response with a summary sentence..."* — faites-en 200+ mots)
6. Envoyez un nouveau message et réexaminez le Prompt Inspector
7. Comparez : combien d'espace le prompt système étendu consomme-t-il ? Combien de tours de conversation en moins tiennent dans la fenêtre ?

**Ce que vous allez découvrir :**

Le diagramme en barres empilées rend le compromis viscéralement clair. Un prompt système court (par ex. "You are a helpful assistant") peut consommer 10-20 tokens. Un prompt système verbeux peut facilement en consommer 300-500 — soit 15-25 % d'une fenêtre de contexte de 2 048 tokens, disparus avant même que la conversation ne commence.

**Questions de réflexion :**
- Si vous ne disposez que de 2 048 tokens au total, un prompt système de 500 tokens en vaut-il la peine ?
- Comment réécririez-vous un long prompt système pour transmettre les mêmes instructions en moins de tokens ?
- Que se passe-t-il avec le prompt système en cas de débordement du contexte — est-il jamais supprimé ?

::: warning Le prompt système est généralement protégé
La plupart des applications, y compris LLMxRay, protègent le prompt système de la troncature — il est toujours inclus. Cela signifie que le prompt système réduit de manière permanente l'espace disponible pour l'historique de conversation. Un prompt système surchargé est un impôt permanent sur chaque tour de la conversation.
:::

---

### Exercice 4 : Comparaison des stratégies de mémoire

**Ce qu'il faut faire :**

1. Démarrez une conversation fraîche dans **Chat Diagnostics** avec la fenêtre de contexte réglée à **2 048 tokens**
2. Dans le premier message, communiquez au modèle trois faits spécifiques : votre nom, votre ville et votre métier
3. Ayez 8-10 tours de conversation sans rapport
4. Demandez au modèle de rappeler les trois faits. Notez ce dont il se souvient.
5. Activez maintenant **Sliding Window** (réglée à 20 messages) dans les **Chat Settings** et répétez l'expérience
6. Ensuite, activez **Auto-Summarization** et répétez
7. Enfin, activez **RAG Message Memory** et répétez
8. Comparez les résultats entre toutes les stratégies

**Ce que vous allez découvrir :**

| Stratégie | Faits rappelés (sur 3) | Utilisation de tokens | Notes |
|---|---|---|---|
| Aucune stratégie (brut) | ? | Élevée (croissance illimitée) | Les messages les plus anciens sont simplement supprimés |
| Sliding Window (20) | ? | Moyenne (plafonnée) | Messages récents conservés, anciens disparus |
| Auto-Summarization | ? | Faible (compressée) | Le résumé peut ou non capturer vos faits |
| RAG Message Memory | ? | Moyenne (sélective) | Récupère les messages passés pertinents à la demande |

La comparaison la plus révélatrice est entre Auto-Summarization et RAG Message Memory. Le résumé compresse tout en un court paragraphe, qui pourrait dire "l'utilisateur s'est présenté" sans préserver le nom réel. La récupération RAG peut retrouver le message original exact contenant vos faits — mais seulement si la requête de récupération déclenche une correspondance sémantique.

**Discussion :**
- Quelle stratégie préserve le plus de contexte tout en utilisant le moins de tokens ?
- Existe-t-il une stratégie qui fonctionne bien pour tous les types de conversation, ou le meilleur choix dépend-il du cas d'usage ?
- Que se passerait-il si vous combiniez plusieurs stratégies ?

---

## Points Clés

1. **La fenêtre de contexte est un tampon de taille fixe**, pas une mémoire persistante. Le modèle n'a aucun état entre les appels — la conversation entière est renvoyée à chaque fois, et lorsqu'elle dépasse la limite, les anciens messages sont silencieusement supprimés.
2. **Le prompt système, l'historique de conversation et la réponse du modèle sont tous en concurrence** pour le même budget de tokens. Chaque token dépensé pour un composant est indisponible pour les autres.
3. **Le débordement du contexte est une coupure nette**, pas un effacement progressif. Le modèle n'a aucune conscience que des messages ont été supprimés et ne peut pas distinguer une information "oubliée" d'une information qui n'a jamais été fournie.
4. **Les stratégies de mémoire sont des palliatifs avec perte**, pas des solutions. Fenêtre glissante, résumé, faits utilisateur et récupération RAG préservent chacun différents aspects de la conversation à différents coûts, mais aucun ne remplace intégralement le contexte original.
5. **Des fenêtres de contexte plus grandes aident mais ne sont pas une panacée**. Elles entraînent des coûts de calcul plus élevés, une latence accrue et le problème du "perdu au milieu" où les modèles sous-exploitent les informations enfouies dans de longs contextes.

---

## Questions de Discussion

1. Pourquoi ne peut-on pas simplement rendre les fenêtres de contexte infinies ? Quelles sont les barrières computationnelles, architecturales et pratiques — et certaines d'entre elles sont-elles susceptibles d'être résolues prochainement ?
2. De nombreux assistants IA prétendent "se souvenir" de vous entre les conversations. Sachant ce que vous savez maintenant sur les fenêtres de contexte, que doit-il se passer en coulisses pour créer cette illusion ? Quelles sont les implications en matière de vie privée ?
3. Dans le Module 4, vous avez découvert le RAG — la récupération de documents pertinents pour augmenter l'entrée du modèle. Comment la limite de la fenêtre de contexte affecte-t-elle la conception des systèmes RAG ? Que se passe-t-il lorsque les documents récupérés plus l'historique de conversation dépassent la fenêtre de contexte ?
4. Si un modèle dispose d'une fenêtre de contexte de 128K, cela signifie-t-il qu'il peut exploiter de manière fiable une entrée de 128K tokens ? Que suggèrent les recherches sur le "perdu au milieu" concernant la longueur de contexte effective vs théorique ?
5. Imaginez que vous construisiez un chatbot de support client. Un client a une conversation de 50 messages couvrant plusieurs problèmes. Comment concevriez-vous la stratégie de mémoire pour garantir que le modèle n'oublie jamais les détails du compte client tout en conservant de la place pour discuter du problème en cours ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Attention Is All You Need | Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin | 2017 | [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) |
| Lost in the Middle: How Language Models Use Long Contexts | Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni, Liang | 2023 | [arXiv:2307.03172](https://arxiv.org/abs/2307.03172) |
| Extending Context Window of Large Language Models via Positional Interpolation | Chen, Wong, Chen, Tian | 2023 | [arXiv:2306.15595](https://arxiv.org/abs/2306.15595) |
| LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens | Ding, Zhang, Zhang, Xu, Shang, Yang, Nishi, Zheng, Bian | 2024 | [arXiv:2402.13753](https://arxiv.org/abs/2402.13753) |
| Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | Lewis, Perez, Piktus, Petroni, Karpukhin, Goyal, Kuttler, Lewis, Yih, Rocktaschel, Riedel, Kiela | 2020 | [arXiv:2005.11401](https://arxiv.org/abs/2005.11401) |

### Tutoriels et explications visuelles

| Ressource | Auteur | Lien |
|---|---|---|
| Attention? Attention! | Lilian Weng | [lilianweng.github.io](https://lilianweng.github.io/posts/2018-06-24-attention/) |
| The Illustrated Transformer | Jay Alammar | [jalammar.github.io](https://jalammar.github.io/illustrated-transformer/) |

---

## Évaluation

**Option A — Journal de la fenêtre de contexte (individuel, 1 page) :**
À l'aide de Chat Diagnostics de LLMxRay, effectuez le test d'amnésie (Exercice 2) avec trois tailles de fenêtre de contexte différentes (2 048 / 4 096 / 8 192). Pour chaque taille, notez le tour exact auquel le modèle oublie vos faits initiaux. Présentez vos résultats dans un tableau et expliquez la relation entre la taille du contexte et la mémoire conversationnelle. Incluez des captures d'écran du Metrics Dashboard montrant la courbe de croissance des tokens.

**Option B — Évaluation des stratégies de mémoire (en binôme, 1 page) :**
Testez les quatre stratégies de mémoire (sliding window, auto-summarization, user facts, RAG message memory) en utilisant le même script de conversation de 15 tours. Pour chaque stratégie, évaluez : (1) combien de faits originaux ont été préservés, (2) l'utilisation totale de tokens, et (3) la qualité des réponses. Présentez une matrice de comparaison et recommandez quelle stratégie est la mieux adaptée à trois cas d'usage différents : support client, tutorat et écriture créative.

**Option C — Proposition de conception système (groupes de 2-3, présentation de 5 minutes) :**
Concevez une architecture de mémoire pour un assistant d'étude IA qui aide les étudiants à préparer leurs examens sur plusieurs semaines de conversation. L'assistant doit retenir les sujets faibles de l'étudiant, suivre la progression et ne jamais oublier les faits clés — le tout en fonctionnant sur un modèle local avec une fenêtre de contexte de 4 096 tokens. Présentez votre architecture, justifiez chaque choix de stratégie de mémoire avec des preuves tirées de vos expériences LLMxRay, et démontrez les compromis en direct.

---

## La Suite

Dans le **[Module 6 : L'IA peut-elle utiliser des outils ?](./module-6)**, vous explorerez l'appel d'outils (tool calling) — comment les modèles de langage peuvent aller au-delà de la génération de texte pour exécuter du code, effectuer des recherches sur le web, interroger des bases de données et interagir avec des systèmes externes. Vous découvrirez que l'utilisation d'outils transforme le modèle d'un prédicteur de texte en un agent, et vous examinerez à la fois la puissance et les risques de donner à l'IA l'accès à des actions dans le monde réel.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 5 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 4 : Que voit le modèle ?](./module-4) | [Retour au programme](./index) | [Module 6 : L'IA peut-elle utiliser des outils ? &rarr;](./module-6)

</div>
