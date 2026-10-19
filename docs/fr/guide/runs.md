# Exécutions

**Exécutions** dessine les appels d'un outil au modèle, du début à la fin, en cascade : où le temps est passé, appel par appel, et ce que chaque appel a envoyé et reçu.

**Élément de la barre latérale :** Exécutions (sous En direct)
**Route :** `/runs`
**Ajouté dans :** v0.8.7 (octobre 2026)
**Nécessite :** des appels sur la page En direct. Pointez un outil vers `http://localhost:11435` et laissez-le travailler. Pour voir ce que chaque appel a envoyé et reçu, activez d'abord **Conserver le texte de l'invite** sur la page En direct.

## À quoi ça sert ?

Un agent sur un modèle local est lent, et la question est toujours : où ? Dans le modèle ? À le charger ? À relire une invite déjà lue ? Dans les outils entre deux appels ? En direct montre chaque appel de chaque outil au moment où il passe ; Exécutions prend les appels d'un outil et les pose dans le temps, pour que la partie lente saute aux yeux.

## Ce qu'est une exécution

Une exécution, ce sont les appels d'un outil qui se suivent à moins de deux minutes d'intervalle. Une pause plus longue commence une nouvelle exécution. À l'intérieur, une **étape** commence là où l'outil a entamé une nouvelle conversation : avec le texte conservé, c'est là où l'appel suivant cesse de reprendre la conversation précédente ; sans lui, là où une invite qui valait la peine d'être gardée a trouvé le cache vide alors que le modèle était resté chargé.

## Lire la cascade

Une ligne par appel au modèle, placée dans le temps. La barre de chaque appel est découpée selon ce que rapporte Ollama :

- **Attente** : le temps passé par l'appel avant qu'Ollama ne s'en occupe, plus tout ce qu'Ollama n'a pas comptabilisé.
- **Chargement du modèle** : le modèle n'était pas en mémoire. Souvent le plus gros coût d'une exécution.
- **Lecture de l'invite** : la partie de l'invite qui n'était pas dans le cache. La partie en cache ne coûte presque rien, elle n'apparaît donc pas comme du temps ; sa part est écrite dans la colonne Opération.
- **Écriture de la réponse**.

Entre deux appels, une ligne **outils** est le temps entre la réponse du modèle et l'appel suivant de l'outil, nommée d'après les outils demandés par le modèle. Une ligne **agent** est le même écart quand aucun outil n'a été demandé : le travail propre de l'outil. Le temps des outils est mesuré de l'extérieur ; rien à l'intérieur d'un outil n'est tracé.

Des marques en rouge disent ce qui s'est mal passé sur un appel : **modèle chargé**, **cache vide**, **refusé** (l'invite dépassait le contexte chargé), **erreur**.

## Ce que chaque ligne ouvre

Cliquez sur une ligne et le panneau de droite la montre.

- **Un appel au modèle** : ses chiffres et ses phases, puis **Entrée** (ce qui a été envoyé : la conversation, les schémas d'outils, avec l'endroit où l'invite a cessé de correspondre à l'appel précédent) et **Sortie** (ce qui est revenu : la réponse, la réflexion du modèle quand il la montre, et chaque appel d'outil avec ses arguments). Les deux ont une vue **Lisible** et une vue **Brut**.
- **Une ligne outils** : chaque outil demandé par le modèle, avec ses arguments et le résultat que l'outil a renvoyé dans son appel suivant.

Chaque ligne a sa propre adresse, par exemple `/runs?run=…&row=call-3`. **Copier le lien** la met dans le presse-papiers ; l'ouvrir mène à cette ligne. Depuis un appel, **Ouvrir dans la radiographie de l'invite** montre de quoi son invite était faite, et la radiographie renvoie ici.

## Ce qu'elle ne peut pas voir

- L'intérieur des outils. Une requête de base de données au milieu d'un outil fait partie de la ligne outils, pas d'une ligne à elle.
- Le texte des appels enregistrés pendant que **Conserver le texte de l'invite** était désactivé. Les temps restent exacts.
- La réponse d'un appel enregistré avant que le texte conservé ne garde les réponses, quand cet appel terminait une conversation : elle n'est jamais revenue dans un appel ultérieur.

## Voir aussi

- [En direct](./live.md) enregistre les appels que dessinent les exécutions.
- [Radiographie de l'invite](./xray.md) montre de quoi chaque invite était faite.
