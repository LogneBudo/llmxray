# Mon Système

La page Système affiche les spécifications matérielles réelles et le statut d'Ollama en direct -- des données provenant de votre OS, pas des estimations du navigateur.

**Élément de la barre latérale :** Mon Système
**Route :** `/system`

![Interface Mon Système](/screenshots/my-system.png)

## Détection du matériel

LLMxRay utilise un plugin Vite personnalisé (`vite-plugin-system-info`) qui interroge directement le système d'exploitation :

| Plateforme | Méthode de détection |
|---|---|
| **Windows** | Commandes PowerShell |
| **Linux** | Système de fichiers `/proc` + `lspci` |
| **macOS** | Commandes `sysctl` |

### Informations affichées

- **CPU** -- Nom du modèle, nombre de cœurs, architecture
- **RAM** -- Mémoire totale installée avec utilisation en direct
- **GPU** -- Nom du modèle, VRAM, version du pilote
- **Stockage** -- Capacité du disque et espace disponible

::: tip Première configuration
Les informations matérielles sont lues au démarrage du serveur de développement Vite. Si la page Système affiche "Redémarrer le serveur de développement", arrêtez et relancez `npm run dev`.
:::

## Statut d'Ollama

La section Ollama affiche :

- **Statut de connexion** -- Si Ollama est accessible
- **Modèles en cours d'exécution** -- Quels modèles sont actuellement chargés en mémoire
- **Allocation mémoire** -- Quantité de RAM/VRAM utilisée par chaque modèle chargé
- **Paramètres d'inférence** -- Paramètres par défaut de l'instance en cours d'exécution

## Utilisation du stockage

Une visualisation du stockage IndexedDB utilisé par LLMxRay :

- Stockage total utilisé par l'origine
- Répartition par base de données (conversations, benchmarks, vecteurs RAG, données d'entraînement)
- Barre de pourcentage visuelle

## Astuces

- **Utilisation élevée de la RAM ?** -- Ollama conserve les modèles en mémoire après la première utilisation. Utilisez des modèles quantifiés plus légers (Q4) ou réduisez la longueur de contexte dans les Paramètres.
- **GPU non détecté ?** -- Assurez-vous que vos pilotes GPU sont à jour. Sous Linux, vérifiez que `lspci` est disponible.
- La visualisation du stockage se rafraîchit automatiquement lorsque vous accédez à cette page.
