# Labo de décision

Le **Labo de décision** pose à un modèle de décision des questions typées sur une situation et montre la probabilité derrière chaque réponse.

**Élément de la barre latérale :** Labo de décision (sous le Labo de cache)
**Route :** `/decision-lab`
**Ajouté dans :** v0.7.0 (octobre 2026)
**Nécessite :** Ollama 0.35.1 ou plus récent, et un modèle de décision (`nimble`, `tev1`, `clef-flash` ou `clef`)

## À quoi ça sert ?

Un modèle de décision n’écrit pas de texte. Vous lui donnez un **état** (un ticket, un message, une ligne de log, un document) et une ou plusieurs **questions**, et il renvoie :

| Type de question | Ce qui revient |
|---|---|
| **Choix** | Le candidat retenu, une probabilité pour *chaque* candidat, et une confiance |
| **Probabilité oui / non** | Une seule probabilité que la condition soit vraie |
| **Score sur une échelle** | La position attendue sur votre échelle ordonnée, une probabilité par échelon, et une confiance |

Les probabilités sont la distribution de sortie du modèle lui-même sur les candidats, pas un nombre extrait d’une phrase. C’est ce qui les rend intéressantes : un modèle de chat à qui l’on demande « est-ce urgent ? » répond *oui* ; un modèle de décision répond *0,99*, et pour un ticket limite il répond *0,55*, et la différence se voit.

Ollama sert ces modèles sur `/v1/systemone` (ajouté en 0.35.1). Ils déclarent `decision` comme **seule** capacité, donc LLMxRay les tient à l’écart de tous les sélecteurs de chat et de plongements et les liste ici. Leur envoyer une requête de chat n’échoue pas proprement : ils répondent par des fragments de leur propre schéma, ce qui est précisément la raison d’être du filtre.

## Utiliser la page

1. Choisissez un modèle de décision. S’il n’y en a aucun, téléchargez-en un depuis la page Modèles ; `tev1:0.8b` est le plus petit.
2. Décrivez l’**état**. Toutes les questions portent sur ce seul texte.
3. Éditez les **questions**. Chacune a une clé de réponse (sous laquelle le résultat revient), un type, une consigne, et pour les types choix et score une liste de candidats :
   - **Choix** : un par ligne sous la forme `nom : description`.
   - **Score** : un par ligne, du plus bas au plus haut. L’ordre *est* l’échelle.
   - Ollama accepte de 2 à 26 candidats et de 1 à 64 questions par requête ; la page vous le dit avant l’envoi quand une question sort de ces bornes.
4. **Décider**. Les réponses apparaissent à droite sous forme de barres, le candidat retenu mis en évidence, avec les nombres de tokens en entrée et en sortie et le temps d’aller-retour.

La page s’ouvre sur un exemple complet : un ticket de support interrogé de trois façons, une question de chaque type. C’est la requête qui a été exécutée en direct lors de la vérification d’Ollama 0.40.3.

## Lire les réponses

- **Choix** : les barres sont triées par probabilité. Celle mise en évidence est le choix du modèle. La confiance est le chiffre du modèle lui-même, rapporté à côté.
- **Oui / non** : affiché comme une barre *oui* et une barre *non* dont la somme fait 1.
- **Score** : les barres restent dans l’ordre de l’échelle, parce que la position est le sens. L’échelon mis en évidence est le plus probable. Le nombre *score* est la position attendue (pondérée par les probabilités), il peut donc tomber entre deux échelons : 2,37 sur une échelle à quatre échelons veut dire « majeur, penchant vers panne totale ».

## Ce que la page ne fait pas

Elle ne diffuse pas en flux (l’endpoint ne le fait jamais), ne conserve pas d’historique, et n’envoie pas encore d’images, bien que `clef` et `clef-flash` en acceptent. C’est un observatoire de ce qu’un modèle de décision renvoie réellement, rien de plus.
