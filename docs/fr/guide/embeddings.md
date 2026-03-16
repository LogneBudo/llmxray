# Plongements

La page Plongements vous permet de generer des embeddings textuels et de comparer visuellement la similarite semantique entre deux textes.

**Element de la barre laterale :** Plongements
**Route :** `/embeddings`

![Playground Plongements](/screenshots/embed-playground.png)

## Qu'est-ce qu'un embedding ?

Un embedding est une liste de nombres (un vecteur) qui represente le sens d'un texte. Des textes ayant des significations proches produisent des vecteurs pointant dans des directions similaires. LLMxRay utilise ce concept pour vous permettre d'explorer la similarite semantique de maniere concrete.

## Generer un embedding

1. Selectionnez un **modele d'embedding** dans le menu deroulant. Seuls les modeles ayant des capacites d'embedding apparaissent (par ex., `nomic-embed-text`, `all-minilm`).
2. Saisissez du texte dans la zone de saisie.
3. Cliquez sur **Embed**. Le vecteur resultant est affiche sous forme de graphique a barres.

::: tip Pas de modele d'embedding ?
Si aucun modele n'apparait dans le menu deroulant, vous devez en telecharger un :
```bash
ollama pull nomic-embed-text
```
:::

## Comparer deux textes

1. Saisissez du texte dans les deux zones de saisie.
2. Cliquez sur **Comparer**. Les deux textes sont transformes en embeddings et compares.
3. Le **compteur de similarite cosinus** indique la proximite semantique des deux textes :
   - **1.0** -- Signification identique
   - **0.7+** -- Tres similaire
   - **0.3-0.7** -- Partiellement lies
   - **< 0.3** -- Sans rapport

## Cas d'utilisation

- **Comprendre les embeddings** -- Voir ce que ces nombres representent concretement
- **Tester la pertinence RAG** -- Verifier si vos documents correspondront aux requetes des utilisateurs
- **Explorer les synonymes** -- Observer comment le modele comprend les relations semantiques
- **Pedagogie** -- Ideal pour les cours d'IA/ML sur les representations vectorielles

## Astuces

- Differents modeles d'embedding produisent des dimensions de vecteurs et des scores de similarite differents.
- Des textes courts et cibles produisent des comparaisons plus pertinentes que de longs paragraphes.
- Les resultats sont stockes dans la session et peuvent etre consultes ulterieurement.
