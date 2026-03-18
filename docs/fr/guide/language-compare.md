# Comparaison de Langues -- Comprendre la Taxe de Tokens

Le preset Comparaison de Langues revele comment la meme signification coute un nombre different de tokens selon la langue dans laquelle vous l'ecrivez. Ce n'est pas un bug -- c'est une propriete fondamentale du fonctionnement des LLMs.

**Page parente :** [Comparer](./compare)
**Route :** `/compare` (preset Comparaison de Langues)

## Qu'est-ce que la Comparaison de Langues ?

La Comparaison de Langues est un preset de la page [Comparer](./compare). Au lieu de comparer des modeles ou des temperatures, elle compare des **langues**. Vous fournissez le meme prompt dans plusieurs langues et observez comment le tokenizer traite chacune d'entre elles.

Cela met en evidence le **biais de tokenisation** -- le fait que certaines langues sont bien plus couteuses a traiter que d'autres, meme lorsqu'elles expriment exactement la meme idee.

## Le Modele Mental

Les LLMs ne comprennent pas les langues. Ils traitent des **tokens**.

Avant que votre texte n'atteigne le modele, un **tokenizer** (generalement BPE -- Byte Pair Encoding) le decoupe en tokens. Le tokenizer apprend ses regles de fusion a partir des donnees d'entrainement. Voici la chaine critique :

```
Votre Texte  -->  Tokenizer  -->  Tokens  -->  Modele  -->  Reponse
   "Hello"         BPE         [15339]      Inference     "Hi there"
   "مرحبا"         BPE       [2318,112,...]  Inference     "..."
```

L'anglais domine les corpus d'entrainement des LLMs. En consequence, le tokenizer apprend des fusions tres efficaces pour les mots anglais -- les mots courants deviennent souvent un seul token. Les langues moins presentes dans les donnees d'entrainement (arabe, hindi, chinois, thai et bien d'autres) sont **fragmentees** en davantage de tokens pour la meme signification.

**Plus de tokens signifie :**

- **Moins de fenetre de contexte** -- Une fenetre de 4096 tokens contient moins de mots en arabe qu'en anglais
- **Generation plus lente** -- Plus de tokens a produire pour une reponse equivalente
- **Cout plus eleve** -- Sur les APIs facturees au token, la meme phrase coute plus cher dans certaines langues
- **Qualite degradee** -- Le modele a moins de place pour raisonner quand le contexte est consomme par un encodage inefficace

Ce n'est pas une deficience d'une langue quelconque. C'est une consequence statistique de la distribution des donnees d'entrainement. Un tokenizer entraine principalement sur du texte arabe montrerait le biais inverse.

## Comment l'utiliser

1. **Ouvrez la page Comparer** et cliquez sur le bouton du preset **Comparaison de Langues**.
2. **Trois slots apparaissent**, chacun avec un menu deroulant de langue. Les valeurs par defaut sont anglais, francais et arabe -- vous pouvez les modifier pour n'importe quelle langue.
3. **Tapez ou collez votre prompt** dans la zone de texte de chaque slot. Ecrivez la meme signification dans chaque langue.
4. **Detection automatique de la langue** -- Le systeme detecte quelle langue vous avez reellement tapee. Si elle ne correspond pas a la langue selectionnee du slot, un bouton **"Traduire en X"** apparait pour corriger cela en un clic.
5. **Cliquez sur Comparer** -- Tous les slots s'executent simultanement et les resultats apparaissent cote a cote avec les metriques de Taxe de Tokens.

Vous restez toujours maitre de votre prompt. Rien n'est modifie ou envoye sans votre action.

## Comprendre les Resultats

Apres l'execution de la comparaison, chaque slot affiche plusieurs metriques :

| Metrique | Ce que cela signifie |
|---|---|
| **Tokens du Prompt** | Combien de tokens le tokenizer a produit a partir de votre texte d'entree |
| **Taxe de Tokens** | Le ratio par rapport a la langue la plus efficace de la comparaison (generalement l'anglais). Une taxe de 2.3x signifie que le prompt coute 2.3 fois plus de tokens. |
| **TTFT** | Temps jusqu'au premier token. Peut etre plus eleve pour les langues qui produisent plus de tokens de prompt, car le modele doit tous les traiter avant de generer. |
| **Vitesse** | Tokens par seconde pendant la generation. Generalement similaire entre les langues car le modele genere des tokens a peu pres au meme rythme quelle que soit la langue. |
| **Tokens Totaux** | La longueur de la reponse du modele. Le modele peut produire des reponses de longueur differente selon les langues. |

La **Taxe de Tokens** est le chiffre cle. Elle vous indique exactement combien il est plus couteux de traiter une langue, token par token, par rapport a la reference.

## Fonctionnalite de Traduction

Chaque slot inclut une capacite de traduction alimentee par votre modele Ollama local -- aucun service cloud, aucun cout.

- **La qualite depend de la taille du modele.** Les modeles plus grands (7B parametres et plus) produisent des traductions nettement meilleures que les petits (3B). Si la qualite de traduction est importante, utilisez le meilleur modele dont vous disposez.
- **Les modeles de raisonnement montrent leur travail.** Si vous utilisez un modele de raisonnement comme DeepSeek-R1, vous verrez le bloc `<think>` pendant que le modele elabore la traduction.
- **Vous pouvez modifier le resultat.** Apres la traduction, le texte apparait dans la zone de texte du slot et vous pouvez le modifier avant de lancer la comparaison. La traduction est un point de depart, pas une reponse definitive.
- **Un badge "Traduit"** apparait sur le slot uniquement apres l'utilisation de la traduction automatique, pour que vous sachiez toujours quels textes ont ete ecrits par un humain et lesquels ont ete traduits par la machine.

## Conseils

- **Utilisez le meme modele pour tous les slots** afin d'isoler la langue comme seule variable. Si vous utilisez des modeles differents, vous ne pouvez pas determiner si les differences proviennent de la langue ou du modele.
- **Essayez differentes tailles de modele** avec le meme prompt pour voir si le ratio de taxe de tokens change. Les modeles plus grands ont parfois des vocabulaires plus etendus avec une meilleure couverture multilingue.
- **Connectez cela au Kit Enseignants.** Le [Module 9 : Ce que coutent les mots](../community/educators/module-9) fournit un plan de cours structure autour de cette fonctionnalite, avec des exercices et des questions de discussion pour une utilisation en classe.
- **Les prompts courts amplifient l'effet.** Une seule phrase peut montrer des differences dramatiques de nombre de tokens. Essayez une expression courante comme "Il fait beau aujourd'hui" dans cinq langues.
- **Verifiez dans les deux sens.** Si votre langue maternelle n'est pas l'anglais, essayez d'abord de prompter dans votre langue -- vous constaterez peut-etre que la qualite de la reponse du modele differe, pas seulement le nombre de tokens.
