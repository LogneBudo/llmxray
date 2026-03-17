# Comparer

La page Comparer vous permet d'exécuter le même prompt à travers plusieurs modèles ou configurations simultanément et de comparer les résultats côté à côté.

**Élément de la barre latérale :** Comparer
**Route :** `/compare`

![Comparaison côté à côté](/screenshots/compare-sidebyside.png)

## Vue d'ensemble de l'interface

La page comporte une zone de saisie de prompt en haut et une grille configurable de **slots** en dessous. Chaque slot représente une combinaison modèle/paramètres.

## Configurer les slots

1. Cliquez sur **Ajouter un slot** pour créer un slot de comparaison (jusqu'à 4 slots).
2. Pour chaque slot, configurez :
   - **Modèle** -- Sélectionnez parmi vos modèles Ollama installés (les modèles d'embedding sont filtrés)
   - **Température** -- Contrôle l'aléatoire (0 = déterministe, plus élevé = plus créatif)
   - **Prompt système** -- Instructions optionnelles au niveau système
   - **Paramètres d'échantillonnage** -- Top-k, top-p, seed et autres options Ollama

Chaque slot affiche ses paramètres sous forme de pastilles pour une référence rapide.

## Lancer une comparaison

1. Saisissez votre prompt dans la zone de saisie partagée.
2. Cliquez sur **Lancer tout**. Tous les slots diffusent leurs réponses simultanément.
3. Observez les résultats apparaître côté à côté en temps réel.

## Vues

### Vue grille
La vue par défaut. Tous les slots affichent leurs résultats en streaming dans une disposition en grille. Chaque slot montre :
- La réponse du modèle
- Une pastille de paramètres indiquant le nom du modèle et la température

### Vue diff
Passez en vue diff pour voir le **surlignage mot par mot** des différences entre deux sorties. Le texte ajouté est surligné en vert, le texte supprimé en rouge.

![Balayage de température](/screenshots/compare-tempsweep.png)

## Barre de métriques

Sous la grille, une **barre de métriques** visuelle compare les indicateurs clés de performance entre tous les slots :

| Métrique | Description |
|---|---|
| **TTFT** | Time to first token -- rapidité de début de réponse de chaque modèle |
| **Tokens/sec** | Débit de génération |
| **Total tokens** | Nombre de tokens de completion |

## Presets rapides

Des presets en un clic pour configurer des scénarios de comparaison courants :

- **Balayage de température** -- Même modèle à 3 températures différentes (0.2, 0.7, 1.2) pour observer l'évolution de la créativité
- **Paire déterministe** -- Même modèle, même seed, mêmes paramètres -- vérifie la reproductibilité

## Astuces

- **Même modèle, paramètres différents** est souvent plus instructif que comparer des modèles différents. Essayez de varier la température ou les prompts système.
- **Les slots persistent** lors de la navigation entre les pages durant la session.
- Utilisez un prompt à **faible nombre de tokens** pour des itérations rapides.
