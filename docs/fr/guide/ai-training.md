# Entrainement IA

La page Entrainement IA vous permet de collecter, organiser et exporter des paires de donnees d'entrainement pour le fine-tuning de modeles de langage.

**Element de la barre laterale :** Entrainement IA
**Route :** `/training`

## Que sont les paires d'entrainement ?

Une paire d'entrainement se compose d'un **prompt utilisateur** et d'une **reponse du modele**. En collectant des paires de haute qualite, vous constituez un jeu de donnees qui peut etre utilise pour affiner un modele afin qu'il se comporte comme vous le souhaitez.

## Comment les paires sont collectees

Les paires d'entrainement sont automatiquement capturees a partir de vos interactions avec la fonctionnalite **Canvas AI** de l'Atelier d'Outils. Lorsque l'IA genere du code d'outil, propose des ameliorations ou fournit des analyses, chaque interaction devient une paire d'entrainement stockee dans IndexedDB.

## Organiser les donnees

L'interface principale affiche un tableau de toutes les paires d'entrainement collectees. Pour chaque paire, vous pouvez :

### Accepter ou rejeter
- **Accepter** -- Marquer la paire comme donnee d'entrainement de haute qualite
- **Rejeter** -- La marquer comme inadaptee (mauvaise sortie, hallucination, etc.)

### Modifier les reponses
Cliquez sur n'importe quelle reponse pour la modifier. C'est utile lorsque la sortie du modele etait presque correcte mais necessite une correction -- vous obtenez la bonne reponse sans repartir de zero.

### Etiquetage
Ajoutez des etiquettes pour organiser les paires par sujet, niveau de qualite ou toute categorie personnalisee. Les etiquettes vous aident a filtrer et exporter des sous-ensembles specifiques.

### Operations en masse
Selectionnez plusieurs paires pour :
- **Accepter/rejeter en masse** -- Definir le statut de nombreuses paires d'un coup
- **Ajouter des etiquettes en masse** -- Appliquer une etiquette a toutes les paires selectionnees
- **Supprimer** -- Retirer les paires non desirees

## Filtrage

Filtrez la liste des paires d'entrainement par :
- **Statut** -- Acceptees, rejetees ou non examinees
- **Etiquettes** -- Afficher uniquement les paires avec des etiquettes specifiques
- **Recherche** -- Recherche en texte libre dans les prompts et les reponses

## Export

Selectionnez les paires a exporter (ou utilisez les filtres pour affiner), puis cliquez sur **Exporter**. Le jeu de donnees exporte peut etre utilise avec des outils et frameworks de fine-tuning.

## Statistiques

L'en-tete de la page affiche des statistiques agregees :
- Nombre total de paires collectees
- Nombre d'acceptees vs. rejetees
- Repartition des etiquettes

## Astuces

- **La qualite prime sur la quantite** -- Un petit jeu de donnees soigneusement organise produit de meilleurs resultats de fine-tuning qu'un grand jeu de donnees bruite.
- **Modifiez plutot que de jeter** -- Si une reponse est correcte a 80 %, la modifier est plus efficace que de regenerer a partir de zero.
- **Utilisez les etiquettes strategiquement** -- Etiquetez par capacite (par ex., "code-gen", "api-tools", "explication") pour creer des sous-ensembles d'entrainement cibles.
