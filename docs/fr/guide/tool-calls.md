# Appels d'outils

La page **Appels d'outils** pose une question à un modèle local : sait-il appeler un outil comme un agent en a besoin ? Treize formes de requêtes que les agents envoient toute la journée, notées sur ce que le démon a renvoyé.

**Élément de la barre latérale :** Appels d'outils (sous Carte du GPU)
**Route :** `/tool-calls`
**Ajouté dans :** v0.8.0 (octobre 2026)
**Nécessite :** un modèle qui sait utiliser des outils. Les modèles qui le déclarent sont listés en premier ; n'importe quel modèle de chat peut être coché.

## À quoi ça sert ?

Les frameworks d'agents vivent ou meurent par les appels d'outils, et les modèles locaux les ratent d'une façon qu'aucun score de benchmark public ne montre : le bon outil avec un argument manquant, un nombre envoyé comme texte, l'appel écrit dans le texte de la réponse où le framework ne le voit jamais, l'appel d'un outil qui n'existe pas, un outil appelé alors qu'il n'en fallait aucun. Chacun casse un agent d'une façon différente.

La série est née d'un échec mesuré : un modèle de 7,5 milliards de paramètres perdait l'argument obligatoire `path` dès que l'argument `content` qu'il écrivait était long. Ce cas figure dans la série sous la forme qui l'a fait échouer.

## Les cas

| Cas | Ce qu'il vérifie |
|---|---|
| Un outil, un argument | Le plancher. |
| Un argument long à côté d'un court | L'argument court obligatoire survit à un long, avec cinq outils proposés. |
| Un argument limité à une liste | La valeur vient de la liste. |
| Un nombre doit être un nombre | Pas un texte entre guillemets. |
| Un argument objet imbriqué | Des dates et heures dans un objet. |
| Deux outils, choisir le bon | Le bon outil parmi trois. |
| Huit outils proposés, choisir le bon | Le bon outil quand les schémas encombrent l'invite. |
| Aucun outil nécessaire | Une salutation reçoit une réponse, pas un appel. |
| Deux appels dans un tour | Des lectures indépendantes regroupées. |
| Répondre après un résultat d'outil | La seconde moitié de la boucle : utiliser le résultat, ne pas rappeler. |
| Un argument avec accents et espaces | Le chemin survit. |
| Laisser de côté un argument facultatif | Pas de valeur inventée. |
| Seulement les outils qui existent | Pas d'appel à un outil qui n'a jamais été proposé. |

Chaque cas tourne à température 0, sans streaming, par `/api/chat`, comme un agent l'enverrait.

## Lire les résultats

Une colonne par modèle avec sa part de cas réussis. Une ligne par cas, avec la raison pour laquelle il compte. Chaque case est une phrase : « l'argument path manque », « a écrit l'appel dans le texte de la réponse », « a appelé search_web alors qu'aucun outil n'était nécessaire ». Cliquez sur une case et la réponse s'ouvre sous la ligne : les appels d'outils émis par le modèle, le texte qu'il a écrit et, quand le démon l'a renvoyé, ce que le modèle a pensé d'abord.

Un appel d'outil correct n'a pas de texte de réponse. L'appel est la réponse. La page le dit là où c'est le cas.

La dernière exécution est conservée dans le navigateur ; la relancer la remplace.

## Ce que la page ne sait pas

Si un appel d'outil aurait fonctionné une fois exécuté. Elle juge l'appel lui-même, face au schéma donné au modèle, comme le fait un framework avant d'exécuter quoi que ce soit.

## Voir aussi

- [En direct](./live.md) montre, tour par tour, les appels d'outils de vos vrais agents.
- [Benchmark](./benchmark.md) pour les séries de questions et réponses.
