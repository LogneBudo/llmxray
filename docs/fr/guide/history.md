# Historique IA Local

LLMxRay enregistre automatiquement chaque expérience que vous effectuez — benchmarks, comparaisons, conversations, entraînements. Votre archive de recherche, interrogeable et exportable.

## Ce qui est enregistré

Chaque interaction avec un modèle produit une entrée d'historique. Le tableau ci-dessous montre les données capturées pour chaque type.

| Type d'entrée | Données capturées |
|---|---|
| Benchmark | Nom de la suite, modèle, questions, réponses, scores de précision, résultats par catégorie, durée |
| Comparaison | Prompt, modèles comparés, sorties, Token Tax, latence, scores de confiance |
| Comparaison de langues | Prompt, langues testées, modèle, sorties par langue, métriques de qualité |
| Session de chat | Conversation complète (tous les tours), modèle, horodatages, nombre de tokens, latence par token |
| Entraînement | Nom du jeu de données, modèle, paramètres d'entraînement, courbe de perte, nombre d'époques, durée |
| Plongement | Texte d'entrée, modèle, dimensions du vecteur, scores de similarité |
| Atelier d'outils | Définitions d'outils, entrées de test, réponses du modèle, résultats d'exécution |

Les entrées sont horodatées et associées automatiquement au nom du modèle.

## Trouver vos données

La page Historique fournit des filtres pour affiner votre archive.

- **Type** — Afficher uniquement les benchmarks, conversations, comparaisons ou tout autre type d'entrée.
- **Modèle** — Filtrer par modèle utilisé (par ex. `llama3`, `deepseek-r1`, `phi4`).
- **Langue** — Pour les comparaisons de langues, filtrer par les langues testées.
- **Plage de dates** — Choisir une date de début et de fin pour cibler une période spécifique.
- **Tags** — Tags personnalisés que vous avez appliqués aux entrées pour votre propre organisation.

Les filtres se combinent avec une logique ET — sélectionner un modèle et un type affiche uniquement les entrées correspondant aux deux critères.

## Analyse des tendances

La page Historique inclut un graphique d'activité qui visualise vos expérimentations au fil du temps.

- **Activité dans le temps** — Une chronologie montrant combien d'expériences vous avez effectuées par jour ou par semaine. Repérez les pauses ou les pics dans votre recherche.
- **Modèles utilisés** — Une répartition des modèles les plus testés. Utile pour voir si vous dépendez trop d'un seul modèle ou si vous explorez largement.
- **Tendances à surveiller :**
  - Améliorations de la précision au fil des exécutions successives de benchmarks sur le même modèle.
  - Changements de latence après des mises à jour de modèle ou des ajustements de paramètres.
  - Quel modèle gagne systématiquement les comparaisons pour votre cas d'usage.
  - Courbes de perte d'entraînement qui s'aplatissent — signe que davantage d'époques n'aideront pas.

## Exportation

Les entrées d'historique peuvent être exportées en deux formats.

- **JSON** — Exporte toutes les entrées avec les données structurées complètes. Inclut chaque champ : horodatages, noms de modèles, prompts, sorties, scores, paramètres et tags. Utilisez pour le scripting, la sauvegarde ou la réimportation.
- **CSV** — Exporte la vue filtrée actuelle sous forme de données tabulaires. Les colonnes incluent le type d'entrée, le modèle, la date, les métriques résumées (précision, latence, nombre de tokens) et les tags. Ouvrez dans Excel, Google Sheets ou pandas.

Pour exporter :

1. Appliquez des filtres si vous voulez un sous-ensemble (ou laissez sans filtre pour tout exporter).
2. Cliquez sur le bouton **Exporter**.
3. Choisissez JSON ou CSV — le fichier se télécharge immédiatement.

## Gestion du stockage

L'historique est stocké dans IndexedDB dans votre navigateur. Cela ne coûte rien et ne nécessite aucun serveur.

- **Paramètres de rétention** — Configurez la durée de conservation des entrées. Les options vont de 30 jours à illimité. Les entrées plus anciennes que la fenêtre de rétention sont supprimées automatiquement.
- **Effacer l'historique** — Utilisez l'action **Effacer l'historique** pour supprimer toutes les entrées, ou supprimez des entrées individuelles depuis la liste. Cette action est irréversible.
- **Estimations de taille** — Une entrée de benchmark typique fait 2-5 Ko. Une session de chat complète fait 5-50 Ko selon la longueur. Des milliers d'entrées tiennent confortablement dans les limites de stockage du navigateur (typiquement 50 Mo+).

## Confidentialité

> Toutes les données d'historique sont stockées localement dans l'IndexedDB de votre navigateur. Rien n'est envoyé vers un service cloud. Les entrées d'historique sont conservées dans leur propre magasin de données, séparé des résultats de benchmarks, des sessions de chat et des données d'entraînement d'origine. Effacer l'historique n'affecte pas vos autres magasins de données.
