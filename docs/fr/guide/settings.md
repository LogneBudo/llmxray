# Paramètres

La page Paramètres vous permet de configurer votre connexion Ollama, les paramètres par défaut des modèles et les préférences de l'application.

**Élément de la barre latérale :** Paramètres
**Route :** `/settings`

## Connexion

### URL Ollama
Définissez l'URL où Ollama est en cours d'exécution. Par défaut : `http://localhost:11434`.

### Test de connexion
Cliquez sur **Tester la connexion** pour vérifier que LLMxRay peut atteindre Ollama. Le résultat affiche :
- **Connecté** (vert) -- Ollama est accessible et répond
- **Déconnecté** (rouge) -- Vérifiez que `ollama serve` est en cours d'exécution

::: tip Ollama distant
Si Ollama tourne sur une autre machine, saisissez son adresse IP et son port (par ex., `http://192.168.1.100:11434`). Assurez-vous que le proxy Vite est mis à jour dans `vite.config.ts` ou que le CORS est configuré sur l'instance Ollama distante.
:::

## Paramètres par défaut

### Température
Contrôle l'aléatoire dans les sorties du modèle. Affichée avec une **échelle visuelle** et une **infobulle pédagogique** :

| Valeur | Effet |
|---|---|
| **0** | Déterministe -- choisit toujours le token le plus probable |
| **0.7** | Équilibré -- valeur par défaut pour la plupart des cas d'utilisation |
| **1.0+** | Créatif -- sortie plus variée, parfois surprenante |

### Longueur de contexte
Définit le nombre maximal de tokens que le modèle prend en compte. Des valeurs plus élevées permettent des conversations plus longues mais consomment plus de mémoire.

Les deux paramètres incluent des échelles visuelles et des explications en langage courant de ce que fait chaque réglage.

## Catalogue de modèles

L'onglet Modèles (également accessible comme élément de la barre latérale) fournit :
- Un catalogue consultable des modèles installés
- Des badges de détection des capacités (raisonnement, vision, embedding, appel d'outils)
- Détails d'architecture et nombre de paramètres
- Fonctionnalités de comparaison pour évaluer les modèles côté à côté

Consultez le chapitre [Modèles](./models) pour tous les détails.

## Thème

Basculez entre :
- **Mode sombre** -- Par défaut, optimisé pour une utilisation prolongée
- **Mode clair** -- Alternative à haut contraste
- **Système** -- Suit la préférence de votre OS

Le bouton de thème est également disponible dans la barre d'en-tête.

## Google OAuth2

Pour les modèles de l'Atelier d'Outils qui interagissent avec les services Google (Calendar, Gmail), vous pouvez configurer OAuth2 :
1. Saisissez votre **Client ID** depuis la Google Cloud Console
2. Cliquez sur **Connecter** pour autoriser l'accès
3. Une fois connecté, les outils utilisant Google peuvent accéder à votre compte

::: warning Confidentialité
Les tokens OAuth sont stockés localement dans votre navigateur. LLMxRay n'envoie jamais vos identifiants à un serveur externe.
:::

## Astuces

- **Commencez avec les valeurs par défaut** -- La température par défaut (0.7) et la longueur de contexte fonctionnent bien pour la plupart des modèles.
- **Réduisez la longueur de contexte** si vous manquez de RAM/VRAM.
- Le testeur de connexion est le moyen le plus rapide de diagnostiquer les problèmes de type "aucun modèle".
