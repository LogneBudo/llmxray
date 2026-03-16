# Modeles

La page Modeles est un navigateur pour tous les modeles installes dans votre instance Ollama locale, avec des metadonnees detaillees et la detection des capacites.

**Element de la barre laterale :** Modeles
**Route :** `/settings?tab=models`

## Vue d'ensemble de l'interface

La page Modeles (accessible via l'onglet Parametres > Modeles) affiche une carte ou une liste pour chaque modele installe avec les informations essentielles en un coup d'oeil.

## Details des modeles

Chaque carte de modele affiche :

| Champ | Description |
|---|---|
| **Nom** | Identifiant du modele (par ex., `llama3.2:latest`) |
| **Nombre de parametres** | Nombre de parametres (par ex., 3B, 7B, 70B) |
| **Quantification** | Niveau de compression (par ex., Q4_0, Q8_0, F16) |
| **Famille** | Famille du modele (par ex., llama, mistral, gemma) |
| **Format** | Format du modele (par ex., gguf) |

## Diagrammes d'architecture

Cliquez sur un modele pour voir un diagramme d'architecture montrant la structure interne du modele -- nombre de couches, tetes d'attention, dimensions d'embedding, et plus encore. Ces informations sont extraites des metadonnees du modele fournies par Ollama.

## Detection des capacites

LLMxRay detecte automatiquement ce que chaque modele peut faire :

| Capacite | Comment elle est detectee | Effet sur l'interface |
|---|---|---|
| **Raisonnement** | Patterns dans le nom du modele (par ex., `deepseek-r1`) ou capacites Ollama | Active l'onglet raisonnement dans Diagnostics de Chat |
| **Vision** | Capacites Ollama ou famille du modele | Active les pieces jointes images dans le chat |
| **Embedding** | Capacites Ollama ou famille du modele | Apparait dans les selecteurs de modeles des pages Plongements et Base de Connaissances |
| **Appel d'outils** | Capacites Ollama | Active l'appel d'outils dans le chat |

Les modeles ne prenant en charge que les embeddings sont automatiquement filtres des selecteurs de modeles de chat.

## Catalogue de modeles

Le catalogue offre une vue organisee des modeles disponibles avec des tableaux comparatifs, vous aidant a choisir le modele adapte a votre cas d'utilisation.

## Astuces

- **Compromis de quantification** -- Une quantification basse (Q4) utilise moins de RAM mais reduit legerement la qualite. Q8 et F16 offrent une meilleure qualite mais necessitent plus de memoire.
- **Telecharger d'autres modeles** depuis le terminal : `ollama pull <nom-du-modele>`
- La detection des capacites adapte l'ensemble de l'interface -- vous n'avez rien a configurer manuellement.
