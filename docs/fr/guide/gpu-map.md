# Carte du GPU

La **Carte du GPU** montre ce qui occupe la mémoire vidéo en ce moment, modèle par modèle, ce que le contexte de chacun coûte en plus de ses poids, ce qui est libre, et lesquels de vos autres modèles tiendraient encore.

**Élément de la barre latérale :** Carte du GPU (sous Machine partagée)
**Route :** `/gpu`
**Ajouté dans :** v0.8.0 (octobre 2026)
**Nécessite :** rien de plus. Elle lit toutes les quelques secondes ce qu'Ollama annonce des modèles chargés. La taille de la mémoire de la carte vient du pilote NVIDIA sur Windows et Linux, et du système sur macOS.

## À quoi ça sert ?

« Est-ce que ça tient ? » est la question de chaque discussion sur les modèles locaux, et la réponse est souvent un chiffre de `nvidia-smi` que personne ne sait lire. La carte le dessine.

## La barre

Une barre, de la largeur de la mémoire vidéo de la carte. Un bloc par modèle chargé, coupé en deux : les poids, et, plus pâle, ce que le contexte et les tampons de travail coûtent en plus. Puis l'espace libre. Survolez un bloc pour sa taille.

Sous la barre, chaque modèle chargé avec sa taille, sa quantification, le contexte avec lequel il est chargé, et le moment où le démon le déchargera s'il ne sert plus. Un modèle qui n'a pas tenu montre la part qui tourne depuis la RAM système, ce qui explique sa lenteur.

## Quand le chiffre d'Ollama ne peut pas être vrai

Ollama 0.40.6 sous-estime la mémoire sur son moteur llama.cpp : il peut annoncer 432 Mo pour un gemma4 dont le fichier fait 6,1 Go, alors que la carte en contient 9 ([ollama#19089](https://github.com/ollama/ollama/issues/19089)). Un modèle chargé ne peut pas occuper moins que son propre fichier ; quand Ollama annonce moins de la moitié de ce fichier, la carte ne dessine pas ce chiffre. Elle utilise la taille du fichier à la place, le dit sous le modèle avec ce qu'Ollama a annoncé, et laisse de côté la part du contexte, qui n'est pas connue. Les verdicts ci-dessous sont jugés sur le chiffre corrigé. Les outils MCP `list_local_models` et `estimate_my_prompt` ajoutent la même phrase pour les agents.

## Ce qui tiendrait encore

Chaque modèle téléchargé qui n'est pas chargé, face à l'espace libre, avec l'un de trois verdicts :

- **tient maintenant**, à côté de ce qui est chargé ;
- **tient seulement si ce qui est chargé est d'abord déchargé** ;
- **plus grand que cette carte** : il tournerait en partie depuis la RAM système.

Un modèle a besoin d'environ 15 % de plus que son fichier pour un contexte modeste ; les verdicts en tiennent compte.

## Ce que la page ne sait pas

Comment le démon répartit l'empreinte d'un modèle entre les poids et le contexte. Les poids sont le fichier sur disque ; le reste est le cache du contexte et les tampons de travail, donc cette répartition est une estimation. L'espace libre est la mémoire de la carte moins ce qu'Ollama annonce comme chargé ; les autres programmes qui utilisent le GPU ne sont pas comptés.

## Voir aussi

- [Mon système](./system.md) pour la carte et le pilote.
- [Machine partagée](./shared-box.md) pour savoir quel outil a réservé le contexte.
