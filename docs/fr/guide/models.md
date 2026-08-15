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

LLMxRay détecte automatiquement ce que chaque modèle peut faire. Les capacités sont lues **en direct depuis Ollama**, de sorte que les modèles récemment publiés fonctionnent sans aucune mise à jour côté LLMxRay. Lorsqu'un modèle ne les signale pas lui-même, LLMxRay se rabat sur des patterns de nom.

Depuis **Ollama 0.32**, la liste des modèles (`/api/tags`) indique directement les capacités, la longueur de contexte et la largeur d'embedding de chaque modèle. LLMxRay s'appuie sur cette source en priorité : les icônes de capacité et le filtrage des modèles sont donc corrects dès le chargement de la liste, sans attendre un appel `/api/show` par modèle. `/api/show` continue de s'exécuter en arrière-plan pour enrichir le cache (paramètres, template, métadonnées d'architecture).

| Capacité | Comment elle est détectée | Effet sur l'interface |
|---|---|---|
| **Raisonnement** | `capabilities` Ollama, sinon patterns de nom (`deepseek-r1`, `qwq`, `gpt-oss`, `magistral`, `nemotron`, `qwen3.x`, `muse-glimmer`, `glm-*`, `kimi-k*`, …) | Active l'onglet raisonnement dans Diagnostics de Chat |
| **Vision** | `capabilities` Ollama, sinon patterns de nom (`llava`, `*-vl`, `moondream`, `gemma3`, Llama-vision, …) | Active les pièces jointes images dans le chat |
| **Embedding** | `capabilities` Ollama, sinon famille ou nom du modèle | Apparaît dans les sélecteurs de modèles des pages Plongements et Base de Connaissances |
| **Appel d'outils** | `capabilities` Ollama | Active l'appel d'outils dans le chat |

Comme les capacités proviennent directement d'Ollama, LLMxRay suit automatiquement les nouvelles familles de modèles. Un ensemble de capacités signalé fait autorité : si le démon liste les capacités d'un modèle *sans* y inclure `thinking`, LLMxRay le croit plutôt que de deviner d'après le nom. Les patterns de nom ne s'appliquent que lorsqu'un modèle ne signale rien du tout.

Les modèles ne prenant en charge que les embeddings sont automatiquement filtrés des sélecteurs de modèles de chat.

## Effort de raisonnement

Pour les modèles capables de raisonner, Diagnostics de Chat expose le paramètre `think` d'Ollama :

| Réglage | Envoyé comme | Signification |
|---|---|---|
| **Off** | *(omis)* | Aucun raisonnement interne |
| **On** | `true` | Raisonnement activé ; le modèle choisit lui-même son effort |
| **Faible / Moyen / Élevé** | `"low"` / `"medium"` / `"high"` | Budget de raisonnement explicite |
| **Max** | `"max"` | Budget de raisonnement maximal |

Les modèles qui n'implémentent pas d'effort gradué traitent simplement tout niveau comme « raisonnement activé ».

## Dimensions des embeddings

La page Plongements peut demander un vecteur de sortie plus étroit via le paramètre `dimensions` d'Ollama (troncature Matryoshka). Laissez le champ vide pour la largeur native du modèle — affichée en placeholder, lue depuis la liste des modèles. Les modèles non entraînés pour la troncature Matryoshka renvoient leur largeur native quoi qu'il arrive.

## Catalogue de modèles

Le catalogue offre une vue organisée des modèles disponibles avec des tableaux comparatifs, vous aidant à choisir le modèle adapté à votre cas d'utilisation.

## Astuces

- **Compromis de quantification** -- Une quantification basse (Q4) utilise moins de RAM mais réduit légèrement la qualité. Q8 et F16 offrent une meilleure qualité mais nécessitent plus de mémoire.
- **Télécharger d'autres modèles** depuis le terminal : `ollama pull <nom-du-modele>`
- La détection des capacités adapte l'ensemble de l'interface -- vous n'avez rien à configurer manuellement.
