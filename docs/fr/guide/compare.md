# Comparer

La page Comparer vous permet d'executer le meme prompt a travers plusieurs modeles ou configurations simultanement et de comparer les resultats cote a cote.

**Element de la barre laterale :** Comparer
**Route :** `/compare`

![Comparaison cote a cote](/screenshots/compare-sidebyside.png)

## Vue d'ensemble de l'interface

La page comporte une zone de saisie de prompt en haut et une grille configurable de **slots** en dessous. Chaque slot represente une combinaison modele/parametres.

## Configurer les slots

1. Cliquez sur **Ajouter un slot** pour creer un slot de comparaison (jusqu'a 4 slots).
2. Pour chaque slot, configurez :
   - **Modele** -- Selectionnez parmi vos modeles Ollama installes (les modeles d'embedding sont filtres)
   - **Temperature** -- Controle l'aleatoire (0 = deterministe, plus eleve = plus creatif)
   - **Prompt systeme** -- Instructions optionnelles au niveau systeme
   - **Parametres d'echantillonnage** -- Top-k, top-p, seed et autres options Ollama

Chaque slot affiche ses parametres sous forme de pastilles pour une reference rapide.

## Lancer une comparaison

1. Saisissez votre prompt dans la zone de saisie partagee.
2. Cliquez sur **Lancer tout**. Tous les slots diffusent leurs reponses simultanement.
3. Observez les resultats apparaitre cote a cote en temps reel.

## Vues

### Vue grille
La vue par defaut. Tous les slots affichent leurs resultats en streaming dans une disposition en grille. Chaque slot montre :
- La reponse du modele
- Une pastille de parametres indiquant le nom du modele et la temperature

### Vue diff
Passez en vue diff pour voir le **surlignage mot par mot** des differences entre deux sorties. Le texte ajoute est surligne en vert, le texte supprime en rouge.

![Balayage de temperature](/screenshots/compare-tempsweep.png)

## Barre de metriques

Sous la grille, une **barre de metriques** visuelle compare les indicateurs cles de performance entre tous les slots :

| Metrique | Description |
|---|---|
| **TTFT** | Time to first token -- rapidite de debut de reponse de chaque modele |
| **Tokens/sec** | Debit de generation |
| **Total tokens** | Nombre de tokens de completion |

## Presets rapides

Des presets en un clic pour configurer des scenarios de comparaison courants :

- **Balayage de temperature** -- Meme modele a 3 temperatures differentes (0.2, 0.7, 1.2) pour observer l'evolution de la creativite
- **Paire deterministe** -- Meme modele, meme seed, memes parametres -- verifie la reproductibilite

## Astuces

- **Meme modele, parametres differents** est souvent plus instructif que comparer des modeles differents. Essayez de varier la temperature ou les prompts systeme.
- **Les slots persistent** lors de la navigation entre les pages durant la session.
- Utilisez un prompt a **faible nombre de tokens** pour des iterations rapides.
