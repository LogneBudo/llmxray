# Mon Systeme

La page Systeme affiche les specifications materielles reelles et le statut d'Ollama en direct -- des donnees provenant de votre OS, pas des estimations du navigateur.

**Element de la barre laterale :** Mon Systeme
**Route :** `/system`

![Interface Mon Systeme](/screenshots/my-system.png)

## Detection du materiel

LLMxRay utilise un plugin Vite personnalise (`vite-plugin-system-info`) qui interroge directement le systeme d'exploitation :

| Plateforme | Methode de detection |
|---|---|
| **Windows** | Commandes PowerShell |
| **Linux** | Systeme de fichiers `/proc` + `lspci` |
| **macOS** | Commandes `sysctl` |

### Informations affichees

- **CPU** -- Nom du modele, nombre de coeurs, architecture
- **RAM** -- Memoire totale installee avec utilisation en direct
- **GPU** -- Nom du modele, VRAM, version du pilote
- **Stockage** -- Capacite du disque et espace disponible

::: tip Premiere configuration
Les informations materielles sont lues au demarrage du serveur de developpement Vite. Si la page Systeme affiche "Redemarrer le serveur de developpement", arretez et relancez `npm run dev`.
:::

## Statut d'Ollama

La section Ollama affiche :

- **Statut de connexion** -- Si Ollama est accessible
- **Modeles en cours d'execution** -- Quels modeles sont actuellement charges en memoire
- **Allocation memoire** -- Quantite de RAM/VRAM utilisee par chaque modele charge
- **Parametres d'inference** -- Parametres par defaut de l'instance en cours d'execution

## Utilisation du stockage

Une visualisation du stockage IndexedDB utilise par LLMxRay :

- Stockage total utilise par l'origine
- Repartition par base de donnees (conversations, benchmarks, vecteurs RAG, donnees d'entrainement)
- Barre de pourcentage visuelle

## Astuces

- **Utilisation elevee de la RAM ?** -- Ollama conserve les modeles en memoire apres la premiere utilisation. Utilisez des modeles quantifies plus legers (Q4) ou reduisez la longueur de contexte dans les Parametres.
- **GPU non detecte ?** -- Assurez-vous que vos pilotes GPU sont a jour. Sous Linux, verifiez que `lspci` est disponible.
- La visualisation du stockage se rafraichit automatiquement lorsque vous accedez a cette page.
