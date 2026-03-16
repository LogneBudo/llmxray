# Base de Connaissances

La page Base de Connaissances implemente un pipeline RAG (Retrieval-Augmented Generation) complet et local. Televersez vos documents, generez leurs embeddings et recherchez en langage naturel -- le tout stocke dans votre navigateur.

**Element de la barre laterale :** Base de Connaissances
**Route :** `/rag`

![Interface Base de Connaissances](/screenshots/knowledge-base.png)

## Qu'est-ce que le RAG ?

RAG signifie **Retrieval-Augmented Generation** (Generation Augmentee par la Recuperation). Au lieu de se fier uniquement a ce sur quoi un modele a ete entraine, le RAG permet de lui fournir des extraits pertinents de vos propres documents. Le modele utilise ensuite ces extraits comme contexte pour donner des reponses plus precises et ancrees dans vos donnees.

## Televersement de documents

Cliquez sur **Telecharger** et selectionnez un ou plusieurs fichiers. Formats pris en charge :

| Format | Extension | Analyseur |
|---|---|---|
| PDF | `.pdf` | pdfjs-dist (charge a la demande) |
| Word | `.docx` | mammoth |
| Texte brut | `.txt`, `.md` | Natif |
| CSV | `.csv` | papaparse |

## Le pipeline d'ingestion

Apres le televersement, chaque document passe par trois etapes :

1. **Analyse** -- Extraction du texte brut depuis le format de fichier
2. **Decoupage** -- Fractionnement du texte en segments chevauchants (taille et chevauchement configurables)
3. **Embedding** -- Generation d'un vecteur pour chaque segment a l'aide du modele d'embedding choisi

La progression est affichee par document. Une fois termine, le statut du document passe a "Pret".

## Recherche

1. Saisissez une requete en langage naturel dans la barre de recherche.
2. Les resultats apparaissent classes par **similarite cosinus** -- les segments les plus pertinents semantiquement en premier.
3. Chaque resultat affiche :
   - L'extrait de texte correspondant
   - Le nom du document source
   - Le score de similarite
   - Les metadonnees (numero de page, section, positions dans le texte)

## Gestion des documents

- **Activer/Desactiver** -- Basculez les documents pour la recherche. Les documents desactives ne sont pas inclus dans les resultats.
- **Supprimer** -- Supprime un document et tous ses segments d'IndexedDB.
- **Indicateurs de statut** -- Affiche l'etape de traitement (analyse, decoupage, embedding, pret, erreur).

## Stockage

Tout est stocke dans **IndexedDB**, la base de donnees integree de votre navigateur :
- Zero cout -- aucun service externe necessaire
- Zero configuration -- fonctionne immediatement
- Les donnees restent sur votre machine
- Survit aux actualisations du navigateur (mais pas a l'effacement des donnees du navigateur)

## Integration avec le Chat

Lorsque vous avez des documents dans la Base de Connaissances, les segments pertinents peuvent etre automatiquement inclus comme contexte dans vos conversations de chat, ancrant les reponses du modele dans vos donnees.

## Astuces

- **Des segments plus petits** (200-400 tokens) tendent a produire des resultats de recherche plus precis.
- **Le modele d'embedding compte** -- `nomic-embed-text` fonctionne generalement bien pour les textes en anglais.
- Les PDF volumineux prennent du temps a traiter. L'interface affiche la progression pour que vous puissiez suivre le pipeline.
- Vous pouvez telecharger plusieurs documents et effectuer des recherches sur l'ensemble simultanement.
