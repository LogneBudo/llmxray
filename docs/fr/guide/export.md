# Exporter vos donnees

LLMxRay genere des donnees riches -- benchmarks, sessions, conversations, definitions d'outils et rapports systeme. Chaque donnee que vous creez est exportable. Vos donnees restent locales jusqu'a ce que vous choisissiez de les partager.

## Ce qui peut etre exporte

| Page | Formats | Contenu |
|---|---|---|
| Comparer | JSON, Markdown, Partage | Prompts, sorties, metriques, Token Tax |
| Benchmark | JSON, CSV, Markdown | Questions, reponses, precision, resultats par categorie |
| Session | JSON, Markdown, Token CSV | Prompt, reponse, metriques, latences par token |
| Chat | JSON, Markdown, Texte | Conversation complete avec horodatages |
| Atelier d'Outils | JSON | Definitions d'outils avec implementations |
| Systeme | JSON, Markdown | Materiel, statut Ollama, modeles, stockage |

## Formats d'export

- **JSON** -- Donnees structurees completes. Pour scripts, analyses, reimportation.
- **CSV** -- Donnees tabulaires plates. Ouvrir dans Excel, Google Sheets ou pandas.
- **Markdown** -- Rapports formates. A coller dans des documents, blogs ou GitHub.
- **JSONL** -- JSON delimite par lignes pour l'export de donnees d'entrainement.
- **Texte** -- Transcriptions de conversations en texte brut.

## Comment exporter

1. Cherchez le bouton **Exporter** (icone de telechargement) sur toute page de resultats.
2. Cliquez pour voir les formats disponibles.
3. Selectionnez un format -- le fichier se telecharge immediatement.
4. Pour partager : choisissez **"Partager sur GitHub Discussions"** pour publier vos resultats.

## Partage sur GitHub Discussions

Disponible sur les pages Comparer et Benchmark. La fonction de partage pre-remplit un post GitHub Discussion avec votre rapport formate. Vous ajoutez vos propres commentaires et relisez le tout avant de publier. Rien n'est envoye sans votre action explicite.

1. Cliquez sur **"Partager sur GitHub Discussions"** dans le menu Exporter.
2. Un dialogue s'ouvre avec un apercu du rapport markdown.
3. Ajoutez vos commentaires -- decrivez ce que vous avez decouvert.
4. Cliquez sur **"Ouvrir GitHub Discussions"** pour etre redirige vers GitHub avec le rapport pre-rempli.
5. Vous relisez et soumettez le post vous-meme -- rien n'est publie sans votre consentement.

## Confidentialite des donnees

> Vos donnees ne quittent jamais votre machine sauf si vous choisissez de les partager. Tous les exports se telechargent sur votre systeme de fichiers local. La fonction Partager ouvre une URL GitHub -- vous controlez ce qui est publie.
