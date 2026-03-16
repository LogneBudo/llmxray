# Diagnostics de Chat

La page Diagnostics de Chat est le coeur de LLMxRay. Elle combine une interface de chat complete avec une analyse approfondie en temps reel de chaque token produit par le modele.

**Element de la barre laterale :** Diagnostics de Chat (premier element)
**Route :** `/`

![Interface Diagnostics de Chat](/screenshots/chat-diagnostics.png)

## Vue d'ensemble de l'interface

La page est divisee en deux zones :

- **Panneau gauche** -- Liste des sessions affichant toutes les conversations passees avec horodatage, noms de modeles et nombre de tokens.
- **Panneau droit** -- Zone de chat active avec saisie de message, sortie en streaming et onglets de detail de session.

## Demarrer une conversation

1. Selectionnez un modele dans le **menu deroulant des modeles** en haut. Les modeles d'embedding sont automatiquement filtres -- seuls les modeles capables de chat apparaissent.
2. Saisissez votre message dans la zone de texte.
3. Appuyez sur **Entree** ou cliquez sur Envoyer.

Les tokens arrivent un par un avec une **coloration par confiance** : chaque token est teinte en fonction de la vitesse a laquelle le modele l'a produit. Tokens rapides = confiance elevee (plus vert). Tokens lents = confiance faible (plus orange/rouge).

::: info La confiance est une approximation
Comme le endpoint `/api/chat` d'Ollama n'expose pas les logprobs des tokens, LLMxRay approxime la confiance a partir de la latence inter-tokens. Cela est clairement indique dans l'interface. Pour de vrais logprobs, utilisez la fonctionnalite [Benchmark](./benchmark).
:::

## Fonctionnalites

### Rendu Markdown
Les reponses du modele sont rendues en Markdown enrichi avec coloration syntaxique des blocs de code.

### Fichiers joints
Cliquez sur le bouton de piece jointe pour telecharger des fichiers. Pour les **modeles de vision** (comme LLaVA), vous pouvez coller ou telecharger des images directement -- le modele les analysera.

### Commandes slash
Tapez `/` dans la zone de saisie pour voir les commandes slash disponibles pour des actions rapides.

### Conversation multi-tours
Chaque conversation conserve l'historique complet des messages. Le modele voit tous les messages precedents comme contexte.

## Analyse approfondie des sessions

Cliquez sur une session dans le panneau gauche pour explorer six onglets d'analyse :

### Onglet Stream
Chaque token avec ses donnees de timing affiche dans une liste deroulante. Au-dessus de la liste de tokens, un **tableau de bord de metriques** affiche :
- **TTFT** (Time to First Token) -- Temps mis par le modele pour commencer a repondre
- **Tokens/sec** -- Vitesse de generation
- **Total tokens** -- Nombre de tokens (prompt + completion)
- **Graphique de latence** -- Chronologie visuelle des delais inter-tokens

### Onglet Raisonnement
Si vous utilisez un modele de raisonnement comme **DeepSeek-R1**, les blocs `<think>` sont automatiquement analyses et affiches etape par etape. Chaque etape de raisonnement est categorisee comme pensee, observation, action, conclusion ou reflexion.

### Onglet Introspection
Visualisations des activations de couches, cartes de chaleur d'attention et architecture du modele.

::: warning Donnees illustratives
Ces visualisations utilisent des donnees synthetiques pour montrer a quoi ressemblerait une veritable introspection. Elles sont clairement etiquetees "Illustratif" dans l'interface. L'introspection reelle necessite un acces aux mecanismes internes du modele qu'Ollama n'expose pas.
:::

### Onglet Outils
Une chronologie de tous les appels d'outils effectues par le modele pendant la conversation, montrant :
- Nom de l'outil et parametres
- Resultat de l'execution
- Duree

### Onglet Agent
Un graphe de flux d'etats montrant comment un prompt de type agent a progresse a travers les etapes de planification, d'appels d'outils et de synthese.

### Onglet Prompt
Une analyse anatomique de votre prompt montrant :
- Les sections identifiees (systeme, utilisateur, contexte, outils, exemples)
- Le nombre de tokens par section
- L'analyse de la structure globale

## Astuces

- **Persistance des sessions** -- Toutes les conversations sont stockees dans IndexedDB et survivent aux actualisations du navigateur.
- **Changement de modele** -- Vous pouvez changer de modele en cours de session. Le nouveau modele verra l'historique complet de la conversation.
- **Performance** -- Le store de tokens utilise `shallowRef` pour garantir les performances avec des milliers de tokens.
