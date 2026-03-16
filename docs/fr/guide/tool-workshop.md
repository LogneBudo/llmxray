# Atelier d'Outils

L'Atelier d'Outils est un canevas visuel pour creer, modifier et tester des definitions d'outils que les modeles peuvent appeler pendant le chat.

**Element de la barre laterale :** Atelier d'Outils
**Route :** `/tools`

## Vue d'ensemble de l'interface

La page presente un **canevas a base de noeuds** propulse par Vue Flow. Chaque outil est represente sous forme de noeud visuel affichant son nom, sa description, ses parametres et le corps de son implementation.

## Creer des outils

### A partir de modeles
Cliquez sur **Modeles** pour parcourir plus de 15 modeles integres, notamment :
- Requetes web (HTTP)
- Calculatrice
- Integration Google Calendar / Gmail
- Testeur de regex
- Utilitaires de date/heure
- Et plus encore

### A partir de zero
Cliquez sur **Ajouter un outil** pour creer un noeud d'outil vierge. Remplissez :
- **Nom** -- Le nom de la fonction (utilise par le modele)
- **Description** -- Ce que fait l'outil (aide le modele a decider quand l'utiliser)
- **Parametres** -- Entrees definies en JSON Schema
- **Implementation** -- Corps de la fonction TypeScript

## Modifier les outils

### Edition de code en ligne
Chaque noeud d'outil dispose d'un editeur **CodeMirror 6** complet avec coloration syntaxique TypeScript. Modifiez l'implementation directement sur le canevas.

### Panneau de code (synchronisation bidirectionnelle)
Ouvrez le **Panneau de code** pour voir tous les outils sous forme de code source TypeScript combine. Cela utilise un **analyseur AST Recast** pour une synchronisation bidirectionnelle :
- Modification du code dans le panneau → les noeuds se mettent a jour sur le canevas
- Modification des noeuds sur le canevas → le code se met a jour dans le panneau

### Visionneuse de schema
Cliquez sur l'icone de schema sur n'importe quel outil pour voir son **schema JSON compatible OpenAI** genere automatiquement. Copie en un clic pour utilisation dans d'autres systemes.

## Sonder et selectionner

Pointez vers n'importe quelle URL d'API pour :
1. **Sonder** le endpoint -- envoyer une requete et inspecter la reponse
2. **Parcourir l'arborescence JSON** -- developper/reduire la structure de la reponse
3. **Selectionner des champs** -- choisir les donnees dont vous avez besoin
4. **Generer automatiquement** le code fetch et les correspondances de parametres

## Decouverte OpenAPI

Si une API dispose d'une specification OpenAPI/Swagger :
1. Saisissez l'URL de la specification
2. LLMxRay analyse la specification automatiquement
3. Parcourez les endpoints disponibles
4. Selectionnez un endpoint pour generer automatiquement une definition d'outil

## Execution en direct

Pendant le chat, lorsque le modele appelle un outil :
- Le noeud correspondant **pulse** sur le canevas
- Les resultats d'execution apparaissent en **superposition** sur le noeud
- La chronologie des appels d'outils (dans Diagnostics de Chat) renvoie vers le canevas

## Optimiseur d'appels d'outils

Lorsqu'un modele appelle un outil pendant le chat, un bouton **"Optimiser cet outil"** apparait sur le resultat. Cliquez dessus pour ouvrir le tiroir d'optimisation des reponses :

1. **Visualiser** la reponse de l'API sous forme d'arborescence JSON interactive
2. **Selectionner** uniquement les champs dont le modele a reellement besoin
3. **Generer automatiquement** un code fetch optimise avec extraction des champs
4. **Creer** un nouvel outil optimise dans l'Atelier en un clic

## Persistance

Les definitions d'outils, positions des noeuds, correspondances et configurations de sondage sont toutes persistees et survivent aux actualisations du navigateur.

## Astuces

- Commencez par un modele et personnalisez-le -- c'est plus rapide que de partir de zero.
- Utilisez la **Visionneuse de schema** pour verifier que votre definition d'outil correspond a ce que les modeles attendent.
- Le flux de travail **Sonder et selectionner** est le moyen le plus rapide d'encapsuler une API REST en tant qu'outil.
- Les outils sont automatiquement disponibles dans le chat lorsqu'ils sont actives.
