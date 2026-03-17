# Modèles

La page Modèles est un navigateur pour tous les modèles installés dans votre instance Ollama locale, avec des métadonnées détaillées et la détection des capacités.

**Élément de la barre latérale :** Modèles
**Route :** `/settings?tab=models`

## Vue d'ensemble de l'interface

La page Modèles (accessible via l'onglet Paramètres > Modèles) affiche une carte ou une liste pour chaque modèle installé avec les informations essentielles en un coup d'œil.

## Détails des modèles

Chaque carte de modèle affiche :

| Champ | Description |
|---|---|
| **Nom** | Identifiant du modèle (par ex., `llama3.2:latest`) |
| **Nombre de paramètres** | Nombre de paramètres (par ex., 3B, 7B, 70B) |
| **Quantification** | Niveau de compression (par ex., Q4_0, Q8_0, F16) |
| **Famille** | Famille du modèle (par ex., llama, mistral, gemma) |
| **Format** | Format du modèle (par ex., gguf) |

## Diagrammes d'architecture

Cliquez sur un modèle pour voir un diagramme d'architecture montrant la structure interne du modèle -- nombre de couches, têtes d'attention, dimensions d'embedding, et plus encore. Ces informations sont extraites des métadonnées du modèle fournies par Ollama.

## Détection des capacités

LLMxRay détecte automatiquement ce que chaque modèle peut faire :

| Capacité | Comment elle est détectée | Effet sur l'interface |
|---|---|---|
| **Raisonnement** | Patterns dans le nom du modèle (par ex., `deepseek-r1`) ou capacités Ollama | Active l'onglet raisonnement dans Diagnostics de Chat |
| **Vision** | Capacités Ollama ou famille du modèle | Active les pièces jointes images dans le chat |
| **Embedding** | Capacités Ollama ou famille du modèle | Apparaît dans les sélecteurs de modèles des pages Plongements et Base de Connaissances |
| **Appel d'outils** | Capacités Ollama | Active l'appel d'outils dans le chat |

Les modèles ne prenant en charge que les embeddings sont automatiquement filtrés des sélecteurs de modèles de chat.

## Catalogue de modèles

Le catalogue offre une vue organisée des modèles disponibles avec des tableaux comparatifs, vous aidant à choisir le modèle adapté à votre cas d'utilisation.

## Astuces

- **Compromis de quantification** -- Une quantification basse (Q4) utilise moins de RAM mais réduit légèrement la qualité. Q8 et F16 offrent une meilleure qualité mais nécessitent plus de mémoire.
- **Télécharger d'autres modèles** depuis le terminal : `ollama pull <nom-du-modele>`
- La détection des capacités adapte l'ensemble de l'interface -- vous n'avez rien à configurer manuellement.
