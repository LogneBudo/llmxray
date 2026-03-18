# Créer des suites de benchmark personnalisées

Créez vos propres suites de benchmark pour tester les modèles sur les sujets qui comptent pour vous — aucune modification de JSON requise. Le constructeur de suites de benchmark vous permet de rédiger des questions manuellement ou d'utiliser un modèle IA local pour les générer automatiquement.

**Élément de la barre latérale :** Constructeur de Benchmark
**Route :** `/benchmark` (onglet Constructeur)

## Saisie manuelle de questions

Pour construire une suite entièrement à la main :

1. Ouvrez la page **Benchmark** et cliquez sur l'onglet **Constructeur**.
2. Entrez un **nom de suite** et une **description** optionnelle.
3. Cliquez sur **Ajouter une question** pour créer une nouvelle entrée.
4. Remplissez le **texte de la question**.
5. Ajoutez les **choix de réponses** (A, B, C, D). Vous pouvez ajouter plus de choix si nécessaire.
6. Sélectionnez la **bonne réponse** dans le menu déroulant.
7. Attribuez éventuellement une **catégorie** pour regrouper les questions par sujet.
8. Répétez les étapes 3 à 7 pour chaque question que vous souhaitez ajouter.
9. Cliquez sur **Enregistrer la suite** lorsque vous avez terminé.

Votre suite personnalisée apparaît désormais aux côtés des suites intégrées et est prête à être exécutée.

## Génération assistée par IA

Laissez un modèle local faire le gros du travail :

1. Dans l'onglet Constructeur, basculez vers la section **Génération IA**.
2. Entrez un **sujet** — par exemple, "Révolution française", "Réseaux TCP/IP" ou "Chimie organique".
3. Choisissez le **nombre de questions** à générer.
4. Sélectionnez un niveau de **difficulté** (facile, moyen, difficile).
5. Choisissez le **modèle** qui générera les questions dans le menu déroulant.
6. Cliquez sur **Générer**. Le modèle diffuse les questions en temps réel.

Une fois la génération terminée :

- **Relisez** chaque question pour vérifier sa précision.
- **Modifiez** le texte, les choix ou les bonnes réponses qui nécessitent des corrections.
- **Désélectionnez** les questions mal formulées ou incorrectes — elles ne seront pas incluses.
- Cliquez sur **Ajouter à la suite** pour intégrer les questions approuvées dans votre suite.

## Modifier les suites

Cliquez sur le bouton **Modifier** sur n'importe quelle suite personnalisée pour la modifier. Vous pouvez :

- Renommer la suite ou mettre à jour sa description
- Ajouter, supprimer ou réorganiser les questions
- Modifier le texte, les choix et les bonnes réponses de chaque question
- Changer les catégories des questions

Les suites intégrées (ARC, GSM8K, etc.) ne peuvent pas être modifiées, mais vous pouvez les dupliquer pour en créer une version modifiée.

## Exporter

Cliquez sur le bouton **Exporter** sur une suite personnalisée pour la télécharger en fichier **JSON**. Le fichier exporté contient :

- Le nom et la description de la suite
- Toutes les questions avec leurs choix, l'index de la bonne réponse et la catégorie

Partagez les fichiers JSON exportés avec d'autres ou contribuez-les à la collection de [Benchmarks Communautaires](/fr/community/benchmarks).

## Astuces

- **Utilisez des sujets spécifiques** — "Chaîne de transport d'électrons mitochondriale" génère de meilleures questions que "biologie". Plus le sujet est ciblé, plus le résultat de l'IA est précis.
- **Combinez manuel et IA** — Générez un lot avec l'IA, puis ajoutez quelques questions rédigées à la main pour couvrir les cas limites.
- **Validez toujours les réponses** — Les bonnes réponses générées par l'IA peuvent être fausses. Vérifiez chacune d'entre elles avant d'enregistrer.
- **Les modèles plus grands produisent de meilleures questions** — Un modèle de 14 milliards de paramètres génère des questions nettement plus précises et nuancées qu'un modèle de 3 milliards. Utilisez le meilleur modèle dont vous disposez.
- **Catégorisez de manière cohérente** — Utilisez des noms de catégories cohérents entre les questions pour que le détail des résultats soit pertinent.
- **Commencez petit** — Générez 5 à 10 questions d'abord pour vérifier la qualité avant de vous lancer dans un lot plus important.
