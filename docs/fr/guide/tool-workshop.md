# Atelier d'Outils

L'Atelier d'Outils est un canevas visuel pour créer, modifier et tester des définitions d'outils que les modèles peuvent appeler pendant le chat.

**Élément de la barre latérale :** Atelier d'Outils
**Route :** `/tools`

## Vue d'ensemble de l'interface

La page présente un **canevas à base de nœuds** propulsé par Vue Flow. Chaque outil est représenté sous forme de nœud visuel affichant son nom, sa description, ses paramètres et le corps de son implémentation.

## Créer des outils

### À partir de modèles
Cliquez sur **Modèles** pour parcourir plus de 15 modèles intégrés, notamment :
- Requêtes web (HTTP)
- Calculatrice
- Intégration Google Calendar / Gmail
- Testeur de regex
- Utilitaires de date/heure
- Et plus encore

### À partir de zéro
Cliquez sur **Ajouter un outil** pour créer un nœud d'outil vierge. Remplissez :
- **Nom** -- Le nom de la fonction (utilisé par le modèle)
- **Description** -- Ce que fait l'outil (aide le modèle à décider quand l'utiliser)
- **Paramètres** -- Entrées définies en JSON Schema
- **Implémentation** -- Corps de la fonction TypeScript

## Modifier les outils

### Édition de code en ligne
Chaque nœud d'outil dispose d'un éditeur **CodeMirror 6** complet avec coloration syntaxique TypeScript. Modifiez l'implémentation directement sur le canevas.

### Panneau de code (synchronisation bidirectionnelle)
Ouvrez le **Panneau de code** pour voir tous les outils sous forme de code source TypeScript combiné. Cela utilise un **analyseur AST Recast** pour une synchronisation bidirectionnelle :
- Modification du code dans le panneau → les nœuds se mettent à jour sur le canevas
- Modification des nœuds sur le canevas → le code se met à jour dans le panneau

### Visionneuse de schéma
Cliquez sur l'icône de schéma sur n'importe quel outil pour voir son **schéma JSON compatible OpenAI** généré automatiquement. Copie en un clic pour utilisation dans d'autres systèmes.

## Sonder et sélectionner

Pointez vers n'importe quelle URL d'API pour :
1. **Sonder** le endpoint -- envoyer une requête et inspecter la réponse
2. **Parcourir l'arborescence JSON** -- développer/réduire la structure de la réponse
3. **Sélectionner des champs** -- choisir les données dont vous avez besoin
4. **Générer automatiquement** le code fetch et les correspondances de paramètres

## Découverte OpenAPI

Si une API dispose d'une spécification OpenAPI/Swagger :
1. Saisissez l'URL de la spécification
2. LLMxRay analyse la spécification automatiquement
3. Parcourez les endpoints disponibles
4. Sélectionnez un endpoint pour générer automatiquement une définition d'outil

## Exécution en direct

Pendant le chat, lorsque le modèle appelle un outil :
- Le nœud correspondant **pulse** sur le canevas
- Les résultats d'exécution apparaissent en **superposition** sur le nœud
- La chronologie des appels d'outils (dans Diagnostics de Chat) renvoie vers le canevas

## Optimiseur d'appels d'outils

Lorsqu'un modèle appelle un outil pendant le chat, un bouton **"Optimiser cet outil"** apparaît sur le résultat. Cliquez dessus pour ouvrir le tiroir d'optimisation des réponses :

1. **Visualiser** la réponse de l'API sous forme d'arborescence JSON interactive
2. **Sélectionner** uniquement les champs dont le modèle a réellement besoin
3. **Générer automatiquement** un code fetch optimisé avec extraction des champs
4. **Créer** un nouvel outil optimisé dans l'Atelier en un clic

## Persistance

Les définitions d'outils, positions des nœuds, correspondances et configurations de sondage sont toutes persistées et survivent aux actualisations du navigateur.

## Exporter les outils

Cliquez sur le bouton **Exporter** pour telecharger vos definitions d'outils au format **JSON**. L'export inclut les noms, descriptions, schemas de parametres et corps d'implementation -- tout ce qu'il faut pour reimporter ou partager vos outils. Consultez le [guide d'export](./export) pour plus de details sur toutes les options d'export.

## Astuces

- Commencez par un modèle et personnalisez-le -- c'est plus rapide que de partir de zéro.
- Utilisez la **Visionneuse de schéma** pour vérifier que votre définition d'outil correspond à ce que les modèles attendent.
- Le flux de travail **Sonder et sélectionner** est le moyen le plus rapide d'encapsuler une API REST en tant qu'outil.
- Les outils sont automatiquement disponibles dans le chat lorsqu'ils sont activés.
