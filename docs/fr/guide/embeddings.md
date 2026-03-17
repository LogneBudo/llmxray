# Plongements

La page Plongements vous permet de générer des embeddings textuels et de comparer visuellement la similarité sémantique entre deux textes.

**Élément de la barre latérale :** Plongements
**Route :** `/embeddings`

![Playground Plongements](/screenshots/embed-playground.png)

## Qu'est-ce qu'un embedding ?

Un embedding est une liste de nombres (un vecteur) qui représente le sens d'un texte. Des textes ayant des significations proches produisent des vecteurs pointant dans des directions similaires. LLMxRay utilise ce concept pour vous permettre d'explorer la similarité sémantique de manière concrète.

## Générer un embedding

1. Sélectionnez un **modèle d'embedding** dans le menu déroulant. Seuls les modèles ayant des capacités d'embedding apparaissent (par ex., `nomic-embed-text`, `all-minilm`).
2. Saisissez du texte dans la zone de saisie.
3. Cliquez sur **Embed**. Le vecteur résultant est affiché sous forme de graphique à barres.

::: tip Pas de modèle d'embedding ?
Si aucun modèle n'apparaît dans le menu déroulant, vous devez en télécharger un :
```bash
ollama pull nomic-embed-text
```
:::

## Comparer deux textes

1. Saisissez du texte dans les deux zones de saisie.
2. Cliquez sur **Comparer**. Les deux textes sont transformés en embeddings et comparés.
3. Le **compteur de similarité cosinus** indique la proximité sémantique des deux textes :
   - **1.0** -- Signification identique
   - **0.7+** -- Très similaire
   - **0.3-0.7** -- Partiellement liés
   - **< 0.3** -- Sans rapport

## Cas d'utilisation

- **Comprendre les embeddings** -- Voir ce que ces nombres représentent concrètement
- **Tester la pertinence RAG** -- Vérifier si vos documents correspondront aux requêtes des utilisateurs
- **Explorer les synonymes** -- Observer comment le modèle comprend les relations sémantiques
- **Pédagogie** -- Idéal pour les cours d'IA/ML sur les représentations vectorielles

## Astuces

- Différents modèles d'embedding produisent des dimensions de vecteurs et des scores de similarité différents.
- Des textes courts et ciblés produisent des comparaisons plus pertinentes que de longs paragraphes.
- Les résultats sont stockés dans la session et peuvent être consultés ultérieurement.
