# Entraînement IA

La page Entraînement IA vous permet de collecter, organiser et exporter des paires de données d'entraînement pour le fine-tuning de modèles de langage.

**Élément de la barre latérale :** Entraînement IA
**Route :** `/training`

## Que sont les paires d'entraînement ?

Une paire d'entraînement se compose d'un **prompt utilisateur** et d'une **réponse du modèle**. En collectant des paires de haute qualité, vous constituez un jeu de données qui peut être utilisé pour affiner un modèle afin qu'il se comporte comme vous le souhaitez.

## Comment les paires sont collectées

Les paires d'entraînement sont automatiquement capturées à partir de vos interactions avec la fonctionnalité **Canvas AI** de l'Atelier d'Outils. Lorsque l'IA génère du code d'outil, propose des améliorations ou fournit des analyses, chaque interaction devient une paire d'entraînement stockée dans IndexedDB.

## Organiser les données

L'interface principale affiche un tableau de toutes les paires d'entraînement collectées. Pour chaque paire, vous pouvez :

### Accepter ou rejeter
- **Accepter** -- Marquer la paire comme donnée d'entraînement de haute qualité
- **Rejeter** -- La marquer comme inadaptée (mauvaise sortie, hallucination, etc.)

### Modifier les réponses
Cliquez sur n'importe quelle réponse pour la modifier. C'est utile lorsque la sortie du modèle était presque correcte mais nécessite une correction -- vous obtenez la bonne réponse sans repartir de zéro.

### Étiquetage
Ajoutez des étiquettes pour organiser les paires par sujet, niveau de qualité ou toute catégorie personnalisée. Les étiquettes vous aident à filtrer et exporter des sous-ensembles spécifiques.

### Opérations en masse
Sélectionnez plusieurs paires pour :
- **Accepter/rejeter en masse** -- Définir le statut de nombreuses paires d'un coup
- **Ajouter des étiquettes en masse** -- Appliquer une étiquette à toutes les paires sélectionnées
- **Supprimer** -- Retirer les paires non désirées

## Filtrage

Filtrez la liste des paires d'entraînement par :
- **Statut** -- Acceptées, rejetées ou non examinées
- **Étiquettes** -- Afficher uniquement les paires avec des étiquettes spécifiques
- **Recherche** -- Recherche en texte libre dans les prompts et les réponses

## Export

Sélectionnez les paires à exporter (ou utilisez les filtres pour affiner), puis cliquez sur **Exporter**. Le jeu de données exporté peut être utilisé avec des outils et frameworks de fine-tuning.

## Statistiques

L'en-tête de la page affiche des statistiques agrégées :
- Nombre total de paires collectées
- Nombre d'acceptées vs. rejetées
- Répartition des étiquettes

## Astuces

- **La qualité prime sur la quantité** -- Un petit jeu de données soigneusement organisé produit de meilleurs résultats de fine-tuning qu'un grand jeu de données bruité.
- **Modifiez plutôt que de jeter** -- Si une réponse est correcte à 80 %, la modifier est plus efficace que de régénérer à partir de zéro.
- **Utilisez les étiquettes stratégiquement** -- Étiquetez par capacité (par ex., "code-gen", "api-tools", "explication") pour créer des sous-ensembles d'entraînement ciblés.
