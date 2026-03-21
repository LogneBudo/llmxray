# Tableau de Bord des Couts

Le tableau de bord des couts suit l'utilisation des tokens a travers toutes vos sessions et estime ce que la meme charge de travail couterait sur des APIs cloud commerciales.

**Element de la barre laterale :** Couts
**Route :** `/costs`

## Pourquoi suivre les couts localement ?

Ollama fonctionne sur votre machine sans frais. Mais comprendre le cout cloud equivalent vous aide a :

- **Quantifier les economies** -- Voyez combien vous economisez en executant localement
- **Planifier la capacite** -- Comprenez quels modeles consomment le plus de tokens
- **Comparer l'efficacite** -- Identifiez quels modeles donnent le meilleur resultat par token

## Sections du tableau de bord

### Cartes de resume

Quatre cartes en haut affichant :

- **Tokens totaux** -- Somme de tous les tokens de prompt + completion
- **Sessions** -- Nombre total de sessions de chat enregistrees
- **Cout estime** -- Ce que la meme utilisation couterait sur les APIs cloud
- **Cout moy./session** -- Cout estime moyen par session

### Utilisation de tokens par modele

Un graphique en barres horizontales empilees montrant les tokens de prompt (indigo) et de completion (violet) pour chaque modele utilise. Les modeles sont tries par nombre total de tokens.

### Utilisation quotidienne

Un graphique en ligne avec deux axes :

- **Axe gauche** -- Tokens totaux par jour (zone remplie)
- **Axe droit** -- Cout estime par jour (ligne pointillee)

### Tableau detaille par modele

Un tableau detaille avec les colonnes : Modele, Sessions, Prompt, Completion, Total, Cout est., Source.

## Donnees de tarification

Les tarifs sont bases sur les prix equivalents des APIs cloud pour les familles de modeles courants. Les modeles non repertories utilisent une estimation generique de $0.10/$0.10 par million de tokens.

::: info Ce sont des estimations
Tous les couts affiches representent ce que l'utilisation equivalente couterait sur des APIs cloud. Ollama fonctionne localement sans frais.
:::
