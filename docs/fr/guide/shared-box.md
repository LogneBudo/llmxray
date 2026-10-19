# Machine partagée

La page **Machine partagée** répond à une question : pourquoi Ollama est-il lent en ce moment, et lequel de mes outils en est la cause. Elle liste ce que chaque outil a demandé au démon et ce que cela a coûté aux autres outils, en secondes, avec le réglage à changer.

**Élément de la barre latérale :** Machine partagée (sous Radiographie de l'invite)
**Route :** `/shared-box`
**Ajouté dans :** v0.8.0 (octobre 2026)
**Nécessite :** des tours de plus d'un outil sur la page En direct. Avec un seul outil, il n'y a personne à qui coûter quoi que ce soit.

## À quoi ça sert ?

Ollama sert tout ce qui arrive et ne dit jamais qui l'a ralenti. Trois réglages voyagent dans les requêtes et changent l'état du démon pour tout le monde :

- `keep_alive`. Un outil qui envoie `keep_alive: 0` décharge le modèle après chacune de ses requêtes. L'outil suivant paie le rechargement, souvent plusieurs dizaines de secondes.
- `num_ctx`. Le démon réserve toute la fenêtre de contexte d'avance. Un outil qui demande un contexte de 128 000 tokens pour des invites de 4 000 tokens prend plusieurs gigaoctets pour lui seul, et le démon passe de plusieurs requêtes à la fois à une seule.
- Les changements de modèle. Un outil qui charge un autre modèle décharge celui que les autres utilisaient.

Ollama ne rapporte rien de tout cela. Le port d'observation voit chaque requête, il peut donc tenir le registre.

## La phrase du haut

En haut : combien d'outils, combien de modèles, sur quelle durée, et ce que leurs réglages ont coûté aux autres. Si la réponse est rien, la page le dit.

## Qui a coûté quoi à qui

Une ligne par outil, triée par le temps pris aux autres. Chaque ligne dit en mots simples ce que l'outil a demandé et ce que cela a coûté, puis la correction, sous la forme du réglage exact à changer. Un outil qui n'a rien coûté est listé aussi, en vert, pour voir à quoi ressemble le bon comportement.

Ce qu'un outil se coûte à lui-même est affiché mais jamais compté contre lui.

## Comment les coûts sont attribués

Les règles sont assez simples pour être énoncées, et la page les énonce :

- Un (re)chargement de modèle est imputé à qui a déchargé le modèle. Si la requête précédente au même modèle demandait `keep_alive: 0`, c'est cet outil qui l'a causé. Si un autre modèle a été utilisé entre-temps, c'est l'outil qui a chargé cet autre modèle. Sinon, le modèle est resté inactif plus longtemps que `keep_alive`, et le rechargement n'est la faute de personne.
- Une attente est imputée à la requête que le démon servait encore quand celle-ci est arrivée.

## Combien d'outils à la fois

Ollama sert plusieurs requêtes en même temps seulement tant qu'elles tiennent en mémoire vidéo. Quand un outil réserve un grand contexte, le démon passe sans rien dire à moins de requêtes à la fois. Il ne le dit nulle part ; la page le lit dans le contexte chargé que le démon annonce, comparé au contexte que chaque requête a demandé, et indique le moment où le nombre a baissé et la requête de quel outil l'a provoqué.

## Ce qui s'est passé, dans l'ordre

Chaque chargement et chaque attente, avec l'heure, l'outil qui a payé, et qui l'a causé quand c'était un autre outil.

## Ce que la page ne sait pas

Tout ce qui n'est pas passé par le port d'observation. Un outil qui parle directement à Ollama sur 11434 est invisible ici, ce qui vaut la peine d'être su quand les chiffres ne tombent pas juste. L'attente en file est notre temps total moins celui du démon, c'est donc une estimation.

## Voir aussi

- [En direct](./live.md) enregistre les tours.
- [Carte du GPU](./gpu-map.md) montre ce que les contextes réservés occupent en mémoire vidéo.
