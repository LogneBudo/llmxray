# Radiographie de l'invite

La **Radiographie de l'invite** dessine l'invite de chaque tour à l'échelle et dit, partie par partie, ce qu'elle était et ce qui lui est arrivé : déjà dans la mémoire du modèle, relue, ou coupée par le démon et jamais vue.

**Élément de la barre latérale :** Radiographie de l'invite (sous Exécutions)
**Route :** `/xray`
**Ajouté dans :** v0.8.0 (octobre 2026)
**Nécessite :** des tours sur la page En direct. La radiographie lit ce que le port d'observation a enregistré ; pointez un outil vers `http://localhost:11435` et envoyez quelques messages.

## À quoi ça sert ?

Trois choses tournent mal avec une invite sur un modèle local, et aucune n'est visible depuis l'outil qui l'a envoyée.

- L'invite cesse de correspondre au tour précédent quelque part vers le début, si bien que le modèle relit tout ce qui suit. Un horodatage dans l'invite système fait cela à chaque tour.
- Des schémas d'outils sont activés et prennent dès lors une part fixe de chaque invite.
- La conversation dépasse le contexte : Ollama supprime les messages les plus anciens, garde l'invite système et le nouveau message, et répond comme si de rien n'était. Le modèle peut inventer ce qu'il n'a plus.
- L'invite système et le nouveau message sont trop longs à eux seuls : Ollama garde les premiers tokens et la fin, supprime le début, invite système comprise, et répond quand même.

La radiographie montre les trois sous forme d'image de l'invite elle-même.

## Lire le graphique

Une barre par tour, de gauche à droite en tokens tels que le démon les a comptés. L'invite la plus large de la conversation fixe l'échelle.

**La couleur dit ce qu'est la partie :** invite système, schémas d'outils, tours précédents, nouveau message, dans l'ordre où le démon les lit.

**La luminosité dit ce qui lui est arrivé :**

- **Atténuée** : déjà dans la mémoire du modèle depuis le tour précédent. N'a rien coûté.
- **Vive** : relue à ce tour.
- **Hachurée et barrée** : coupée par le démon. Le modèle ne l'a jamais vue.

Un mince espace sépare les parties, pour qu'une barre se lise d'un coup d'œil comme une structure. La colonne de droite donne le temps de lecture de l'invite et la part qui était en mémoire.

Sous une barre, une note n'apparaît que lorsqu'il s'est passé quelque chose :

- le premier tour de cet outil avec ce modèle ;
- le modèle a été rechargé, donc rien n'était en mémoire et l'invite n'y est pour rien ;
- l'invite a cessé de correspondre au tour précédent, avec la partie concernée et la position en tokens, qui est une estimation à partir des caractères ;
- des outils ont été activés, avec le nombre de tokens de schémas qui figurent désormais dans chaque invite ;
- l'invite a dépassé le contexte, avec le nombre de tokens supprimés et si l'invite système et les schémas d'outils en faisaient partie.

## Cliquer sur une partie

Cliquez sur n'importe quel segment et la requête de ce tour s'ouvre en dessous, dans le même visualiseur de requêtes que la page En direct, en commençant par la partie cliquée. Le visualiseur marque, dans le texte même, l'endroit où l'invite a cessé de correspondre à la précédente.

Le texte de la requête n'est conservé que si **Conserver le texte de l'invite** est activé sur la page En direct. Sans cela, les tailles sont exactes mais le texte n'est pas disponible ; la page le dit.

Depuis une requête, **Voir cet appel dans son exécution** ouvre la page [Exécutions](./runs.md) sur ce même appel.

## Les totaux

Sous le graphique, une phrase : combien de temps la lecture de l'invite a pris sur la conversation, combien une invite stable en aurait évité, et combien de tours ont répondu à une invite qui n'a pas été envoyée en entier.

L'économie est une estimation. Elle suppose que le temps de lecture de l'invite croît avec le nombre de tokens hors du cache, ce qui est vrai en bonne approximation.

## Ce que la page ne sait pas

Le découpage en tokens propre au modèle. Les largeurs sont les comptes de tokens du démon ; quand une barre est découpée en parties, le découpage est proportionnel aux caractères. La partie hachurée est dimensionnée d'après l'écart entre ce qui a été envoyé et ce que le démon a compté. Chaque estimation de la page est indiquée comme telle.

## Voir aussi

- [En direct](./live.md) enregistre les tours que la radiographie dessine.
- [Exécutions](./runs.md) pose les appels d'un outil dans le temps, avec ce que chacun a envoyé et reçu.
- [Labo de cache](./cache-lab.md) mesure, sur votre propre démon, ce que rapporte la correction d'une rupture de cache.
- [Machine partagée](./shared-box.md) montre ce que les réglages de chaque outil coûtent aux autres.
