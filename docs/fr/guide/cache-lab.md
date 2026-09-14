# Labo de cache

Le **Labo de cache** vous dit pourquoi votre invite manque le cache du modèle, et mesure ce que cela vous coûte à chaque tour.

**Élément de la barre latérale :** Labo de cache (au-dessus de l'Observatoire des Protocoles)
**Route :** `/cache-lab`
**Ajouté dans :** v0.6.0 (septembre 2026)
**Nécessite :** Ollama 0.33.3 ou plus récent

## Quel est l'intérêt ?

Un modèle local ne relit pas toute votre invite à chaque tour. Il conserve un **cache KV** des tokens déjà traités et le réutilise — mais seulement tant que l'invite **correspond encore depuis le tout premier token**.

Ce « depuis le tout premier token » est toute l'histoire. Le cache survit sur un *préfixe* partagé. Dès qu'un token diffère, tout ce qui suit est jeté et doit être réévalué, aussi identique soit-il.

Un seul horodatage en haut d'une invite système vous coûte donc l'invite système entière, à chaque tour. Mesuré sur un démon réel avec la même invite de 324 tokens :

| Position de l'horodatage | Tokens d'invite | Réutilisés du cache | Préremplissage |
|---|---|---|---|
| Au **début** | 324 | 4 | 64,6 ms |
| À la **fin** | 324 | 290 | 18,6 ms |

Même modèle. Mêmes mots. Même nombre de tokens. **3,5× le temps de préremplissage**, uniquement à cause de la position d'une seule valeur.

C'est invisible dans tous les autres outils, et c'est l'un des plus grands leviers sur la rapidité ressentie d'un modèle local.

## Utiliser la page

1. Choisissez un modèle.
2. Collez l'invite système que vous envoyez réellement à chaque tour.
3. Cliquez sur **Mesurer**.

La page fait trois choses.

### Diagnostic

Avant toute mesure, le labo cherche dans votre invite les valeurs qui changent d'un tour à l'autre — horodatages, dates, heures, identifiants de session, longs nombres — et les affiche sous forme d'étiquettes.

Il rend ensuite votre invite en trois couleurs :

- **Vert** — le préfixe que le cache peut garder.
- **Rouge** — la première valeur qui change.
- **Gris** — tout ce qui est perdu, uniquement parce que placé *après* cette valeur.

La zone grise est le point essentiel. C'est généralement la majeure partie de l'invite, et il n'y a généralement rien à lui reprocher.

### Mesure

Le labo envoie **deux dispositions**, chacune **deux fois** :

1. Votre invite telle quelle.
2. La même invite avec les valeurs changeantes déplacées à la fin.

Le second envoi de chaque disposition porte une valeur *différente* — nouvel horodatage, nouvel identifiant — car c'est ce que fait le trafic réel. C'est ce second envoi qui est mesuré. Mesurer le premier ne dirait que la correspondance d'une invite avec elle-même, soit ~100 % pour n'importe quelle disposition, ce qui n'apprend rien.

Vous obtenez un tableau de ce que le démon a réellement conservé : tokens d'invite, réutilisés, évalués, temps de préremplissage et pourcentage de réutilisation.

### Verdict

Enfin, un énoncé clair de ce qu'a rapporté la réécriture : tokens économisés par tour, millisecondes économisées par tour, et le facteur d'accélération.

Chaque chiffre de la page provient de votre propre démon. **Rien n'est estimé.**

## Lire les résultats

**Réutilisation proche de 100 %** — cette disposition se porte bien. Le cache porte presque toute l'invite.

**Réutilisation proche de 0 % avec une valeur au début** — le cas habituel, et celui qui vaut la peine d'être corrigé. Déplacez les valeurs changeantes à la fin de l'invite système, ou dans le message utilisateur, et le corps au-dessus reste en cache.

**« non rapporté »** — votre démon est antérieur à Ollama 0.33.3 et ne rapporte pas la réutilisation du cache. Le labo n'affichera pas 0 % pour autant, car « le démon n'a rien dit » et « rien n'était en cache » sont deux affirmations différentes, et une seule est un problème.

**Une économie négative** — la réécriture a empiré les choses. Cela arrive ; c'est mesuré, alors croyez-en la mesure plutôt que la théorie.

## Que faire

Le remède est presque toujours structurel, et presque toujours gratuit :

- Placez la partie **stable** de votre invite système en premier : rôle, règles, style, exemples.
- Placez ce qui **change à chaque tour** en dernier : l'heure courante, l'identifiant utilisateur, l'identifiant de session, les fragments récupérés.
- Gardez le **contexte récupéré dans un ordre stable**. Réordonner les fragments entre les tours invalide le cache dès le premier fragment déplacé.
- Ne reconstruisez pas l'invite système depuis un gabarit qui resérialise un dictionnaire — l'ordre des clés peut changer à votre insu.

Rien de tout cela ne modifie ce qui est dit au modèle. Cela ne change que l'endroit où c'est dit, ce qui est gratuit.

## Notes et limites

- Le labo limite la génération à un seul token. Il mesure le **préremplissage** ; le décodage ne serait que du bruit ici.
- La réécriture mesurée est mécanique : elle déplace les segments détectés à la fin et ne touche à rien d'autre. C'est une mesure, pas une invite finale recommandée — relisez-la avant de l'adopter.
- La valeur mutée du « tour suivant » préserve la forme, pas le sens. Une date peut en sortir impossible. C'est sans importance : le cache ne retient que le fait que la valeur a changé, pas ce qu'elle signifie.
- Tout s'exécute sur `localhost`. Pas de cloud, pas de clé d'API, pas d'inscription.
