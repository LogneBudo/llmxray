# Parametres

La page Parametres vous permet de configurer votre connexion Ollama, les parametres par defaut des modeles et les preferences de l'application.

**Element de la barre laterale :** Parametres
**Route :** `/settings`

## Connexion

### URL Ollama
Definissez l'URL ou Ollama est en cours d'execution. Par defaut : `http://localhost:11434`.

### Test de connexion
Cliquez sur **Tester la connexion** pour verifier que LLMxRay peut atteindre Ollama. Le resultat affiche :
- **Connecte** (vert) -- Ollama est accessible et repond
- **Deconnecte** (rouge) -- Verifiez que `ollama serve` est en cours d'execution

::: tip Ollama distant
Si Ollama tourne sur une autre machine, saisissez son adresse IP et son port (par ex., `http://192.168.1.100:11434`). Assurez-vous que le proxy Vite est mis a jour dans `vite.config.ts` ou que le CORS est configure sur l'instance Ollama distante.
:::

## Parametres par defaut

### Temperature
Controle l'aleatoire dans les sorties du modele. Affichee avec une **echelle visuelle** et une **infobulle pedagogique** :

| Valeur | Effet |
|---|---|
| **0** | Deterministe -- choisit toujours le token le plus probable |
| **0.7** | Equilibre -- valeur par defaut pour la plupart des cas d'utilisation |
| **1.0+** | Creatif -- sortie plus variee, parfois surprenante |

### Longueur de contexte
Definit le nombre maximal de tokens que le modele prend en compte. Des valeurs plus elevees permettent des conversations plus longues mais consomment plus de memoire.

Les deux parametres incluent des echelles visuelles et des explications en langage courant de ce que fait chaque reglage.

## Catalogue de modeles

L'onglet Modeles (egalement accessible comme element de la barre laterale) fournit :
- Un catalogue consultable des modeles installes
- Des badges de detection des capacites (raisonnement, vision, embedding, appel d'outils)
- Details d'architecture et nombre de parametres
- Fonctionnalites de comparaison pour evaluer les modeles cote a cote

Consultez le chapitre [Modeles](./models) pour tous les details.

## Theme

Basculez entre :
- **Mode sombre** -- Par defaut, optimise pour une utilisation prolongee
- **Mode clair** -- Alternative a haut contraste
- **Systeme** -- Suit la preference de votre OS

Le bouton de theme est egalement disponible dans la barre d'en-tete.

## Google OAuth2

Pour les modeles de l'Atelier d'Outils qui interagissent avec les services Google (Calendar, Gmail), vous pouvez configurer OAuth2 :
1. Saisissez votre **Client ID** depuis la Google Cloud Console
2. Cliquez sur **Connecter** pour autoriser l'acces
3. Une fois connecte, les outils utilisant Google peuvent acceder a votre compte

::: warning Confidentialite
Les tokens OAuth sont stockes localement dans votre navigateur. LLMxRay n'envoie jamais vos identifiants a un serveur externe.
:::

## Astuces

- **Commencez avec les valeurs par defaut** -- La temperature par defaut (0.7) et la longueur de contexte fonctionnent bien pour la plupart des modeles.
- **Reduisez la longueur de contexte** si vous manquez de RAM/VRAM.
- Le testeur de connexion est le moyen le plus rapide de diagnostiquer les problemes de type "aucun modele".
